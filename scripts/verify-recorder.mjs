import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
const root=process.cwd();
const output=path.resolve(process.env.CAPTURE_OUTPUT || path.join(root,'verification/recorder')); await fs.mkdir(output,{recursive:true});
const base=process.env.OMNICRAFT_URL || 'http://127.0.0.1:5173';
const seconds=Number(process.env.CAPTURE_SECONDS || 62);const format=process.env.CAPTURE_FORMAT||'webm';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required','--disable-background-timer-throttling','--disable-renderer-backgrounding']});
const report={at:new Date().toISOString(),environment:'Chrome headless; synthetic MediaStreams injected at device boundary; real MediaRecorder and browser storage',physicalDevicesTested:false,seconds,tests:{}};
async function harness(page,{deny=false,low=false}={}) {
  await page.addInitScript(({deny,low})=>{
    const sources={}; window.testSources=sources;
    if(low) navigator.storage.estimate=async()=>({quota:10000000,usage:9999999});
    function video(kind){
      const c=document.createElement('canvas');c.width=640;c.height=360;const ctx=c.getContext('2d');
      const begin=window.patternBegin ||= performance.now();
      const draw=()=>{const time=Math.floor((performance.now()-begin)/100);ctx.fillStyle=kind==='screen'?'#c53030':'#2059c5';ctx.fillRect(0,0,640,360);ctx.fillStyle='white';ctx.font='28px sans-serif';ctx.fillText(kind.toUpperCase()+' '+time,45,180);for(let i=0;i<16;i++){ctx.fillStyle=(time>>i)&1?'white':'black';ctx.fillRect(i*12,0,12,24);} };
      draw();const timer=setInterval(draw,33);window.addEventListener('pagehide',()=>clearInterval(timer));
      return c.captureStream(30);
    }
    function audio(hz){const a=new AudioContext();const o=a.createOscillator();o.frequency.value=hz;const gain=a.createGain();gain.gain.value=.1;const d=a.createMediaStreamDestination();o.connect(gain).connect(d);o.start();window.addEventListener('pagehide',()=>a.close());return d.stream;}
    navigator.mediaDevices.getDisplayMedia=async()=>{if(deny)throw new DOMException('Test permission denied','NotAllowedError');const v=video('screen');const a=audio(660);sources.screen=new MediaStream([...v.getVideoTracks(),...a.getAudioTracks()]);return sources.screen;};
    navigator.mediaDevices.getUserMedia=async opts=>{if(deny)throw new DOMException('Test permission denied','NotAllowedError');const v=video('camera');const a=audio(440);sources.camera=new MediaStream([...v.getVideoTracks(),...(opts.audio?a.getAudioTracks():[])]);return sources.camera;};
  },{deny,low});
  await page.goto(base+'/?tool=recorder');
}
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function connect(page){await page.getByRole('button',{name:'Choose screen or window',exact:true}).click();await page.getByRole('button',{name:'Connect camera & microphone',exact:true}).click();}
async function download(page,button,name){const promise=page.waitForEvent('download');await button.click();const d=await promise;const dest=path.join(output,name||d.suggestedFilename());await d.saveAs(dest);return dest;}
function probe(file){return JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-show_format','-of','json',file],{encoding:'utf8'}));}
function marker(file,t){const data=execFileSync('ffmpeg',['-v','error','-ss',String(t),'-i',file,'-frames:v','1','-vf','crop=192:24:0:0','-f','rawvideo','-pix_fmt','rgb24','pipe:1']);assert.ok(data.length>=192*24*3);let n=0;for(let i=0;i<16;i++)if(data[(12*192+i*12+6)*3]>128)n|=1<<i;return n/10;}
function tone(file,hz){const data=execFileSync('ffmpeg',['-v','error','-ss','1','-i',file,'-t','1','-vn','-ac','1','-ar','8000','-f','s16le','pipe:1']);let re=0,im=0;for(let i=0;i<data.length/2;i++){const y=data.readInt16LE(i*2)/32768;re+=y*Math.cos(2*Math.PI*hz*i/8000);im+=y*Math.sin(2*Math.PI*hz*i/8000);}return Math.hypot(re,im)/(data.length/2);}
try {
 const context=await browser.newContext({viewport:{width:1280,height:900},acceptDownloads:true}); const page=await context.newPage();
 await harness(page);await connect(page); await page.getByLabel('Video format',{exact:true}).selectOption(format);
 await page.getByRole('button',{name:'Start recording',exact:true}).click();await page.getByRole('status').filter({hasText:/^recording$/}).waitFor({timeout:15000});
 console.log('Real MediaRecorder capture started for',seconds,'seconds');
 const samples=[];
 for(let elapsed=0;elapsed<seconds;elapsed+=5){await wait(Math.min(5,seconds-elapsed)*1000);const metrics=await page.evaluate(()=>({heap:performance.memory?.usedJSHeapSize,at:Date.now(),state:document.querySelector('.capture-state')?.textContent,error:document.querySelector('[role=alert]')?.textContent}));if(metrics.state!=='recording')throw Error('Capture stopped early: '+JSON.stringify(metrics));samples.push(metrics);if(Math.min(elapsed+5,seconds)%60===0||elapsed+5>=seconds)console.log('capture seconds',Math.min(elapsed+5,seconds));}
 await page.getByRole('button',{name:'Stop & save',exact:true}).click();await page.getByRole('status').filter({hasText:/^complete$/}).waitFor({timeout:30000});
 const files={};for(const kind of ['screen','camera','microphone'])files[kind]=await download(page,page.getByRole('button',{name:'Download '+kind,exact:true}).first(),undefined);
 const sync=await download(page,page.getByRole('button',{name:'Download sync JSON',exact:true}).first(),'sync.json');
 const manifest=JSON.parse(await fs.readFile(sync,'utf8'));const probes=Object.fromEntries(Object.entries(files).map(([k,f])=>[k,probe(f)]));
 assert.equal(manifest.state,'complete');assert.ok(manifest.durationMs>seconds*1000-1000);
 for(const kind of ['screen','camera']){assert.ok(probes[kind].streams.some(s=>s.codec_type==='video'));assert.ok(manifest.files.find(f=>f.kind===kind).chunks>=2);}
 const drifts=[1,Math.floor(seconds/2),seconds-2].map(t=>({t,screen:marker(files.screen,t),camera:marker(files.camera,t)})).map(v=>({...v,delta:v.screen-v.camera}));
 assert.ok(drifts.every(v=>Math.abs(v.delta)<.25));
 const screen660=tone(files.screen,660),screen440=tone(files.screen,440),camera440=tone(files.camera,440),camera660=tone(files.camera,660),mic440=tone(files.microphone,440);
 assert.ok(screen660>screen440*10 && camera440>camera660*10 && mic440>.01);
 report.tests.encodedFiles={passed:true,files,manifest,drifts,tones:{screen660,screen440,camera440,camera660,mic440},probes,heapSamples:samples};await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));for(const button of await page.getByRole('button',{name:'Check playback',exact:true}).all())await button.click({timeout:120000});
 await page.waitForFunction(()=>[...document.querySelectorAll('.capture-files video,.capture-files audio')].length===3 && [...document.querySelectorAll('.capture-files video,.capture-files audio')].every(v=>v.readyState>=2));
 await page.screenshot({path:path.join(output,'saved-take.png'),fullPage:true});
 await page.reload();await page.getByRole('button',{name:'Download screen',exact:true}).first().waitFor();
 report.tests.capture={passed:true,files,manifest,drifts,tones:{screen660,screen440,camera440,camera660,mic440},probes,heapSamples:samples,reopened:true,independentPlayback:true};
 console.log('60+ second files, distinct sources, audio routing, alignment and reload passed');
 // A second take exercises pause/resume and source termination without overwriting take one.
 await connect(page); await page.getByLabel('Video format',{exact:true}).selectOption(format);
 await page.getByRole('button',{name:'Start recording',exact:true}).click();await page.getByRole('status').filter({hasText:/^recording$/}).waitFor();await wait(2200);
 await page.getByRole('button',{name:'Pause both',exact:true}).click();await wait(1000);await page.getByRole('button',{name:'Resume both',exact:true}).click();await wait(2200);
 await page.evaluate(()=>window.testSources.screen.getVideoTracks()[0].dispatchEvent(new Event('ended')));
 await page.getByRole('status').filter({hasText:/^complete$/}).waitFor();assert.match(await page.getByRole('alert').textContent(),/disconnected/);
 const pauseSync=await download(page,page.getByRole('button',{name:'Download sync JSON',exact:true}).first(),'pause-sync.json');const pm=JSON.parse(await fs.readFile(pauseSync,'utf8'));assert.ok(pm.events.some(e=>e.type==='pause'));assert.ok(pm.events.some(e=>e.type==='resume'));assert.equal(pm.state,'interrupted');report.tests.pauseAndEnded={passed:true,manifest:pm};
 // Crash/reload while recording: recover disk chunks, never call them a finished take.
 await page.reload();await connect(page);await page.getByLabel('Video format',{exact:true}).selectOption(format);await page.getByRole('button',{name:'Start recording',exact:true}).click();await page.getByRole('status').filter({hasText:/^recording$/}).waitFor();await wait(3500);await page.reload();
 await page.getByText('Recovered saved chunks.',{exact:false}).first().waitFor();report.tests.interruptionRecovery={passed:true};
 await context.close();
 for(const mode of ['denial','storage']){const ctx=await browser.newContext();const p=await ctx.newPage();await harness(p,{deny:mode==='denial',low:mode==='storage'});await connect(p);if(mode==='storage'){await p.getByRole('button',{name:'Start recording',exact:true}).click();await p.getByRole('status').filter({hasText:/^complete$/}).waitFor();}const error=await p.getByRole('alert').textContent();assert.match(error,mode==='denial'?/denied/:/storage.*full/i);assert.equal(await p.getByRole('button',{name:'Download screen',exact:true}).count(),0);report.tests[mode]={passed:true,error};await ctx.close();}
 report.passed=true;
} catch(e){report.passed=false;report.error=e.stack;console.error(e);process.exitCode=1;}
finally{await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));await browser.close();}
