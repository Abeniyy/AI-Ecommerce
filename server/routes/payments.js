const express = require('express');
const Stripe = require('stripe');
const { query, transaction } = require('../db');
const { requireAuth } = require('../middleware/auth');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const router = express.Router();

/* -------------------------- Helpers -------------------------- */
/** Use a plain function param `q` for querying (defaults to pooled `query`). */
async function getActiveCart(userId, q = query) {
  const r = await q(
    `SELECT id FROM public.carts WHERE user_id = $1 AND status = 'active'`,
    [userId]
  );
  if (r.rowCount === 0) throw new Error('No active cart');
  return r.rows[0].id;
}

async function getCartItems(cartId, q = query) {
  const r = await q(
    `SELECT ci.product_id, ci.quantity, ci.unit_price::numeric(12,2) AS unit_price,
            p.name, p.stock
       FROM public.cart_items ci
       JOIN public.products p ON p.id = ci.product_id
      WHERE ci.cart_id = $1
      ORDER BY ci.product_id`,
    [cartId]
  );
  if (r.rowCount === 0) throw new Error('Cart is empty');
  return r.rows;
}

/**
 * Create a PENDING order snapshot from the current cart.
 * - Validates stock (pre-flight).
 * - Copies cart items → order_items.
 */
async function createPendingOrderFromCart(userId) {
  return transaction(async (cx) => {
    const q = cx.query.bind(cx);

    const cartId = await getActiveCart(userId, q);
    const items = await getCartItems(cartId, q);

    // Pre-flight stock check
    for (const it of items) {
      if (it.quantity > it.stock) {
        throw new Error(`Insufficient stock for product ${it.product_id}`);
      }
    }

    // Compute total
    const tot = await q(
      `SELECT COALESCE(SUM(quantity * unit_price), 0)::numeric(12,2) AS total
         FROM public.cart_items
        WHERE cart_id = $1`,
      [cartId]
    );
    const total = tot.rows[0].total;

    // Insert order (pending)
    const o = await q(
      `INSERT INTO public.orders (user_id, status, currency, total_amount, source_cart_id)
       VALUES ($1, 'pending', 'USD', $2, $3)
       RETURNING id`,
      [userId, total, cartId]
    );
    const orderId = o.rows[0].id;

    // Snapshot -> order_items
    await q(
      `INSERT INTO public.order_items (order_id, product_id, quantity, unit_price)
       SELECT $1, ci.product_id, ci.quantity, ci.unit_price
         FROM public.cart_items ci
        WHERE ci.cart_id = $2`,
      [orderId, cartId]
    );

    return { orderId, cartId, total, items };
  });
}

/**
 * Finalize a paid order:
 * - Mark order paid
 * - Decrement product stock
 * - Clear cart items & mark cart converted
 * - (Optional) log purchase events into user_events
 */
async function finalizePaidOrder(orderId, userId, cartId) {
  return transaction(async (cx) => {
    const q = cx.query.bind(cx);

    // Lock order
    const cur = await q(
      `SELECT status FROM public.orders WHERE id = $1 AND user_id = $2 FOR UPDATE`,
      [orderId, userId]
    );
    if (cur.rowCount === 0) throw new Error('Order not found');
    if (cur.rows[0].status === 'paid') return; // idempotent

    // Fetch order items
    const items = await q(
      `SELECT product_id, quantity, unit_price FROM public.order_items WHERE order_id = $1`,
      [orderId]
    );

    // Decrement stock per item
    for (const it of items.rows) {
      const upd = await q(
        `UPDATE public.products
            SET stock = stock - $1
          WHERE id = $2 AND stock >= $1
        RETURNING id`,
        [it.quantity, it.product_id]
      );
      if (upd.rowCount === 0) {
        throw new Error(`Insufficient stock at finalize for product ${it.product_id}`);
      }
    }

    // Mark order paid
    await q(
      `UPDATE public.orders
          SET status = 'paid', updated_at = NOW()
        WHERE id = $1`,
      [orderId]
    );

    // Clear/convert cart
    await q(`DELETE FROM public.cart_items WHERE cart_id = $1`, [cartId]);
    await q(
      `UPDATE public.carts SET status = 'converted', updated_at = NOW() WHERE id = $1`,
      [cartId]
    );

    // (Optional) Log purchase events for recommender
    await Promise.all(
      items.rows.map((it) =>
        q(
          `INSERT INTO public.user_events (user_id, session_id, product_id, event, weight)
           VALUES ($1, NULL, $2, 'purchase', 10)`,
          [userId, it.product_id]
        )
      )
    );

    // Non-blocking nudge to refresh MV (safe to ignore)
    setTimeout(() => {
      query('REFRESH MATERIALIZED VIEW CONCURRENTLY public.product_popularity_30d')
        .catch(() => {});
    }, 0);
  });
}

/* -------------------------- Routes -------------------------- */

/**
 * POST /api/payments/checkout-session
 * - Requires auth
 * - Creates a PENDING order from the cart
 * - Creates Stripe Checkout Session (with order/cart metadata)
 * - Returns { url, order_id }
 */
router.post('/checkout-session', requireAuth, async (req, res) => {
  try {
    const { orderId, cartId, items } = await createPendingOrderFromCart(req.user.id);

    const line_items = items.map((it) => ({
      quantity: it.quantity,
      price_data: {
        currency: 'usd',
        product_data: { name: it.name },
        unit_amount: Math.round(Number(it.unit_price) * 100),
      },
    }));

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items,
      customer_email: req.user.email,
      metadata: {
        user_id: req.user.id,
        cart_id: String(cartId),
        order_id: String(orderId),
      },
      success_url: `${process.env.PUBLIC_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.PUBLIC_URL}/cancel`,
    });

    // ✅ Persist Stripe references for reconciliation
    await query(
      `UPDATE public.orders
          SET stripe_session_id = $1,
              stripe_payment_intent_id = $2,
              stripe_payment_status = $3
        WHERE id = $4`,
      [session.id, session.payment_intent || null, session.payment_status || null, orderId]
    );

    res.json({ url: session.url, order_id: orderId });
  } catch (e) {
    console.error('checkout-session error:', e);
    res.status(400).json({ error: e.message || 'Failed to create checkout session' });
  }
});

/**
 * Stripe webhook handler (exported function).
 * This must be mounted with express.raw({ type: 'application/json' }) BEFORE express.json().
 */
async function stripeWebhook(req, res) {
  const sig = req.headers['stripe-signature'];
  try {
    const event = stripe.webhooks.constructEvent(
      req.body, sig, process.env.STRIPE_WEBHOOK_SECRET
    );

    // Idempotency: skip if already processed
    const seen = await query(`SELECT 1 FROM public.payment_events WHERE id = $1`, [event.id]);
    if (seen.rowCount > 0) {
      return res.json({ received: true, duplicate: true });
    }

    if (event.type === 'checkout.session.completed') {
      const s = event.data.object;
      const userId = s.metadata?.user_id;
      const cartId = s.metadata?.cart_id;
      const orderId = s.metadata?.order_id;

      // Update payment status snapshot too (not required, but nice to have)
      try {
        await query(
          `UPDATE public.orders
              SET stripe_payment_status = $2
            WHERE id = $1`,
          [Number(orderId), s.payment_status || null]
        );
      } catch (_) {}

      if (userId && cartId && orderId) {
        await finalizePaidOrder(Number(orderId), userId, Number(cartId));
      } else {
        console.warn('Webhook missing metadata (user_id/cart_id/order_id)');
      }
    }

    await query(`INSERT INTO public.payment_events (id, type) VALUES ($1, $2)`, [
      event.id,
      event.type,
    ]);

    res.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
}

module.exports = { router, stripeWebhook, finalizePaidOrder };
