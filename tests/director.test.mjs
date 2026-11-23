import test from 'node:test';
import assert from 'node:assert/strict';
import {applyOperations,captionsForTimeline,subtitleFile,localDirector} from '../src/director.mjs';
import {audioFeatures} from '../src/analysis.mjs';
const clip={id:'one',kind:'video',mediaId:'source',name:'Source',in:0,out:10,speed:1,volume:1,brightness:100,saturation:100};
const project=()=>({projectName:'Measured edit',aspect:'16:9',clips:[{...clip}],texts:[],music:null,script:''});

test('ripple silence edits preserve caption timing and leave the input untouched',()=>{
 const p=project();p.texts=[{id:'text',kind:'caption',text:'After the pause',start:6,duration:1,position:'bottom',color:'#ffffff'}];
 const info=new Map([['source',{analyzedAt:1,hasAudio:true,silences:[{start:2,end:5}]}]]);
 const result=applyOperations(p,[{type:'remove_silence'}],info);assert.equal(p.clips.length,1);assert.equal(result.data.clips.length,2);
 assert.ok(Math.abs(result.data.clips.reduce((n,c)=>n+(c.out-c.in)/c.speed,0)-7.16)<.001);assert.ok(Math.abs(result.data.texts[0].start-3.16)<.001);assert.equal(result.data.texts[0].duration,1);
});
test('transcript captions map source trims and playback speed to timeline time',()=>{
 const p=project();p.clips=[{...clip,in:4,out:8,speed:2},{...clip,id:'two',in:0,out:2}];
 const words=[{word:'outside',start:2,end:3},{word:'This',start:4,end:4.5},{word:'is',start:4.5,end:5},{word:'real',start:5,end:5.5},{word:'speech.',start:5.5,end:6},{word:'Second',start:0,end:.6},{word:'clip.',start:.6,end:1.3}].sort((a,b)=>a.start-b.start);
 const captions=captionsForTimeline(p,new Map([['source',{transcript:{words}}]]));assert.equal(captions[0].text,'This is real speech.');assert.equal(captions[0].start,0);assert.equal(captions[0].duration,1);assert.equal(captions[1].start,2);assert.equal(captions[1].text,'Second clip.');
});
test('captioning skips silent B-roll and preserves its offset before spoken clips',()=>{
 const p=project();p.clips=[{...clip,id:'broll',mediaId:'silent',out:2},{...clip,id:'speech',out:1}];
 const info=new Map([['silent',{hasAudio:false}],['source',{hasAudio:true,transcript:{words:[{word:'Hello',start:0,end:.6}]}}]]);
 const captions=captionsForTimeline(p,info);assert.equal(captions.length,1);assert.equal(captions[0].start,2);assert.equal(captions[0].text,'Hello');
});
test('speed changes retime overlays and captions without extending trim bounds',()=>{
 const p=project();p.texts=[{id:'title',kind:'title',text:'At two seconds',start:2,duration:2,position:'center',color:'#ffffff'}];
 const {data}=applyOperations(p,[{type:'set_speed',clipId:'one',value:2}]);assert.equal(data.texts[0].start,1);assert.equal(data.texts[0].duration,1);
 const trimmed=applyOperations(data,[{type:'trim_clip',clipId:'one',duration:2}]).data;assert.equal(trimmed.clips[0].out,4);assert.equal(trimmed.texts[0].duration,1);
});
test('invalid compound plans are atomic, unsupported edits and missing analysis fail',()=>{
 const p=project();assert.throws(()=>applyOperations(p,[{type:'set_aspect',value:'1:1'},{type:'set_speed',value:0}]),/Invalid speed/);assert.equal(p.aspect,'16:9');
 assert.throws(()=>applyOperations(p,[{type:'remove_silence'}]),/Analyze/);assert.throws(()=>applyOperations(p,[{type:'auto_captions'}]),/Transcribe/);
 assert.throws(()=>applyOperations(p,[{type:'run_shell',value:'untrusted'}]),/Unsupported/);
});
test('scene cuts and beat edits remain inside source bounds',()=>{
 const p=project();p.music={mediaId:'music',volume:.3,start:0};const info=new Map([['source',{analyzedAt:1,scenes:[{start:0,end:3},{start:3,end:7},{start:7,end:10}]}],['music',{analyzedAt:1,beats:[.5,1,2,3,4,5,6,7,8,9,9.5]}]]);
 const scenes=applyOperations(p,[{type:'split_scenes'}],info).data;assert.deepEqual(scenes.clips.map(c=>[c.in,c.out]),[[0,3],[3,7],[7,10]]);
 const synced=applyOperations(scenes,[{type:'beat_sync'}],info).data;assert.ok(synced.clips.every(c=>c.out>c.in&&c.out<=10));
 const highlight=applyOperations(p,[{type:'highlights',duration:5}],info).data;assert.equal(highlight.clips.reduce((n,c)=>n+(c.out-c.in)/c.speed,0),5);
});
test('measured audio features detect real quiet intervals and periodic onsets',()=>{
 const energies=Array.from({length:500},(_,i)=>i%50<20?.2:0);const info=audioFeatures(energies,10);
 assert.equal(info.waveform.length,160);assert.ok(info.silences.length>=9);assert.ok(info.beats.length>=8);assert.equal(info.bpm,60);assert.ok(info.waveform.some(v=>v===0));assert.ok(info.waveform.some(v=>v===1));
});
test('subtitle downloads use millisecond-accurate timeline times',()=>{
 const p=project();p.texts=[{id:'cc',kind:'caption',text:'Real speech',start:1.234,duration:1.1,position:'bottom',color:'#ffffff'}];
 assert.match(subtitleFile(p,'srt'),/00:00:01,234 --> 00:00:02,334/);assert.match(subtitleFile(p,'vtt'),/^WEBVTT\n\n1\n00:00:01\.234/);
});
test('local Director preserves basic title, color and positioning commands without a provider',()=>{
 const p=project(),plan=localDirector('Add a title saying Launch day',p);let data=applyOperations(p,plan.operations).data;assert.equal(data.texts[0].text,'Launch day');
 data=applyOperations(data,localDirector('Make the text yellow and move it to the top',data).operations).data;assert.equal(data.texts[0].color,'#ffe074');assert.equal(data.texts[0].position,'top');
 data=applyOperations(data,localDirector('Delete the title',data).operations).data;assert.equal(data.texts.length,0);
 assert.deepEqual(localDirector('Remove silence and add captions',p).operations.map(o=>o.type),['remove_silence','auto_captions']);
});
