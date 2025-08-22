// server/db.js (upgraded)
const { Pool, types } = require('pg');
require('dotenv').config();

/* ------------------------ Type parsers ------------------------ */
// NUMERIC/DECIMAL as number (OID 1700)
types.setTypeParser(1700, (v) => (v == null ? null : parseFloat(v)));
// TIMESTAMP WITHOUT TIME ZONE (OID 1114) -> JS Date (local)
types.setTypeParser(1114, (v) => (v == null ? null : new Date(v)));
// TIMESTAMP WITH TIME ZONE (OID 1184) -> JS Date (UTC aware)
types.setTypeParser(1184, (v) => (v == null ? null : new Date(v)));
// Optional: BIGINT (OID 20). If you expect > 2^53-1, prefer BigInt.
// Toggle via PG_INT8_MODE=bigint|number|string (default string)
const INT8_MODE = (process.env.PG_INT8_MODE || 'string').toLowerCase();
if (INT8_MODE === 'number') {
  types.setTypeParser(20, (v) => (v == null ? null : Number(v)));
} else if (INT8_MODE === 'bigint') {
  types.setTypeParser(20, (v) => (v == null ? null : BigInt(v)));
}

/* ------------------------ Config helpers ------------------------ */
const num = (v, d) => (v === undefined || v === '' ? d : Number(v));
const bool = (v, d=false) => {
  if (v === undefined) return d;
  const s = String(v).toLowerCase();
  return s === '1' || s === 'true' || s === 'yes';
};

const SLOW_MS = num(process.env.PG_SLOW_MS, 200);
const APP_NAME = process.env.PG_APP_NAME || 'ai-ecommerce-server';
const TZ = process.env.PG_TIMEZONE || 'UTC';

function buildConfig(prefix = '') {
  // Support DATABASE_URL and READ_DATABASE_URL
  const url = process.env[`${prefix}DATABASE_URL`];
  const SSL_MODE = process.env[`${prefix}PG_SSL_MODE`] || process.env.PG_SSL_MODE || 'disable';
  const ssl =
    SSL_MODE !== 'disable'
      ? { rejectUnauthorized: SSL_MODE === 'verify-full' }
      : false;

  return url
    ? {
        connectionString: url,
        ssl,
        max: num(process.env[`${prefix}PG_MAX_CONNECTIONS`], num(process.env.PG_MAX_CONNECTIONS, 10)),
        connectionTimeoutMillis: num(process.env[`${prefix}PG_CONNECTION_TIMEOUT`], num(process.env.PG_CONNECTION_TIMEOUT, 5000)),
        idleTimeoutMillis: num(process.env[`${prefix}PG_IDLE_TIMEOUT`], num(process.env.PG_IDLE_TIMEOUT, 30000)),
      }
    : {
        user: process.env[`${prefix}PG_USER`] || process.env.PG_USER,
        host: process.env[`${prefix}PG_HOST`] || process.env.PG_HOST,
        database: process.env[`${prefix}PG_DATABASE`] || process.env.PG_DATABASE,
        password: process.env[`${prefix}PG_PASSWORD`] || process.env.PG_PASSWORD,
        port: num(process.env[`${prefix}PG_PORT`], num(process.env.PG_PORT, 5432)),
        max: num(process.env[`${prefix}PG_MAX_CONNECTIONS`], num(process.env.PG_MAX_CONNECTIONS, 10)),
        connectionTimeoutMillis: num(process.env[`${prefix}PG_CONNECTION_TIMEOUT`], num(process.env.PG_CONNECTION_TIMEOUT, 5000)),
        idleTimeoutMillis: num(process.env[`${prefix}PG_IDLE_TIMEOUT`], num(process.env.PG_IDLE_TIMEOUT, 30000)),
        ssl,
      };
}

/* ------------------------ Pools (write + optional read) ------------------------ */
const required = ['PG_USER', 'PG_HOST', 'PG_DATABASE', 'PG_PASSWORD'];
if (!process.env.DATABASE_URL) {
  for (const k of required) {
    if (!process.env[k]) throw new Error(`Missing required env: ${k}`);
  }
}

const writePool = new Pool(buildConfig(''));               // primary / writes
const readPool  = new Pool(buildConfig('READ_'));          // read replica (optional). If no READ_* or READ_DATABASE_URL, this will still be valid but unused.

function onConnectSetup(pool, label) {
  pool.on('connect', async (client) => {
    if (process.env.NODE_ENV !== 'test') {
      console.log(`✅ PostgreSQL connection established [${label}]`);
    }
    // Session setup (safe, optional)
    try {
      await client.query(`SET application_name = '${APP_NAME}'`);
      await client.query(`SET TIME ZONE '${TZ}'`);
      const stmtTimeout = num(process.env.PG_STATEMENT_TIMEOUT_MS, 0); // 0 = no limit
      if (stmtTimeout > 0) {
        await client.query(`SET statement_timeout = ${stmtTimeout}`);
      }
      const idleTxTimeout = num(process.env.PG_IDLE_TX_TIMEOUT_MS, 0);
      if (idleTxTimeout > 0) {
        await client.query(`SET idle_in_transaction_session_timeout = ${idleTxTimeout}`);
      }
      // Optional: force public schema
      if (bool(process.env.PG_FORCE_PUBLIC, true)) {
        await client.query(`SET search_path TO public`);
      }
    } catch (e) {
      console.warn('Session setup warning:', e.message);
    }
  });

  pool.on('error', (err) => {
    console.error(`❌ PostgreSQL pool error [${label}]:`, err);
  });
}
onConnectSetup(writePool, 'write');
onConnectSetup(readPool, 'read');

/* ------------------------ Core API ------------------------ */
async function query(text, params = [], options = {}) {
  const start = Date.now();
  const useRead = options.readOnly && readPool ? readPool : writePool;
  const res = await useRead.query(text, params);
  const ms = Date.now() - start;
  if (ms >= SLOW_MS) {
    // Avoid logging param values (PII); just log count.
    console.log(`🐢 Slow query ${ms}ms${options.readOnly ? ' [RO]' : ''}:`, text.replace(/\s+/g, ' ').trim(), `(params: ${params.length})`);
  }
  return res;
}

async function transaction(callback) {
  const client = await writePool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function checkConnection(retries = 0, delayMs = 0) {
  for (let i = 0; i <= retries; i++) {
    try {
      await writePool.query('SELECT 1');
      return true;
    } catch (e) {
      if (i === retries) {
        console.error('PostgreSQL health check failed:', e);
        return false;
      }
      await new Promise((r) => setTimeout(r, delayMs || 500));
    }
  }
  return false;
}

async function shutdown() {
  try {
    await Promise.allSettled([writePool.end(), readPool.end()]);
    console.log('🛑 PostgreSQL pools closed');
  } catch (e) {
    console.error('Error closing PG pools:', e);
  }
}

module.exports = {
  query,
  transaction,
  checkConnection,
  shutdown,
  pools: { write: writePool, read: readPool },
};
