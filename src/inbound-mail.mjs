// Inbound mail forwarding: Resend receives mail for @replotre.com and calls this webhook (event `email.received`).
// We verify the Svix signature, fetch the full message from Resend, and forward it to MAIL_FORWARD_TO with
// Reply-To set to the original sender, so replying from Gmail answers the person directly.
import {createHmac, timingSafeEqual} from 'node:crypto';
import {json} from './core.mjs';

const API = () => process.env.RESEND_API_BASE || 'https://api.resend.com';
const key = () => process.env.RESEND_INBOUND_API_KEY || process.env.RESEND_API_KEY;
export const inboundConfigured = () => !!(process.env.RESEND_WEBHOOK_SECRET && process.env.MAIL_FORWARD_TO && key());
const MAX_ATTACH_BYTES = 20 * 1024 * 1024;
const seen = new Map(); // svix-id -> time, so Resend's retries don't forward twice

export function verifySvix(raw, headers, secret, toleranceSec = 300) {
  const id = headers['svix-id'] || headers['webhook-id'], ts = headers['svix-timestamp'] || headers['webhook-timestamp'], sig = headers['svix-signature'] || headers['webhook-signature'];
  if (!id || !ts || !sig || !secret) return false;
  const t = Number(ts);
  if (!Number.isFinite(t) || Math.abs(Date.now() / 1000 - t) > toleranceSec) return false;
  const secretBytes = Buffer.from(String(secret).replace(/^whsec_/, ''), 'base64');
  const expected = createHmac('sha256', secretBytes).update(`${id}.${ts}.${raw}`).digest();
  return String(sig).split(' ').some(part => {
    const [ver, val] = part.split(',');
    if (ver !== 'v1' || !val) return false;
    const got = Buffer.from(val, 'base64');
    return got.length === expected.length && timingSafeEqual(got, expected);
  });
}

async function resend(path, opts = {}) {
  const r = await fetch(API() + path, {...opts, headers: {'Authorization': `Bearer ${key()}`, 'Content-Type': 'application/json', ...(opts.headers || {})}, signal: AbortSignal.timeout(20000)});
  const body = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(`Resend ${r.status}: ${body?.message || body?.name || 'request failed'}`); e.status = r.status; throw e; }
  return body;
}

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));

export async function forwardReceived(emailId, {to = process.env.MAIL_FORWARD_TO, from = process.env.MAIL_FROM} = {}) {
  const m = await resend(`/emails/receiving/${encodeURIComponent(emailId)}`);
  const sender = m.headers?.from || m.from || 'unknown sender';
  const replyTo = (Array.isArray(m.reply_to) && m.reply_to.length ? m.reply_to : [m.from]).filter(Boolean);
  const recipients = (m.to || []).join(', ');
  // Regular attachments are re-attached (inline images are already embedded in the HTML as data URIs).
  const attachments = [];
  if ((m.attachments || []).some(a => a.content_disposition !== 'inline')) {
    const list = await resend(`/emails/receiving/${encodeURIComponent(emailId)}/attachments?limit=100`);
    let total = 0;
    for (const a of list.data || []) {
      if (a.content_disposition === 'inline' || !a.download_url) continue;
      if (total + (a.size || 0) > MAX_ATTACH_BYTES) { attachments.skipped = (attachments.skipped || 0) + 1; continue; }
      const r = await fetch(a.download_url, {signal: AbortSignal.timeout(30000)});
      if (!r.ok) continue;
      const buf = Buffer.from(await r.arrayBuffer());
      total += buf.length;
      attachments.push({filename: a.filename || 'attachment', content: buf.toString('base64'), ...(a.content_type ? {content_type: a.content_type} : {})});
    }
  }
  const note = `Received at ${recipients || 'replotre.com'} from ${sender}. Reply to this email to answer them directly.${attachments.skipped ? ` ${attachments.skipped} large attachment(s) were not forwarded; open the message in Resend → Inboxes.` : ''}`;
  const html = `<div style="font:13px/1.5 -apple-system,Segoe UI,Arial,sans-serif;color:#666;border-bottom:1px solid #e5e5e5;padding:0 0 10px;margin:0 0 16px">${esc(note)}</div>${m.html || `<pre style="white-space:pre-wrap;font:14px/1.5 -apple-system,Segoe UI,Arial,sans-serif">${esc(m.text || '')}</pre>`}`;
  const text = `${note}\n\n${m.text || ''}`;
  return resend('/emails', {method: 'POST', headers: {'Idempotency-Key': `fwd-${emailId}`}, body: JSON.stringify({
    from: (from || 'Replotre <hello@replotre.com>').replace(/^[^<]*</, 'Replotre inbox <'),
    to: [to], reply_to: replyTo, subject: m.subject || '(no subject)', html, text,
    ...(attachments.length ? {attachments} : {}),
  })});
}

export function inboundRoutes() {
  return async function(req, res, method, pathname) {
    if (method !== 'POST' || pathname !== '/api/email/inbound') return false;
    if (!inboundConfigured()) return json(res, 503, {error: 'Inbound forwarding is not configured'});
    const chunks = []; let size = 0;
    for await (const c of req) { size += c.length; if (size > 256 * 1024) return json(res, 413, {error: 'Payload too large'}); chunks.push(c); }
    const raw = Buffer.concat(chunks).toString('utf8');
    if (!verifySvix(raw, req.headers, process.env.RESEND_WEBHOOK_SECRET)) return json(res, 401, {error: 'Invalid signature'});
    let event; try { event = JSON.parse(raw); } catch { return json(res, 400, {error: 'Invalid JSON'}); }
    if (event?.type !== 'email.received' || !event.data?.email_id) return json(res, 200, {ok: true, ignored: true});
    const id = req.headers['svix-id'] || req.headers['webhook-id'];
    const now = Date.now();
    for (const [k, t] of seen) if (now - t > 24 * 3600_000) seen.delete(k);
    if (seen.has(id)) return json(res, 200, {ok: true, duplicate: true});
    try {
      await forwardReceived(event.data.email_id);
      seen.set(id, now);
      return json(res, 200, {ok: true});
    } catch (e) {
      console.error('[inbound] forward failed:', e.message);
      return json(res, e.status === 401 || e.status === 403 ? 200 : 502, {error: 'Forward failed'}); // auth errors won't fix themselves on retry
    }
  };
}
