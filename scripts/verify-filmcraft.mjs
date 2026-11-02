import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const base=process.env.OMNICRAFT_URL||'http://127.0.0.1:5173';const out=path.resolve('verification/filmcraft');await fs.mkdir(out,{recursive:true});
const report={at:new Date().toISOString(),tests:{}};
const b=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding','--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']});
const watchdog=setTimeout(()=>{console.error('Workflow deadline reached; closing test browser');void b.close();},600000);
try{
 const v=await b.newPage({viewport:{width:1280,height:850}});v.setDefaultTimeout(90000);v.on('console',m=>{if(m.text().startsWith('verify:'))console.log(m.text());});await v.goto(base+'/editors/filmcraft/index.html?webgl=1&fresh=1&empty=1&norecover=1',{waitUntil:'commit'});await v.waitForFunction(()=>!!window.filmcraft,null,{polling:250,timeout:120000});
 const film=await v.evaluate(async origin=>{
  const fc=window.filmcraft;const original=fc.execute.bind(fc);fc.execute=async(c,p)=>{console.log('verify: '+c);const r=await original(c,p);console.log('verify: done '+c);return r;};await fc.execute('file.newProject',{});const imported=await fc.importUrl(origin+'/sample-assets/mosaic-test-clip.mp4','test.mp4');
  if(imported?.errors?.length)throw Error(JSON.stringify(imported.errors));const item=imported.items?.[0]||imported.id||imported;
  await fc.execute('file.newSequence',{name:'OmniCraft verification',width:640,height:360,fps:30});await fc.execute('timeline.place',{item,videoTrack:'V1',audioTrack:'A1',seconds:0});
  const before=await fc.execute('sequence.inspect',{});await fc.execute('playhead.set',{seconds:1.5});await fc.execute('sequence.addEditAllTracks',{});
  await fc.execute('file.saveAs',{path:'/omnicraft-verification.fcproj'});const bytes=await fc.readFile('/omnicraft-verification.fcproj');
  await fc.execute('file.newProject',{});await fc.execute('file.open',{path:'/omnicraft-verification.fcproj'});const reopened=await fc.execute('sequence.inspect',{});
  let exportResult;try{exportResult=await fc.execute('file.exportMedia',{format:'h264',path:'/exports/omnicraft-verification.mp4'});}catch(e){exportResult={error:String(e)};}
  return {imported,before,reopened,bytes:Array.from(new Uint8Array(bytes)),exportResult};
 },base);
 assert.equal(film.before.video[0].items.length,1);assert.equal(film.reopened.video[0].items.length,2);assert.ok(film.bytes.length>100);await fs.writeFile(path.join(out,'edit.fcproj'),new Uint8Array(film.bytes));delete film.bytes;
 report.tests.filmcraft={passed:true,projectSaveReopen:true,...film,videoExportVerified:false};await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log('FilmCraft real MP4 import, cut, project save and reopen passed',JSON.stringify(film.exportResult));
 // Wait for an actual exported file, rather than an opened export dialog.
 try{await v.waitForFunction(async()=>{const files=await window.filmcraft.files();return files.some(f=>f.path==='/exports/omnicraft-verification.mp4'&&f.size>1000);},null,{timeout:240000,polling:250});
 const bytes=await v.evaluate(async()=>Array.from(new Uint8Array(await window.filmcraft.readFile('/exports/omnicraft-verification.mp4'))));const target=path.join(out,'edit.mp4');await fs.writeFile(target,new Uint8Array(bytes));const media=JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-show_format','-of','json',target],{encoding:'utf8'}));assert.ok(media.streams.some(s=>s.codec_type==='video'));assert.ok(Number(media.format.duration)>2);report.tests.filmcraft.videoExportVerified=true;report.tests.filmcraft.exportProbe=media;console.log('FilmCraft exported MP4 independently decoded by ffprobe');
 }catch(e){report.tests.filmcraft.videoExportError=String(e);console.log('FilmCraft video export NOT VERIFIED',String(e).slice(0,300));}
 try{await v.screenshot({path:path.join(out,'filmcraft.png'),timeout:15000});}catch(e){report.tests.filmcraft.screenshotError=String(e);}await v.close();report.passed=Object.values(report.tests).every(t=>t.passed);
}catch(e){report.passed=false;report.error=e.stack;console.error(e);process.exitCode=1;}
finally{clearTimeout(watchdog);await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));await b.close();}
