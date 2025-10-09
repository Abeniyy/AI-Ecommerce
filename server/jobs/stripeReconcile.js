const Stripe = require('stripe');
const { query } = require('../db');
const { finalizePaidOrder } = require('../routes/payments');

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
const ENABLED = (process.env.STRIPE_RECONCILE_ENABLED || 'true').toLowerCase() !== 'false';
const INTERVAL_MS = Number(process.env.STRIPE_RECONCILE_INTERVAL_MS || 3 * 60 * 1000); // 3 min
const WINDOW_MIN = Number(process.env.STRIPE_RECONCILE_WINDOW_MIN || 48 * 60); // look back 48h

let stripe = null;
if (STRIPE_KEY) {
  stripe = new Stripe(STRIPE_KEY);
}

async function reconcileOnce() {
  if (!ENABLED || !stripe) return;

  // Pull a small batch of pending orders to check
  const { rows } = await query(
    `SELECT id, user_id, source_cart_id, stripe_session_id
       FROM public.orders
      WHERE status = 'pending'
        AND stripe_session_id IS NOT NULL
        AND created_at >= NOW() - ($1::int || ' minutes')::interval
        AND (last_reconciled_at IS NULL OR last_reconciled_at < NOW() - interval '2 minutes')
      ORDER BY id
      LIMIT 25`,
    [WINDOW_MIN],
    { readOnly: true }
  );

  for (const o of rows) {
    try {
      const session = await stripe.checkout.sessions.retrieve(o.stripe_session_id, {
        expand: ['payment_intent'],
      });

      const pi = session.payment_intent;
      const paidBySession =
        session.payment_status === 'paid' || session.status === 'complete';
      const paidByPI = pi && (pi.status === 'succeeded' || pi.status === 'requires_capture' /* if you use capture */);

      if (paidBySession || paidByPI) {
        await finalizePaidOrder(o.id, o.user_id, o.source_cart_id);
        await query(
          `UPDATE public.orders
              SET stripe_payment_status = 'paid',
                  last_reconciled_at = NOW()
            WHERE id = $1`,
          [o.id]
        );
        continue;
      }

      // Not paid yet – record status & move on
      await query(
        `UPDATE public.orders
            SET stripe_payment_status = COALESCE($2, stripe_payment_status),
                last_reconciled_at = NOW()
          WHERE id = $1`,
        [o.id, session.payment_status || (pi ? pi.status : null)]
      );
    } catch (e) {
      // Record we attempted; avoid hot-looping on a bad session id, but don't crash
      await query(
        `UPDATE public.orders
            SET last_reconciled_at = NOW()
          WHERE id = $1`,
        [o.id]
      );
      console.warn(`reconcile: order ${o.id} failed:`, e.message);
    }
  }
}

function startStripeReconciler() {
  if (!ENABLED) {
    console.log('Stripe reconciler disabled by env STRIPE_RECONCILE_ENABLED=false');
    return;
  }
  if (!stripe) {
    console.log('Stripe reconciler disabled: STRIPE_SECRET_KEY missing');
    return;
  }
  // Stagger first run to avoid startup thundering herd
  setTimeout(() => {
    reconcileOnce().catch(() => {});
    setInterval(() => reconcileOnce().catch(() => {}), INTERVAL_MS);
  }, 30 * 1000);
}

module.exports = { startStripeReconciler };
