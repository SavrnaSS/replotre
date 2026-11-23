import {now,err} from './core.mjs';

/** An authenticated, replayable event stream. No media or provider secrets in events. */
export class EventHub {
 constructor(db){this.db=db;this.clients=new Map();this.writes=0;}
 publish(userId,type,data,projectId=null){
  const result=this.db.prepare('INSERT INTO events(user_id,project_id,type,data_json,created_at) VALUES(?,?,?,?,?)').run(userId,projectId,type,JSON.stringify(data),now());
  const id=Number(result.lastInsertRowid);
  const message=`id: ${id}\nevent: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
  for(const client of this.clients.get(userId)||[])this.write(client,message);
  if(++this.writes%128===0)this.db.prepare('DELETE FROM events WHERE created_at < ? OR id < ?').run(now()-86400000,id-10000);
  return id;
 }
 write(client,message){if(client.res.destroyed||client.res.writableEnded)return;try{if(!client.res.write(message))client.res.end()}catch{client.res.destroy()}}
 connect(req,res,user,isAuthorized){
  const clients=this.clients.get(user.id)||new Set();if(clients.size>=8)err(429,'Close an unused studio tab before reconnecting');
  const raw=req.headers['last-event-id']||new URL(req.url,'http://local').searchParams.get('since');
  const cursor=raw?Number(raw):null;if(cursor!==null&&(!Number.isSafeInteger(cursor)||cursor<0))err(400,'Invalid event cursor');
  res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'});
  res.flushHeaders();const client={res};clients.add(client);this.clients.set(user.id,clients);
  this.write(client,'retry: 1500\n\n');
  const latest=Number(this.db.prepare('SELECT COALESCE(MAX(id),0) id FROM events WHERE user_id=?').get(user.id).id);
  if(cursor!==null){
   const rows=this.db.prepare('SELECT * FROM events WHERE user_id=? AND id>? ORDER BY id LIMIT 501').all(user.id,cursor);
   const oldest=this.db.prepare('SELECT MIN(id) id FROM events WHERE user_id=?').get(user.id).id;
   if(rows.length>500||cursor>latest||(oldest&&cursor<oldest-1))this.write(client,`event: reset\ndata: {}\n\n`);
   else for(const row of rows)this.write(client,`id: ${row.id}\nevent: ${row.type}\ndata: ${row.data_json}\n\n`);
  }
  this.write(client,`id: ${latest}\nevent: ready\ndata: ${JSON.stringify({cursor:latest,serverTime:now()})}\n\n`);
  const timer=setInterval(()=>{if(!isAuthorized()){res.end();return}this.write(client,`: heartbeat ${now()}\n\n`)},15000);timer.unref();
  res.on('close',()=>{clearInterval(timer);clients.delete(client);if(!clients.size)this.clients.delete(user.id)});
 }
 disconnect(userId){for(const client of this.clients.get(userId)||[])client.res.end();this.clients.delete(userId)}
 shutdown(){for(const userId of this.clients.keys())this.disconnect(userId)}
}
