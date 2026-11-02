import {execFileSync} from 'node:child_process';import fs from 'node:fs';
const base='verification/recorder/';
function marker(file,t){const d=execFileSync('ffmpeg',['-v','error','-ss',String(t),'-i',base+file,'-frames:v','1','-vf','crop=192:24:0:0','-f','rawvideo','-pix_fmt','rgb24','pipe:1']);let n=0;for(let i=0;i<16;i++)if(d[(12*192+i*12+6)*3]>128)n|=1<<i;return n/10;}
const drifts=[1,30,60].map(t=>({t,screen:marker('screen.webm',t),camera:marker('camera.webm',t)})).map(r=>({...r,delta:r.screen-r.camera}));
function tone(file,hz){const d=execFileSync('ffmpeg',['-v','error','-ss','1','-i',base+file,'-t','1','-vn','-ac','1','-ar','8000','-f','s16le','pipe:1']);let re=0,im=0;for(let i=0;i<d.length/2;i++){const y=d.readInt16LE(i*2)/32768;re+=y*Math.cos(2*Math.PI*hz*i/8000);im+=y*Math.sin(2*Math.PI*hz*i/8000);}return Math.hypot(re,im)/(d.length/2);}
const result={drifts,tones:{screen660:tone('screen.webm',660),screen440:tone('screen.webm',440),camera440:tone('camera.webm',440),camera660:tone('camera.webm',660),mic440:tone('microphone.webm',440)}};
console.log(result);fs.writeFileSync(base+'file-analysis.json',JSON.stringify(result,null,2));
