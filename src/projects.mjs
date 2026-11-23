import {now,err,validateProject,safeName} from './core.mjs';
import {projectPublic} from './database.mjs';

export function assertAssets(db,projectId,data){
 for(const clip of data.clips){
  if(clip.kind==='demo')continue;
  const a=db.prepare('SELECT * FROM assets WHERE id=? AND project_id=?').get(clip.mediaId,projectId);
  if(!a||a.kind!==clip.kind)err(400,'Project references an unavailable or incompatible asset');
  if(a.kind==='video'&&clip.out>a.duration+.1)err(400,'Clip trim exceeds the source footage');
 }
 if(data.music&&!db.prepare("SELECT id FROM assets WHERE id=? AND project_id=? AND kind='audio'").get(data.music.mediaId,projectId))err(400,'Soundtrack asset is unavailable');
}

/** All browser edits, Director edits and restores use the same optimistic lock. */
export function commitProject(db,hub,project,user,data,version,label='Timeline edit',clientId=null){
 validateProject(data);assertAssets(db,project.id,data);
 if(!Number.isInteger(version)||version!==project.version)err(409,'Another session modified this project. Reload before saving.');
 const stamp=now(),name=safeName(data.projectName,120),encoded=JSON.stringify(data);
 db.exec('BEGIN IMMEDIATE');
 try{
  const updated=db.prepare('UPDATE projects SET name=?,data_json=?,version=version+1,updated_at=? WHERE id=? AND user_id=? AND version=?').run(name,encoded,stamp,project.id,user.id,version);
  if(!updated.changes)err(409,'Another session modified this project. Reload before saving.');
  db.prepare('INSERT OR IGNORE INTO project_revisions(project_id,version,label,data_json,created_at) VALUES(?,?,?,?,?)').run(project.id,version,'Previous version',project.data_json,project.updated_at);
  db.prepare('INSERT INTO project_revisions(project_id,version,label,data_json,created_at) VALUES(?,?,?,?,?)').run(project.id,version+1,safeName(label,160),encoded,stamp);
  db.prepare('DELETE FROM project_revisions WHERE project_id=? AND version<?').run(project.id,Math.max(1,version-48));
  db.exec('COMMIT');
 }catch(e){db.exec('ROLLBACK');throw e}
 const saved={...projectPublic(project),name,version:version+1,updatedAt:stamp};
 hub.publish(user.id,'project.updated',{project:saved,label,clientId},project.id);
 return saved;
}
