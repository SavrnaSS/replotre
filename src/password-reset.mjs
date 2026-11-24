// Password reset by email.
// - Tokens: 32 random bytes, stored only as a SHA-256 hash, single use, 30-minute lifetime; a new request replaces older links.
// - No account enumeration: /forgot answers the same way (and in roughly the same time) whether or not the email exists.
// - Rate limited per IP and per email. A successful reset signs the account out everywhere, then signs this browser in.
// - Email goes through Resend's HTTP API (RESEND_API_KEY + MAIL_FROM). Without them the feature reports itself as unavailable
//   and the client falls back to "email us".
import {randomToken,hashToken,bodyJSON,json,err,now,emailValid,hashPassword} from './core.mjs';

export const RESET_TTL=30*60_000;
export const resetConfigured=()=>!!(process.env.RESEND_API_KEY&&process.env.MAIL_FROM);

export function initResetSchema(db){
 db.exec(`CREATE TABLE IF NOT EXISTS password_resets(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,created_at INTEGER NOT NULL,expires_at INTEGER NOT NULL,used_at INTEGER,ip TEXT);
 CREATE INDEX IF NOT EXISTS password_resets_user ON password_resets(user_id);`)}

const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function maskEmail(email){const [u,d]=String(email).split('@');if(!d)return '';const keep=u.length<=2?1:2;return u.slice(0,keep)+'•'.repeat(Math.max(2,Math.min(6,u.length-keep)))+'@'+d}

export function resetEmail({link,minutes=30}){
 const subject='Reset your Replotre password';
 const text=`Reset your Replotre password\n\nSomeone (hopefully you) asked to reset the password for your Replotre account. Open this link to choose a new one:\n\n${link}\n\nThe link works once and expires in ${minutes} minutes. If you didn't ask for this, ignore this email; your password won't change.\n\nReplotre · replotre.com`;
 const html=`<!doctype html><html><body style="margin:0;background:#0c0d0f;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Arial,sans-serif;color:#f2eee7">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:480px;background:#131416;border:1px solid #26272b;border-radius:16px">
<tr><td style="padding:28px 28px 8px;font-size:20px;font-weight:800;letter-spacing:-.03em;color:#f2eee7">Replotre<span style="color:#e2ab77">.</span></td></tr>
<tr><td style="padding:8px 28px 0;font-size:22px;font-weight:600;letter-spacing:-.02em;color:#f2eee7">Reset your password</td></tr>
<tr><td style="padding:10px 28px 0;font-size:15px;line-height:1.55;color:#a8a49c">Someone (hopefully you) asked to reset the password for your Replotre account. Choose a new one with the button below.</td></tr>
<tr><td style="padding:24px 28px"><a href="${esc(link)}" style="display:inline-block;background:#e2ab77;color:#1a1410;text-decoration:none;font-weight:600;font-size:15px;padding:13px 22px;border-radius:10px">Set a new password</a></td></tr>
<tr><td style="padding:0 28px 8px;font-size:13px;line-height:1.55;color:#77746e">The link works once and expires in ${minutes} minutes. If the button doesn't work, paste this into your browser:<br><a href="${esc(link)}" style="color:#a8a49c;word-break:break-all">${esc(link)}</a></td></tr>
<tr><td style="padding:12px 28px 28px;font-size:13px;line-height:1.55;color:#77746e">Didn't ask for this? Ignore this email. Your password won't change.</td></tr>
</table><p style="font-size:12px;color:#56544f;margin:16px 0 0">Replotre · <a href="https://replotre.com" style="color:#77746e">replotre.com</a></p></td></tr></table></body></html>`;
 return {subject,text,html}}

async function sendWithResend({to,subject,text,html}){
 const r=await fetch(process.env.RESEND_API_URL||'https://api.resend.com/emails',{method:'POST',headers:{'Authorization':`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json'},
  body:JSON.stringify({from:process.env.MAIL_FROM,to:[to],subject,text,html,...(process.env.MAIL_REPLY_TO?{reply_to:process.env.MAIL_REPLY_TO}:{})}),signal:AbortSignal.timeout(10000)});
 if(!r.ok)throw new Error(`Email provider error ${r.status}`)}

export function resetRoutes({db,origin,rate,startSession,hub,send=sendWithResend,ttl=RESET_TTL}){
 const findValid=token=>{if(typeof token!=='string'||token.length<20||token.length>100)return null;
  return db.prepare('SELECT password_resets.*,users.email FROM password_resets JOIN users ON users.id=password_resets.user_id WHERE token_hash=? AND used_at IS NULL AND expires_at>?').get(hashToken(token),now())||null};
 return async function(req,res,method,pathname){
  const ip=req.socket.remoteAddress||'';
  if(method==='POST'&&pathname==='/api/auth/forgot'){
   rate(`forgot:${ip}`,8,15*60_000);const b=await bodyJSON(req,2000),email=String(b.email||'').trim().toLowerCase();
   if(!emailValid(email))err(400,'Enter a valid email address');
   if(!resetConfigured())return json(res,200,{ok:true,available:false});
   const started=now();
   try{rate(`forgot-email:${email}`,3,60*60_000)}catch{return json(res,200,{ok:true,available:true,ttlMinutes:Math.round(ttl/60000)})} // quietly cap per address
   const user=db.prepare('SELECT id,email FROM users WHERE email=?').get(email);
   if(user){
    const token=randomToken(),t=now();
    db.prepare('DELETE FROM password_resets WHERE user_id=? OR expires_at<?').run(user.id,t-24*3600_000);
    db.prepare('INSERT INTO password_resets(token_hash,user_id,created_at,expires_at,ip) VALUES(?,?,?,?,?)').run(hashToken(token),user.id,t,t+ttl,ip.slice(0,64));
    const link=`${origin}/studio?reset=${encodeURIComponent(token)}`;
    try{await send({to:user.email,...resetEmail({link,minutes:Math.round(ttl/60000)})})}
    catch(e){console.error('[reset] email failed:',e.message);db.prepare('DELETE FROM password_resets WHERE token_hash=?').run(hashToken(token));err(502,'We couldn’t send the email right now. Try again in a minute.')}}
   // Same answer and similar timing whether or not the account exists.
   const wait=900-(now()-started);if(wait>0)await new Promise(r=>setTimeout(r,wait+Math.random()*200));
   return json(res,200,{ok:true,available:true,ttlMinutes:Math.round(ttl/60000)})}
  if(method==='POST'&&pathname==='/api/auth/reset/check'){
   rate(`reset-check:${ip}`,30,15*60_000);const b=await bodyJSON(req,1000),row=findValid(b.token);
   if(!row)return json(res,200,{valid:false});
   return json(res,200,{valid:true,email:maskEmail(row.email),fullEmail:row.email,expiresAt:row.expires_at})}
  if(method==='POST'&&pathname==='/api/auth/reset'){
   rate(`reset:${ip}`,10,15*60_000);const b=await bodyJSON(req,2000),row=findValid(b.token);
   if(!row)err(410,'This reset link has expired or was already used. Ask for a new one.');
   if(typeof b.password!=='string'||b.password.length<12||b.password.length>128)err(400,'Use a password of 12–128 characters');
   if(b.password.trim().toLowerCase()===row.email)err(400,'Choose a password that isn’t your email address');
   const h=await hashPassword(b.password),t=now();
   db.exec('BEGIN');
   try{
    const claimed=db.prepare('UPDATE password_resets SET used_at=? WHERE token_hash=? AND used_at IS NULL').run(t,row.token_hash);
    if(!claimed.changes)err(410,'This reset link was already used. Ask for a new one.');
    db.prepare('UPDATE users SET password_salt=?,password_hash=? WHERE id=?').run(h.salt,h.hash,row.user_id);
    db.prepare('DELETE FROM password_resets WHERE user_id=? AND token_hash<>?').run(row.user_id,row.token_hash);
    db.prepare('DELETE FROM sessions WHERE user_id=?').run(row.user_id); // sign out every other device
    db.exec('COMMIT')}
   catch(e){try{db.exec('ROLLBACK')}catch{}throw e}
   try{hub?.disconnect?.(row.user_id)}catch{}
   const user=db.prepare('SELECT * FROM users WHERE id=?').get(row.user_id);
   return startSession(res,user)}
  return false}}
