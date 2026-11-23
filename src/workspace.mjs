import '../workspace-state.js';
import {err} from './core.mjs';

const State=globalThis.ReplotreWorkspaceState;
export function readProjectWorkspace(db,userId,projectId){
 const row=db.prepare('SELECT w.data_json,w.updated_at FROM project_workspaces w JOIN projects p ON p.id=w.project_id AND p.user_id=w.user_id WHERE w.user_id=? AND w.project_id=?').get(userId,projectId);
 if(!row)return null;
 try{return {state:State.sanitize(JSON.parse(row.data_json)),updatedAt:row.updated_at}}catch{return null}
}
export function readActiveWorkspace(db,userId){
 const row=db.prepare('SELECT w.active_project_id,w.updated_at FROM user_workspaces w JOIN projects p ON p.id=w.active_project_id AND p.user_id=w.user_id WHERE w.user_id=?').get(userId);
 return row?{projectId:row.active_project_id,...(readProjectWorkspace(db,userId,row.active_project_id)||{state:null,updatedAt:0}),activeAt:row.updated_at}:{projectId:null,state:null,updatedAt:0,activeAt:0};
}
export function saveWorkspace(db,userId,projectId,input,{activate=false}={}){
 if(typeof projectId!=='string'||!db.prepare('SELECT id FROM projects WHERE id=? AND user_id=?').get(projectId,userId))err(404,'Project not found');
 if(!input||typeof input!=='object'||Array.isArray(input)||input.version!==1)err(400,'A version 1 workspace state is required');
 const state=State.sanitize(input),at=Date.now();
 db.exec('BEGIN IMMEDIATE');
 try{
  db.prepare('INSERT INTO project_workspaces(user_id,project_id,data_json,updated_at) VALUES(?,?,?,?) ON CONFLICT(user_id,project_id) DO UPDATE SET data_json=excluded.data_json,updated_at=excluded.updated_at').run(userId,projectId,JSON.stringify(state),at);
  if(activate)db.prepare('INSERT INTO user_workspaces(user_id,active_project_id,updated_at) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET active_project_id=excluded.active_project_id,updated_at=excluded.updated_at').run(userId,projectId,at);
  db.exec('COMMIT');
 }catch(error){db.exec('ROLLBACK');throw error}
 return {projectId,state,updatedAt:at};
}
