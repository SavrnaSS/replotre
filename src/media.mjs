import {createReadStream,createWriteStream} from 'node:fs';
import {open,rename,mkdir,rm,stat} from 'node:fs/promises';
import {pipeline} from 'node:stream/promises';
import {Transform} from 'node:stream';
import {spawn} from 'node:child_process';
import path from 'node:path';
import {ApiError,err,safeName,uuid,now} from './core.mjs';
import {assetPublic} from './database.mjs';
const types={
 'video/mp4':['video','.mp4'],'video/quicktime':['video','.mov'],'video/webm':['video','.webm'],
 'image/jpeg':['image','.jpg'],'image/png':['image','.png'],'image/webp':['image','.webp'],
 'audio/mpeg':['audio','.mp3'],'audio/mp4':['audio','.m4a'],'audio/x-m4a':['audio','.m4a'],
 'audio/wav':['audio','.wav'],'audio/x-wav':['audio','.wav'],'audio/ogg':['audio','.ogg'],'audio/webm':['audio','.webm']
};
function magicGood(buf,mime){if(mime==='image/jpeg')return buf[0]===0xff&&buf[1]===0xd8;if(mime==='image/png')return buf.toString('ascii',1,4)==='PNG';if(mime==='image/webp')return buf.toString('ascii',0,4)==='RIFF'&&buf.toString('ascii',8,12)==='WEBP';if(mime==='video/webm'||mime==='audio/webm')return buf.subarray(0,4).toString('hex')==='1a45dfa3';if(mime==='audio/wav'||mime==='audio/x-wav')return buf.toString('ascii',0,4)==='RIFF'&&buf.toString('ascii',8,12)==='WAVE';if(mime==='audio/ogg')return buf.toString('ascii',0,4)==='OggS';if(mime==='audio/mpeg')return buf.toString('ascii',0,3)==='ID3'||buf[0]===255&&(buf[1]&224)===224;if(['video/mp4','video/quicktime','audio/mp4','audio/x-m4a'].includes(mime))return buf.toString('ascii',4,8)==='ftyp';return false}
export async function probe(file){return new Promise((resolve,reject)=>{const p=spawn(process.env.FFPROBE_PATH||'ffprobe',['-v','error','-show_entries','format=duration:stream=codec_type,width,height','-of','json',file],{stdio:['ignore','pipe','pipe']});let out='',stderr='';const t=setTimeout(()=>p.kill('SIGKILL'),15000);p.stdout.on('data',b=>out+=b.toString().slice(0,30000));p.stderr.on('data',b=>stderr+=b.toString().slice(0,1000));p.on('error',reject);p.on('close',code=>{clearTimeout(t);if(code!==0)return reject(new ApiError(422,`Unreadable media file${stderr?' (FFprobe rejected file)':''}`));try{const j=JSON.parse(out);const v=j.streams?.find(s=>s.codec_type==='video');const a=j.streams?.some(s=>s.codec_type==='audio');resolve({duration:Math.max(.1,Math.min(7200,Number(j.format?.duration)||5)),width:v?.width||0,height:v?.height||0,hasAudio:!!a,hasVideo:!!v})}catch{reject(new ApiError(422,'Unable to inspect media'))}})})}
export async function receiveAsset({req,db,user,projectId,dataDir,maxFileBytes,maxUserBytes}){
 const mime=String(req.headers['content-type']||'').split(';')[0].toLowerCase();const t=types[mime];if(!t)err(415,'Unsupported media type');
 const current=Number(db.prepare('SELECT COALESCE(SUM(size),0) size FROM assets WHERE user_id=?').get(user.id).size);if(current>=maxUserBytes)err(413,'Storage quota reached');
 const count=db.prepare('SELECT COUNT(*) n FROM assets WHERE project_id=?').get(projectId).n;if(count>=120)err(413,'Maximum assets reached for this project');
 const name=safeName(new URL(req.url,'http://local').searchParams.get('name')||'Untitled media');
 const id=uuid();const storedName=`assets/${projectId}/${id}${t[1]}`;const full=path.join(dataDir,storedName);const part=full+'.part';await mkdir(path.dirname(full),{recursive:true});let size=0;
 const limiter=new Transform({transform(chunk,enc,cb){size+=chunk.length;if(size>maxFileBytes||current+size>maxUserBytes)cb(new ApiError(413,'File or storage quota exceeded'));else cb(null,chunk)}});
 try{await pipeline(req,limiter,createWriteStream(part,{flags:'wx',mode:0o600}));const fd=await open(part,'r');const header=Buffer.alloc(32);let bytes=0;try{bytes=(await fd.read(header,0,32,0)).bytesRead}finally{await fd.close()}if(bytes<12||!magicGood(header,mime))err(422,'File content does not match its media type');const meta=await probe(part);if(t[0]==='video'&&!meta.hasVideo||t[0]==='audio'&&!meta.hasAudio||t[0]==='image'&&!meta.hasVideo)err(422,'Unexpected media stream');if(meta.duration>3600)err(413,'Maximum media duration is 1 hour');await rename(part,full);const asset={id,project_id:projectId,user_id:user.id,name,kind:t[0],mime,size,stored_name:storedName,duration:t[0]==='image'?5:meta.duration,width:meta.width,height:meta.height,created_at:now()};db.prepare('INSERT INTO assets(id,project_id,user_id,name,kind,mime,size,stored_name,duration,width,height,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').run(asset.id,asset.project_id,asset.user_id,asset.name,asset.kind,asset.mime,asset.size,asset.stored_name,asset.duration,asset.width,asset.height,asset.created_at);return assetPublic(asset);
 }catch(e){await rm(part,{force:true}).catch(()=>{});await rm(full,{force:true}).catch(()=>{});throw e}
}
export async function streamFile(req,res,file,mime,filename,download=false){
 let size;try{size=(await stat(file)).size}catch{err(404,'File unavailable')}
 const range=req.headers.range;const headers={'Content-Type':mime,'Accept-Ranges':'bytes','Cache-Control':'private, max-age=60','Content-Disposition':`${download?'attachment':'inline'}; filename="${safeName(filename).replace(/[^\x20-\x7e]/g,'_')}"`};
 if(range){const match=/^bytes=(\d*)-(\d*)$/.exec(range);if(!match)err(416,'Invalid range');let start=match[1]?Number(match[1]):0,end=match[2]?Number(match[2]):size-1;if(!match[1]&&match[2]){start=Math.max(0,size-Number(match[2]));end=size-1}if(start>=size||end<start||!Number.isSafeInteger(start)||!Number.isSafeInteger(end)){res.writeHead(416,{'Content-Range':`bytes */${size}`});return res.end()}end=Math.min(end,size-1);res.writeHead(206,{...headers,'Content-Range':`bytes ${start}-${end}/${size}`,'Content-Length':end-start+1});if(req.method==='HEAD')return res.end();return createReadStream(file,{start,end}).pipe(res)}
 res.writeHead(200,{...headers,'Content-Length':size});if(req.method==='HEAD')return res.end();createReadStream(file).pipe(res);
}
