// Local test gateway (NOT used in production).
// Emulates the parts of Supabase and Stripe the app talks to, so the app and the e2e tests
// can run without cloud accounts:
//   /rest/v1/*  → PostgREST (started separately, see tests/dev/README.md)
//   /auth/v1/*  → minimal GoTrue mock (password login, signup + OTP, session, admin delete)
//   /v1/*       → minimal Stripe mock (PaymentIntents, PaymentMethods, Refunds)
//   /__test/*   → helpers for tests (simulate a payment and deliver the signed webhook)
import http from 'node:http';
import crypto from 'node:crypto';
import pg from 'pg';
import Stripe from 'stripe';

const PORT = Number(process.env.GATEWAY_PORT || 54321);
const POSTGREST = process.env.POSTGREST_URL || 'http://127.0.0.1:3001';
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-token-with-at-least-32-characters-long';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test';
const OTP = '123456';

const db = new pg.Pool({ connectionString: process.env.DATABASE_URL || 'postgres://postgres@127.0.0.1:54322/tic' });
// The tests drop and recreate the database; idle connections are then terminated. Don't crash.
db.on('error', (e) => console.warn('[gateway] idle db connection closed:', e.message));

const b64url = (b) => Buffer.from(b).toString('base64url');
export function signJwt(payload) {
  const head = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64url(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(head + '.' + body).digest('base64url');
  return `${head}.${body}.${sig}`;
}
function verifyJwt(token) {
  const [h, b, s] = (token || '').split('.');
  if (!s) return null;
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(h + '.' + b).digest('base64url');
  if (sig !== s) return null;
  const p = JSON.parse(Buffer.from(b, 'base64url').toString());
  return p.exp && p.exp < Date.now() / 1000 ? null : p;
}

function userJson(u) {
  return {
    id: u.id,
    aud: 'authenticated',
    role: 'authenticated',
    email: u.email,
    email_confirmed_at: u.created_at,
    user_metadata: u.raw_user_meta_data || {},
    app_metadata: { provider: 'email', providers: ['email'] },
    identities: [],
    created_at: u.created_at,
    updated_at: u.created_at,
  };
}
function session(u) {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  return {
    access_token: signJwt({ sub: u.id, email: u.email, role: 'authenticated', aud: 'authenticated', exp, session_id: crypto.randomUUID() }),
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: exp,
    refresh_token: 'rt_' + u.id,
    user: userJson(u),
  };
}

const pending = new Map(); // email -> {password, data}
const send = (res, status, body, headers = {}) => {
  res.writeHead(status, { 'content-type': 'application/json', 'access-control-allow-origin': '*', ...headers });
  res.end(body === undefined ? '' : JSON.stringify(body));
};
const readBody = (req) =>
  new Promise((r) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => r(Buffer.concat(chunks)));
  });

async function auth(req, res, path, url) {
  const raw = (await readBody(req)).toString();
  const body = raw ? JSON.parse(raw) : {};
  const bearer = (req.headers.authorization || '').replace(/^Bearer /, '');
  if (path === '/token' && url.searchParams.get('grant_type') === 'password') {
    const { rows } = await db.query(
      `select * from auth.users where lower(email) = lower($1) and encrypted_password = crypt($2, encrypted_password)`,
      [body.email, body.password],
    );
    if (!rows[0]) return send(res, 400, { error: 'invalid_grant', error_description: 'Invalid login credentials', code: 'invalid_credentials' });
    return send(res, 200, session(rows[0]));
  }
  if (path === '/token' && url.searchParams.get('grant_type') === 'refresh_token') {
    const id = String(body.refresh_token || '').replace(/^rt_/, '');
    const { rows } = await db.query('select * from auth.users where id::text = $1', [id]);
    if (!rows[0]) return send(res, 400, { error: 'invalid_grant' });
    return send(res, 200, session(rows[0]));
  }
  if (path === '/signup') {
    pending.set(body.email.toLowerCase(), { password: body.password, data: body.data || {} });
    console.log(`[gateway] signup ${body.email} → OTP ${OTP}`);
    return send(res, 200, { id: crypto.randomUUID(), email: body.email, aud: 'authenticated', role: '', confirmation_sent_at: new Date().toISOString(), identities: [{}], user_metadata: body.data });
  }
  if (path === '/verify') {
    const p = pending.get(String(body.email).toLowerCase());
    if (!p || body.token !== OTP) return send(res, 403, { error: 'otp_expired', msg: 'Token has expired or is invalid' });
    const { rows } = await db.query(
      `insert into auth.users (email, encrypted_password, raw_user_meta_data) values ($1, crypt($2, gen_salt('bf')), $3) returning *`,
      [body.email, p.password, p.data],
    );
    pending.delete(String(body.email).toLowerCase());
    return send(res, 200, session(rows[0]));
  }
  if (path === '/recover') return send(res, 200, {});
  if (path === '/logout') return send(res, 204);
  if (path === '/user') {
    const claims = verifyJwt(bearer);
    if (!claims?.sub) return send(res, 401, { msg: 'invalid JWT' });
    const { rows } = await db.query('select * from auth.users where id = $1', [claims.sub]);
    if (!rows[0]) return send(res, 401, { msg: 'user not found' });
    if (req.method === 'PUT' && body.password) {
      await db.query(`update auth.users set encrypted_password = crypt($2, gen_salt('bf')) where id = $1`, [claims.sub, body.password]);
    }
    return send(res, 200, userJson(rows[0]));
  }
  const del = path.match(/^\/admin\/users\/([0-9a-f-]+)$/);
  if (del && req.method === 'DELETE') {
    const claims = verifyJwt(bearer);
    if (claims?.role !== 'service_role') return send(res, 403, {});
    await db.query('delete from auth.users where id = $1', [del[1]]);
    return send(res, 200, {});
  }
  return send(res, 404, { msg: 'not mocked: ' + path });
}

// --- Stripe mock -----------------------------------------------------------
const intents = new Map();
const parseForm = (raw) => {
  const out = {};
  for (const [k, v] of new URLSearchParams(raw)) {
    const keys = k.replace(/\]/g, '').split('[');
    let o = out;
    keys.slice(0, -1).forEach((kk) => (o = o[kk] ??= {}));
    o[keys[keys.length - 1]] = v;
  }
  return out;
};
async function stripeMock(req, res, path) {
  const body = parseForm((await readBody(req)).toString());
  if (path === '/v1/payment_intents' && req.method === 'POST') {
    const id = 'pi_test_' + crypto.randomBytes(8).toString('hex');
    const pi = { id, object: 'payment_intent', amount: Number(body.amount), currency: body.currency, status: 'requires_payment_method', client_secret: id + '_secret_test', metadata: body.metadata || {}, payment_method: null, latest_charge: null };
    intents.set(id, pi);
    return send(res, 200, pi);
  }
  const m = path.match(/^\/v1\/payment_intents\/(pi_[A-Za-z0-9_]+)$/);
  if (m) {
    const pi = intents.get(m[1]);
    if (!pi) return send(res, 404, { error: { type: 'invalid_request_error', message: 'No such payment_intent' } });
    if (req.method === 'POST') {
      if (body.amount) pi.amount = Number(body.amount);
    }
    return send(res, 200, pi);
  }
  const pm = path.match(/^\/v1\/payment_methods\/(pm_[A-Za-z0-9_]+)$/);
  if (pm) {
    const type = pm[1].includes('sepa') ? 'sepa_debit' : pm[1].includes('paypal') ? 'paypal' : 'card';
    return send(res, 200, { id: pm[1], object: 'payment_method', type, card: type === 'card' ? { wallet: null } : undefined });
  }
  if (path === '/v1/refunds' && req.method === 'POST') {
    return send(res, 200, { id: 're_test_' + crypto.randomBytes(6).toString('hex'), object: 'refund', status: 'succeeded', amount: Number(body.amount), payment_intent: body.payment_intent });
  }
  return send(res, 404, { error: { message: 'not mocked: ' + path } });
}

const stripeLib = new Stripe('sk_test_mock');
async function deliverWebhook(type, object) {
  const payload = JSON.stringify({ id: 'evt_' + crypto.randomBytes(6).toString('hex'), object: 'event', type, data: { object }, created: Math.floor(Date.now() / 1000) });
  const header = stripeLib.webhooks.generateTestHeaderString({ payload, secret: WEBHOOK_SECRET });
  const r = await fetch(APP_URL + '/api/stripe/webhook', { method: 'POST', headers: { 'stripe-signature': header, 'content-type': 'application/json' }, body: payload });
  return r.status;
}

async function testHelpers(req, res, path) {
  const body = JSON.parse((await readBody(req)).toString() || '{}');
  const m = path.match(/^\/__test\/pay\/(pi_[A-Za-z0-9_]+)$/);
  if (m) {
    const pi = intents.get(m[1]);
    if (!pi) return send(res, 404, {});
    const status = body.status || 'succeeded'; // succeeded | processing | failed
    pi.payment_method = body.method || 'pm_card_test';
    pi.status = status === 'failed' ? 'requires_payment_method' : status;
    const type = status === 'failed' ? 'payment_intent.payment_failed' : 'payment_intent.' + status;
    const code = await deliverWebhook(type, pi);
    return send(res, 200, { webhook: code, pi });
  }
  if (path === '/__test/intents') return send(res, 200, [...intents.values()]);
  if (path === '/__test/jwt') return send(res, 200, { anon: signJwt({ role: 'anon', iss: 'test' }), service: signJwt({ role: 'service_role', iss: 'test' }) });
  return send(res, 404, {});
}

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    try {
      if (req.method === 'OPTIONS') return send(res, 204, undefined, { 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' });
      if (url.pathname.startsWith('/auth/v1')) return await auth(req, res, url.pathname.slice(8), url);
      if (url.pathname.startsWith('/__test')) return await testHelpers(req, res, url.pathname);
      if (url.pathname.startsWith('/v1/')) return await stripeMock(req, res, url.pathname);
      if (url.pathname.startsWith('/rest/v1')) {
        const target = POSTGREST + url.pathname.slice(8) + url.search;
        const headers = { ...req.headers };
        delete headers.host;
        // Supabase passes the anon key as Bearer when there is no session.
        const body = ['GET', 'HEAD'].includes(req.method) ? undefined : await readBody(req);
        const r = await fetch(target, { method: req.method, headers, body });
        const out = Buffer.from(await r.arrayBuffer());
        const h = Object.fromEntries(r.headers);
        delete h['content-encoding'];
        delete h['content-length'];
        res.writeHead(r.status, { ...h, 'access-control-allow-origin': '*' });
        return res.end(out);
      }
      send(res, 404, { msg: 'unknown path' });
    } catch (e) {
      console.error(e);
      send(res, 500, { msg: String(e) });
    }
  })
  .listen(PORT, () => console.log(`[gateway] listening on ${PORT}`));
