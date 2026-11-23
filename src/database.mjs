import fs from 'node:fs';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
export function openDatabase(file){fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});const db=new DatabaseSync(file);db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');db.exec(`
CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE,password_salt TEXT NOT NULL,password_hash TEXT NOT NULL,created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,created_at INTEGER NOT NULL,expires_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE TABLE IF NOT EXISTS projects(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,name TEXT NOT NULL,data_json TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id,updated_at DESC);
CREATE TABLE IF NOT EXISTS assets(id TEXT PRIMARY KEY,project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,name TEXT NOT NULL,kind TEXT NOT NULL,mime TEXT NOT NULL,size INTEGER NOT NULL,stored_name TEXT NOT NULL,duration REAL NOT NULL,width INTEGER NOT NULL DEFAULT 0,height INTEGER NOT NULL DEFAULT 0,created_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_assets_project ON assets(project_id);
CREATE TABLE IF NOT EXISTS renders(id TEXT PRIMARY KEY,project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,status TEXT NOT NULL,resolution INTEGER NOT NULL,progress INTEGER NOT NULL DEFAULT 0,error TEXT,stored_name TEXT,snapshot_json TEXT,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_renders_user ON renders(user_id,created_at DESC);
CREATE TABLE IF NOT EXISTS ai_usage(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,created_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_usage_user ON ai_usage(user_id,created_at);
CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,project_id TEXT,type TEXT NOT NULL,data_json TEXT NOT NULL,created_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_events_user ON events(user_id,id);
CREATE TABLE IF NOT EXISTS media_analysis(asset_id TEXT PRIMARY KEY REFERENCES assets(id) ON DELETE CASCADE,data_json TEXT NOT NULL,updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS tasks(id TEXT PRIMARY KEY,project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,asset_id TEXT REFERENCES assets(id) ON DELETE CASCADE,kind TEXT NOT NULL,status TEXT NOT NULL,progress INTEGER NOT NULL DEFAULT 0,stage TEXT NOT NULL,error TEXT,result_json TEXT,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id,created_at DESC);
CREATE TABLE IF NOT EXISTS project_revisions(project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,version INTEGER NOT NULL,label TEXT NOT NULL,data_json TEXT NOT NULL,created_at INTEGER NOT NULL,PRIMARY KEY(project_id,version));
CREATE TABLE IF NOT EXISTS user_workspaces(user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,active_project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS project_workspaces(user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,data_json TEXT NOT NULL,updated_at INTEGER NOT NULL,PRIMARY KEY(user_id,project_id));
`);
 if(!db.prepare('PRAGMA table_info(renders)').all().some(c=>c.name==='snapshot_json'))db.exec('ALTER TABLE renders ADD COLUMN snapshot_json TEXT');
 db.prepare("UPDATE renders SET status='failed',error='Server restarted during rendering. Retry to render the saved snapshot.',updated_at=? WHERE status='running'").run(Date.now());
 db.prepare("UPDATE tasks SET status='failed',error='Server restarted. Retry this task.',stage='Interrupted',updated_at=? WHERE status='running'").run(Date.now());
 db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());
 return db;
}
export function assetPublic(a){return {id:a.id,name:a.name,kind:a.kind,mime:a.mime,size:a.size,duration:a.duration,width:a.width,height:a.height,url:`/api/projects/${a.project_id}/assets/${a.id}`,createdAt:a.created_at}}
export function projectPublic(p){const out={id:p.id,name:p.name,version:p.version,createdAt:p.created_at,updatedAt:p.updated_at};if(typeof p.data_json==='string'){try{const d=JSON.parse(p.data_json),clips=Array.isArray(d.clips)?d.clips:[];out.summary={aspect:d.aspect||'9:16',clips:clips.length,texts:Array.isArray(d.texts)?d.texts.length:0,duration:+clips.reduce((t,c)=>t+Math.max(0,((+c.out||0)-(+c.in||0))/(+c.speed||1)),0).toFixed(2)}}catch{}}return out}
export function renderPublic(r){return {id:r.id,projectId:r.project_id,status:r.status,resolution:r.resolution,progress:r.progress,error:r.error||null,downloadUrl:r.status==='completed'?`/api/renders/${r.id}/file`:null,createdAt:r.created_at,updatedAt:r.updated_at}}
export function taskPublic(t){return {id:t.id,projectId:t.project_id,assetId:t.asset_id,kind:t.kind,status:t.status,progress:t.progress,stage:t.stage,error:t.error||null,createdAt:t.created_at,updatedAt:t.updated_at}}
