import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {openDatabase} from '../src/database.mjs';
import {readActiveWorkspace,readProjectWorkspace,saveWorkspace} from '../src/workspace.mjs';

const Model=globalThis.ReplotreWorkspaceState;
function fixture(t){const dir=mkdtempSync(path.join(tmpdir(),'replotre-workspace-')),file=path.join(dir,'test.sqlite'),db=openDatabase(file);
 for(const id of ['alice','bob'])db.prepare('INSERT INTO users VALUES(?,?,?,?,?)').run(id,`${id}@example.test`,'salt','hash',1);
 for(const [id,user] of [['a','alice'],['b','alice'],['c','bob']])db.prepare('INSERT INTO projects VALUES(?,?,?,?,?,?,?)').run(id,user,id,'{"clips":[],"texts":[]}',3,1,2);
 t.after(()=>{try{db.close()}catch{}rmSync(dir,{recursive:true,force:true})});return {db,file};
}

test('workspace recovery validates corrupted, future, and unavailable stored settings',()=>{
 for(const raw of [null,'undefined','{','[]','{"state":{"version":2},"updatedAt":1}','x'.repeat(13000)])assert.equal(Model.parse(raw),null);
 const state=Model.sanitize({tool:'<script>',rightTab:'unknown',playhead:Infinity,zoom:-10,viewerZoom:'large',templates:{filter:'invalid',query:'a\u0000b'.repeat(100),view:'broken'},selectedClipId:'../private'});
 assert.equal(state.tool,'media');assert.equal(state.rightTab,'ai');assert.equal(state.playhead,0);assert.equal(state.zoom,.08);assert.equal(state.viewerZoom,'fit');assert.equal(state.templates.filter,'all');assert.equal(state.templates.view,'grid');assert.ok(state.templates.query.length<=120);assert.ok(!state.templates.query.includes('\u0000'));assert.equal(state.selectedClipId,null);
 assert.deepEqual(Model.sanitize(state),state);
});

test('all studio tools and the complete editing context survive serialization',()=>{
 for(const tool of Model.TOOLS){const state=Model.sanitize({tool,rightTab:'properties',mobileSection:'assets',assetsCollapsed:true,rightCollapsed:true,playhead:4.25,zoom:2,viewerZoom:.5,selectedTextId:'text_1',scroll:{assets:320,timeline:145,filters:72},templates:{filter:'captions',query:'Interview',view:'list'}});
  const restored=Model.parse(JSON.stringify({state,updatedAt:12,userId:'alice',projectId:'a'}));assert.deepEqual(restored.state,state);assert.equal(restored.userId,'alice');assert.equal(restored.projectId,'a');
 }
});

test('workspace preferences are private to their owner and project',t=>{const {db}=fixture(t);
 saveWorkspace(db,'alice','a',{version:1,tool:'templates',templates:{query:'Glow'}},{activate:true});
 assert.equal(readProjectWorkspace(db,'alice','a').state.tool,'templates');assert.equal(readProjectWorkspace(db,'alice','b'),null);assert.equal(readProjectWorkspace(db,'bob','a'),null);assert.equal(readActiveWorkspace(db,'bob').projectId,null);
 assert.throws(()=>saveWorkspace(db,'bob','a',{version:1,tool:'media'}),e=>e.status===404);
 assert.throws(()=>saveWorkspace(db,'alice','a',{version:2}),e=>e.status===400);
 assert.equal(readProjectWorkspace(db,'alice','a').state.templates.query,'Glow');
});

test('opening a project is independent of timeline revisions and background workspace saves',t=>{const {db}=fixture(t),before=db.prepare('SELECT * FROM projects WHERE id=?').get('a');
 saveWorkspace(db,'alice','a',{version:1,tool:'templates'},{activate:true});
 saveWorkspace(db,'alice','b',{version:1,tool:'effects'});
 assert.equal(readActiveWorkspace(db,'alice').projectId,'a');assert.deepEqual(db.prepare('SELECT * FROM projects WHERE id=?').get('a'),before);assert.equal(db.prepare('SELECT COUNT(*) n FROM project_revisions').get().n,0);
 saveWorkspace(db,'alice','b',{version:1,tool:'effects'},{activate:true});assert.equal(readActiveWorkspace(db,'alice').projectId,'b');assert.equal(readProjectWorkspace(db,'alice','a').state.tool,'templates');
});

test('project and account deletion remove saved workspace access',t=>{const {db}=fixture(t);
 saveWorkspace(db,'alice','a',{version:1,tool:'templates'},{activate:true});db.prepare('DELETE FROM projects WHERE id=?').run('a');
 assert.equal(readActiveWorkspace(db,'alice').projectId,null);assert.equal(readProjectWorkspace(db,'alice','a'),null);
 saveWorkspace(db,'alice','b',{version:1,tool:'effects'},{activate:true});db.prepare('DELETE FROM users WHERE id=?').run('alice');
 assert.equal(db.prepare('SELECT COUNT(*) n FROM project_workspaces').get().n,0);assert.equal(db.prepare('SELECT COUNT(*) n FROM user_workspaces').get().n,0);
});

test('the active project and workspace survive a database restart',t=>{const {db,file}=fixture(t);
 saveWorkspace(db,'alice','b',{version:1,tool:'templates',playhead:7.5,templates:{filter:'ads',view:'list'}},{activate:true});db.close();
 const reopened=openDatabase(file);try{const saved=readActiveWorkspace(reopened,'alice');assert.equal(saved.projectId,'b');assert.equal(saved.state.tool,'templates');assert.equal(saved.state.playhead,7.5);assert.equal(saved.state.templates.filter,'ads');assert.equal(saved.state.templates.view,'list')}finally{reopened.close()}
});
