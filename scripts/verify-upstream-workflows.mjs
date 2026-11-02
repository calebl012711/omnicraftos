import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const base=process.env.OMNICRAFT_URL||'http://127.0.0.1:5173';const out=path.resolve('verification/upstream');await fs.mkdir(out,{recursive:true});
const report={at:new Date().toISOString(),tests:{}};
const b=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding','--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']});
const watchdog=setTimeout(()=>{console.error('Workflow deadline reached; closing test browser');void b.close();},600000);
try{
 const p=await b.newPage({viewport:{width:1280,height:850}});p.setDefaultTimeout(90000);p.on('pageerror',e=>console.log('PAGE ERROR',e.stack));p.on('console',m=>{if(m.text().startsWith('verify:'))console.log(m.text());});
 await p.goto(base+'/editors/solidcraft/workspace.html?webgl=1',{waitUntil:'commit'});console.log('verify: page committed',p.url());let ready=false;for(let i=0;i<120;i++){ready=await p.evaluate(()=>!!window.solidcraft);if(ready)break;if(i%10===0)console.log('verify: waiting for engine',await p.evaluate(()=>({body:document.body?.innerText.slice(0,300),readyState:document.readyState})));await new Promise(r=>setTimeout(r,1000));}if(!ready)throw Error('SolidCraft API did not start');
 const cad=await p.evaluate(async()=>{
  const sc=window.solidcraft; const original=sc.execute.bind(sc); sc.execute=async(c,p)=>{console.log('verify: '+c);const r=await original(c,p);console.log('verify: done '+c);return r;};console.log('verify: initial inspect');const initial=await sc.inspect();if(initial.timeline?.length)throw Error('Unexpected nonempty test design');
  await sc.execute('file.new',{name:'OmniCraft verification plate'});
  await sc.execute('sketch.create',{plane:'XY',name:'Base'});await sc.execute('sketch.rectangle.two_point',{p0:[-30,-30],p1:[30,30]});await sc.execute('sketch.finish',{});await sc.execute('solid.extrude',{distance:8});
  const before=await sc.execute('inspect.measure',{});
  await sc.execute('sketch.create',{plane:'XY',name:'Bores'});await sc.execute('sketch.circle.center',{center:[0,0],radius:11});
  for(const center of [[-20,-20],[20,-20],[20,20],[-20,20]])await sc.execute('sketch.circle.center',{center,radius:2.5});
  await sc.execute('sketch.finish',{});await sc.execute('solid.extrude',{distance:8,operation:'cut'});
  const after=await sc.execute('inspect.measure',{});const state=await sc.inspect();
  await sc.execute('file.save',{path:'/opfs/omnicraft-verification.sc'});await sc.execute('file.new',{name:'Empty'});await sc.execute('doc.open',{path:'/opfs/omnicraft-verification.sc'});const reopened=await sc.inspect();
  await sc.execute('file.export',{path:'/opfs/omnicraft-verification.stl',format:'stl'});await sc.execute('file.export',{path:'/opfs/omnicraft-verification.step'});
  const root=await navigator.storage.getDirectory();const files={};for(const ext of ['sc','stl','step']){let file;const deadline=performance.now()+30000;while(performance.now()<deadline){try{file=await(await root.getFileHandle('omnicraft-verification.'+ext)).getFile();if(file.size>100)break;}catch{}await new Promise(r=>setTimeout(r,100));}if(!file||file.size<100)throw Error('Export did not finish writing: '+ext);files[ext]=Array.from(new Uint8Array(await file.arrayBuffer()));}
  return {before,after,state,reopened,files};
 });
 for(const [ext,data]of Object.entries(cad.files))await fs.writeFile(path.join(out,'plate.'+ext),new Uint8Array(data));delete cad.files;
 assert.equal(cad.reopened.bodies.length,1);assert.ok(cad.state.timeline.every(t=>!t.error));
 const expected=(60*60-Math.PI*(11*11+4*2.5*2.5))*8;const volume=cad.after.total.volume_mm3;assert.ok(Math.abs(volume-expected)/expected<0.0001,`Volume ${volume} vs expected ${expected}`);assert.ok(Math.abs(cad.before.total.volume_mm3-28800)<.05);
 const stl=await fs.readFile(path.join(out,'plate.stl'));const triangles=stl.readUInt32LE(80);assert.equal(stl.length,84+triangles*50);assert.ok(triangles>100);
 // Independent mesh reader: bounds and signed volume from binary triangles, no engine calls.
 let sv=0;const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
 for(let i=0;i<triangles;i++){const v=[];for(let j=0;j<3;j++){const point=[];for(let k=0;k<3;k++){const x=stl.readFloatLE(84+i*50+12+j*12+k*4);min[k]=Math.min(min[k],x);max[k]=Math.max(max[k],x);point.push(x);}v.push(point);}const[a,c,d]=v;sv+=(a[0]*(c[1]*d[2]-c[2]*d[1])+a[1]*(c[2]*d[0]-c[0]*d[2])+a[2]*(c[0]*d[1]-c[1]*d[0]))/6;}
 assert.ok(Math.abs(Math.abs(sv)-expected)/expected<.002);assert.deepEqual(min,[-30,-30,0]);assert.deepEqual(max,[30,30,8]);
 const step=await fs.readFile(path.join(out,'plate.step'),'utf8');assert.match(step,/ISO-10303-21;/);assert.match(step,/MANIFOLD_SOLID_BREP/);assert.match(step,/CYLINDRICAL_SURFACE/);
 await p.screenshot({path:path.join(out,'solidcraft.png')});report.tests.solidcraft={passed:true,...cad,expectedVolumeMm3:expected,mesh:{triangles,volumeMm3:Math.abs(sv),min,max},stepBytes:step.length};await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log('CAD body, actual volume, native reload, STL mesh and STEP export passed');await p.close();
 const v=await b.newPage({viewport:{width:1280,height:850}});v.setDefaultTimeout(90000);await v.goto(base+'/editors/filmcraft/index.html?webgl=1&fresh=1&empty=1&norecover=1',{waitUntil:'commit'});await v.waitForFunction(()=>!!window.filmcraft,null,{polling:250,timeout:120000});
 const film=await v.evaluate(async origin=>{
  const fc=window.filmcraft;await fc.execute('file.newProject',{});const imported=await fc.importUrl(origin+'/sample-assets/mosaic-test-clip.mp4','test.mp4');
  if(imported?.errors?.length)throw Error(JSON.stringify(imported.errors));const item=imported.items?.[0]||imported.id||imported;
  await fc.execute('file.newSequence',{name:'OmniCraft verification',width:640,height:360,fps:30});await fc.execute('timeline.place',{item,videoTrack:'V1',audioTrack:'A1',seconds:0});
  const before=await fc.execute('sequence.inspect',{});await fc.execute('playhead.set',{seconds:1.5});await fc.execute('sequence.addEditAllTracks',{});
  await fc.execute('file.saveAs',{path:'/omnicraft-verification.fcproj'});const bytes=await fc.readFile('/omnicraft-verification.fcproj');
  await fc.execute('file.newProject',{});await fc.execute('file.open',{path:'/omnicraft-verification.fcproj'});const reopened=await fc.execute('sequence.inspect',{});
  let exportResult;try{exportResult=await fc.execute('file.exportMedia',{format:'h264',path:'/exports/omnicraft-verification.mp4'});}catch(e){exportResult={error:String(e)};}
  return {imported,before,reopened,bytes:Array.from(new Uint8Array(bytes)),exportResult};
 },base);
 assert.equal(film.before.video[0].items.length,1);assert.equal(film.reopened.video[0].items.length,2);assert.ok(film.bytes.length>100);await fs.writeFile(path.join(out,'edit.fcproj'),new Uint8Array(film.bytes));delete film.bytes;
 await v.screenshot({path:path.join(out,'filmcraft.png')});report.tests.filmcraft={passed:true,projectSaveReopen:true,...film,videoExportVerified:false};console.log('FilmCraft real MP4 import, cut, project save and reopen passed',JSON.stringify(film.exportResult));
 // Wait for an actual exported file, rather than an opened export dialog.
 try{await v.waitForFunction(async()=>{const files=await window.filmcraft.files();return files.some(f=>f.path==='/exports/omnicraft-verification.mp4'&&f.size>1000);},null,{timeout:90000});
 const bytes=await v.evaluate(async()=>Array.from(new Uint8Array(await window.filmcraft.readFile('/exports/omnicraft-verification.mp4'))));const target=path.join(out,'edit.mp4');await fs.writeFile(target,new Uint8Array(bytes));const media=JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-show_format','-of','json',target],{encoding:'utf8'}));assert.ok(media.streams.some(s=>s.codec_type==='video'));assert.ok(Number(media.format.duration)>2);report.tests.filmcraft.videoExportVerified=true;report.tests.filmcraft.exportProbe=media;console.log('FilmCraft exported MP4 independently decoded by ffprobe');
 }catch(e){report.tests.filmcraft.videoExportError=String(e);console.log('FilmCraft video export NOT VERIFIED',String(e).slice(0,300));}
 await v.close();report.passed=Object.values(report.tests).every(t=>t.passed);
}catch(e){report.passed=false;report.error=e.stack;console.error(e);process.exitCode=1;}
finally{clearTimeout(watchdog);await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));await b.close();}
