// "Continue with Google": OAuth 2.0 authorization code flow with PKCE and state, done on the server.
// Needs GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET. Redirect URI: `${APP_ORIGIN}/api/auth/google/callback`.
import {createHash,createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
import {uuid,now} from './core.mjs';

const AUTH_URL='https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL='https://oauth2.googleapis.com/token';
const ISSUERS=new Set(['accounts.google.com','https://accounts.google.com']);
const FLOW_TTL=10*60; // seconds the sign-in round trip may take

export const googleConfigured=()=>!!(process.env.GOOGLE_CLIENT_ID&&process.env.GOOGLE_CLIENT_SECRET);
const b64u=b=>Buffer.from(b).toString('base64url');

export function initGoogleSchema(db){
 if(!db.prepare('PRAGMA table_info(users)').all().some(c=>c.name==='google_sub'))db.exec('ALTER TABLE users ADD COLUMN google_sub TEXT');
 db.exec('CREATE UNIQUE INDEX IF NOT EXISTS users_google_sub ON users(google_sub) WHERE google_sub IS NOT NULL');
}

// The short-lived flow cookie carries state + PKCE verifier, signed so it cannot be forged.
function sign(payload,secret){const body=b64u(JSON.stringify(payload));return `${body}.${createHmac('sha256',secret).update(body).digest('base64url')}`}
function unsign(value,secret){const [body,mac]=String(value||'').split('.');if(!body||!mac)return null;const want=createHmac('sha256',secret).update(body).digest();const got=Buffer.from(mac,'base64url');if(got.length!==want.length||!timingSafeEqual(got,want))return null;try{return JSON.parse(Buffer.from(body,'base64url').toString())}catch{return null}}
function decodeJwtPayload(jwt){const part=String(jwt||'').split('.')[1];if(!part)return null;try{return JSON.parse(Buffer.from(part,'base64url').toString())}catch{return null}}

export function googleRoutes({db,origin,production,rate,cookies,createSessionCookie,maxUsers}){
 const clientId=()=>process.env.GOOGLE_CLIENT_ID,secret=()=>process.env.GOOGLE_CLIENT_SECRET;
 const redirectUri=()=>`${origin}/api/auth/google/callback`;
 const flowCookie=(v,clear=false)=>`rp_gflow=${clear?'':v}; HttpOnly; Path=/api/auth/google; SameSite=Lax; Max-Age=${clear?0:FLOW_TTL}${production?'; Secure':''}`;
 const back=(res,query,extra=[])=>{res.writeHead(302,{Location:`${origin}/studio${query?`?${query}`:''}`,'Cache-Control':'no-store','Set-Cookie':[flowCookie('',true),...extra]});res.end()};
 const fail=(res,code)=>back(res,`auth_error=${encodeURIComponent(code)}`);

 return async function handle(req,res,pathname,method,url){
  if(method!=='GET'||!pathname.startsWith('/api/auth/google/'))return false;
  if(!googleConfigured()){fail(res,'google_unavailable');return true}

  if(pathname==='/api/auth/google/start'){
   rate(`gstart:${req.socket.remoteAddress}`,30,10*60_000);
   const state=b64u(randomBytes(24)),verifier=b64u(randomBytes(48)),mode=url.searchParams.get('mode')==='login'?'login':'register';
   const challenge=createHash('sha256').update(verifier).digest('base64url');
   const q=new URLSearchParams({client_id:clientId(),redirect_uri:redirectUri(),response_type:'code',scope:'openid email profile',state,code_challenge:challenge,code_challenge_method:'S256',prompt:'select_account',access_type:'online'});
   res.writeHead(302,{Location:`${AUTH_URL}?${q}`,'Cache-Control':'no-store','Set-Cookie':flowCookie(sign({state,verifier,mode,t:now()},secret()))});res.end();return true;
  }

  if(pathname==='/api/auth/google/callback'){
   rate(`gcb:${req.socket.remoteAddress}`,30,10*60_000);
   const flow=unsign(cookies(req).rp_gflow,secret());
   if(url.searchParams.get('error')){fail(res,url.searchParams.get('error')==='access_denied'?'google_cancelled':'google_failed');return true}
   const code=url.searchParams.get('code'),state=url.searchParams.get('state');
   if(!flow||!code||!state||state.length!==flow.state.length||!timingSafeEqual(Buffer.from(state),Buffer.from(flow.state))||now()-flow.t>FLOW_TTL*1000){fail(res,'google_expired');return true}
   let tokens;
   try{const r=await fetch(process.env.GOOGLE_TOKEN_URL||TOKEN_URL,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({code,client_id:clientId(),client_secret:secret(),redirect_uri:redirectUri(),grant_type:'authorization_code',code_verifier:flow.verifier}),signal:AbortSignal.timeout(10000)});
    tokens=await r.json();if(!r.ok)throw new Error(tokens.error||'token exchange failed')}
   catch(e){console.warn('[google] token exchange failed:',e.message);fail(res,'google_failed');return true}
   // The ID token comes straight from Google's token endpoint over TLS; validate its claims.
   const c=decodeJwtPayload(tokens.id_token);
   if(!c||!ISSUERS.has(c.iss)||c.aud!==clientId()||!(c.exp*1000>now())||!c.sub||!c.email||c.email_verified!==true&&c.email_verified!=='true'){fail(res,'google_unverified');return true}
   const email=String(c.email).trim().toLowerCase(),sub=String(c.sub);
   let user=db.prepare('SELECT * FROM users WHERE google_sub=?').get(sub),fresh=false;
   if(!user){
    user=db.prepare('SELECT * FROM users WHERE email=?').get(email);
    if(user)db.prepare('UPDATE users SET google_sub=? WHERE id=?').run(sub,user.id); // same verified email: link Google to the existing account
    else{
     if(process.env.ALLOW_SIGNUP==='false'){fail(res,'signup_closed');return true}
     if(process.env.SIGNUP_INVITE_CODE){fail(res,'invite_required');return true}
     if(db.prepare('SELECT COUNT(*) n FROM users').get().n>=maxUsers){fail(res,'capacity');return true}
     const id=uuid(),t=now();
     // No password: the stored hash can never match, so this account signs in with Google until a password is set.
     db.prepare('INSERT INTO users(id,email,password_salt,password_hash,created_at,google_sub) VALUES(?,?,?,?,?,?)').run(id,email,b64u(randomBytes(24)),'!google',t,sub);
     const name=String(c.given_name||c.name||'').replace(/[<>"]/g,'').trim().slice(0,60);
     if(name)db.prepare('INSERT INTO user_profiles(user_id,data_json,step,onboarded_at,updated_at) VALUES(?,?,0,NULL,?) ON CONFLICT(user_id) DO NOTHING').run(id,JSON.stringify({name}),t);
     user={id,email,created_at:t};fresh=true;
    }
   }
   back(res,fresh?'auth=google&new=1':'auth=google',[createSessionCookie(user)]);return true;
  }
  return false;
 };
}
