import {chromium} from '@playwright/test';import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {execFileSync}from'node:child_process';
const out=path.resolve('verification/music');await fs.mkdir(out,{recursive:true});const base=process.env.OMNICRAFT_URL||'http://127.0.0.1:4173';const report={at:new Date().toISOString(),source:'Waveform Playlist actual npm runtime',physicalMicrophone:false,audioOutput:'Silent software sink; physical speaker not tested',tests:{}};
// Generate deterministic inputs so verification also works in a fresh checkout.
for (const [name, frequency] of [['tone-a.wav', 440], ['tone-b.wav', 660]]) execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', `sine=frequency=${frequency}:sample_rate=48000:duration=2.1`, '-c:a', 'pcm_s16le', path.join(out, name)]);
function audioStats(file, start, channels=2) {
 const pcm=execFileSync('ffmpeg',['-v','error','-ss',String(start),'-i',file,'-t','0.5','-ar','48000','-ac',String(channels),'-f','f32le','-acodec','pcm_f32le','pipe:1']);
 return Array.from({length:channels},(_,channel)=>{
  let squares=0, peak=0; const count=pcm.length/4/channels;
  for(let i=0;i<count;i++){const value=pcm.readFloatLE((i*channels+channel)*4);squares+=value*value;peak=Math.max(peak,Math.abs(value));}
  return {rms:Math.sqrt(squares/count),peak};
 });
}
const b=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required','--disable-background-timer-throttling','--disable-renderer-backgrounding']});const timeout=setTimeout(()=>b.close(),240000);
let p;try{p=await b.newPage({acceptDownloads:true,viewport:{width:1440,height:1000}});p.on('pageerror',e=>console.log('ERROR',e.message,e.stack));p.on('console',m=>{if(m.type()==='error')console.log('CONSOLE ERROR',m.text());});
await p.addInitScript(()=>{const Native=window.AudioContext;window.AudioContext=class extends Native{constructor(options){super({...options,sinkId:{type:'none'}})}};navigator.mediaDevices.getUserMedia=async()=>{const ctx=new AudioContext();const osc=ctx.createOscillator();osc.frequency.value=330;const gain=ctx.createGain();gain.gain.value=.15;const dest=ctx.createMediaStreamDestination();osc.connect(gain).connect(dest);osc.start();return dest.stream;};});
await p.goto(base+'/?tool=music',{waitUntil:'commit'});await p.getByRole('heading',{name:'Start with a sound.'}).waitFor({timeout:90000});
await p.getByLabel('Music project name',{exact:true}).fill('Verified music project');await p.getByLabel('Import music audio',{exact:true}).setInputFiles([path.join(out,'tone-a.wav'),path.join(out,'tone-b.wav')]);await p.getByRole('status').filter({hasText:/Imported 2 audio tracks/}).waitFor({timeout:90000});
await p.getByRole('button',{name:'Play',exact:true}).click();await p.getByText('Playing',{exact:true}).waitFor();await new Promise(r=>setTimeout(r,500));try{await p.getByRole('button',{name:'Stop',exact:true}).click({timeout:1000});}catch{assert.equal(await p.getByText('Stopped',{exact:true}).count(),1,'Playback did not stop or auto-complete');}
await p.getByLabel('Start tone-a.wav clip 1',{exact:true}).fill('1');
await p.getByLabel('Volume tone-a.wav',{exact:true}).fill('0.5');
await p.getByLabel('Pan tone-a.wav',{exact:true}).fill('-1');
await p.getByRole('button',{name:'Mute tone-b.wav',exact:true}).click();
await p.getByLabel('Tempo BPM',{exact:true}).fill('90');
console.log('Loaded tracks; played; moved first clip to 1 s; volume .5, pan left, muted second track');console.log((await p.locator('body').innerText()).slice(-2800));console.log('sliders',await p.getByRole('slider').evaluateAll(els=>els.map(e=>({label:e.getAttribute('aria-label'),title:e.title,value:e.value}))));
await p.getByRole('button',{name:'Save project',exact:true}).click();await p.getByRole('status').filter({hasText:/Saved audio/}).waitFor();
let dl=p.waitForEvent('download');await p.getByRole('button',{name:'Download project backup',exact:true}).click();await(await dl).saveAs(path.join(out,'project.omnimusic'));
dl=p.waitForEvent('download');await p.getByRole('button',{name:'Export WAV mix',exact:true}).click();await(await dl).saveAs(path.join(out,'mix.wav'));
const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-show_format','-of','json',path.join(out,'mix.wav')],{encoding:'utf8'}));assert.ok(probe.streams.some(s=>s.codec_name==='pcm_s16le'));assert.ok(Number(probe.format.duration)>3);assert.equal(probe.streams[0].channels,2);
const sourceRms=audioStats(path.join(out,'tone-a.wav'),.2,1)[0].rms;
const silence=audioStats(path.join(out,'mix.wav'),.2), panned=audioStats(path.join(out,'mix.wav'),1.2);
assert.ok(silence.every(c=>c.peak<1/32768),'Clip start offset must leave initial silence');
assert.ok(Math.abs(panned[0].rms/sourceRms-.5)<.01,'Hard-left mono export must preserve the .5 gain setting');
assert.ok(panned[1].peak<2/32768,'Hard-left export must silence the right channel');
const portable=JSON.parse(await fs.readFile(path.join(out,'project.omnimusic'),'utf8'));assert.equal(portable.tracks.length,2);assert.equal(portable.bpm,90);assert.equal(portable.tracks[0].clips[0].startSample,48000);assert.equal(portable.tracks[0].volume,.5);assert.equal(portable.tracks[0].pan,-1);assert.equal(portable.tracks[1].muted,true);assert.ok(portable.tracks.every(t=>t.clips[0].channels[0].pcmFloat32Base64));
// Solo a different known source; check actual exported samples, not just stored settings.
await p.getByRole('button',{name:'Mute tone-b.wav',exact:true}).click();
await p.getByRole('button',{name:'Solo tone-b.wav',exact:true}).click();
await p.getByLabel('Volume tone-b.wav',{exact:true}).fill('0.25');
await p.getByLabel('Pan tone-b.wav',{exact:true}).fill('1');
dl=p.waitForEvent('download');await p.getByRole('button',{name:'Export WAV mix',exact:true}).click();await(await dl).saveAs(path.join(out,'solo.wav'));
const solo=audioStats(path.join(out,'solo.wav'),1.2), soloSource=audioStats(path.join(out,'tone-b.wav'),.2,1)[0].rms;
assert.ok(solo[0].peak<2/32768,'Soloed hard-right track must silence the left-panned non-solo track');
assert.ok(Math.abs(solo[1].rms/soloSource-.25)<.01,'Soloed right channel must preserve .25 gain');
report.tests.mix={passed:true,sourceRms,soloSource,silence,panned,solo};await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));
await p.reload({waitUntil:'commit'});await p.getByLabel('Reopen music project',{exact:true}).selectOption('Verified music project');await p.getByRole('status').filter({hasText:/Project reopened with its audio/}).waitFor();
assert.equal(await p.getByLabel('Pan tone-a.wav',{exact:true}).inputValue(),'-1');assert.equal(await p.getByLabel('Start tone-a.wav clip 1',{exact:true}).inputValue(),'1');await p.getByRole('button',{name:'Add recording track',exact:true}).click();await p.getByRole('button',{name:'Connect microphone',exact:true}).click();await p.getByRole('button',{name:'Record selected track',exact:true}).click();await p.getByRole('button',{name:'Stop microphone recording',exact:true}).waitFor();await new Promise(r=>setTimeout(r,2200));await p.getByRole('button',{name:'Stop microphone recording',exact:true}).click();await p.getByLabel('Start Audio 3 clip 1',{exact:true}).waitFor({timeout:30000});
await p.getByRole('button',{name:'Save project',exact:true}).click();await p.getByRole('status').filter({hasText:/Saved audio/}).waitFor();dl=p.waitForEvent('download');await p.getByRole('button',{name:'Download project backup',exact:true}).click();await(await dl).saveAs(path.join(out,'recorded-project.omnimusic'));
const recorded=JSON.parse(await fs.readFile(path.join(out,'recorded-project.omnimusic'),'utf8'));assert.equal(recorded.tracks.length,3);assert.ok(recorded.tracks[2].clips.length>0,'Recorded audio clip missing');assert.ok(recorded.tracks[2].clips[0].durationSamples>48000);
await p.screenshot({path:path.join(out,'music.png'),fullPage:true});report.tests.audio={passed:true,importedTracks:2,projectTracksAfterRecording:recorded.tracks.length,playback:true,persistence:true,portableBackup:true,syntheticMicrophone:true,mixerAndArrangementPersistence:true,exportedSamples:{silence,panned,solo,sourceRms,soloSource},wav:probe};report.passed=true;
}catch(e){report.passed=false;report.error=e.stack;try{report.errorBody=(await p.locator('body').innerText()).slice(0,6000);await p.screenshot({path:path.join(out,'failure.png'),timeout:5000});}catch{}console.error(e);process.exitCode=1;}finally{clearTimeout(timeout);await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));await b.close();}
