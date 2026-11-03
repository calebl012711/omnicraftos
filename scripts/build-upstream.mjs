import fs from 'node:fs';import path from 'node:path';import {spawnSync,execFileSync}from'node:child_process';import {createHash}from'node:crypto';import {fileURLToPath}from'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');const id=process.argv[2];
const manifest=JSON.parse(fs.readFileSync(path.join(root,'integration/upstream-lock.json'),'utf8'));const repo=manifest.repositories.find(r=>r.id===id);
if(!repo||!['solidcraft','soundcraft','photocraft','vectorcraft','effectcraft','lightcraft','filmcraft'].includes(id))throw Error('Choose solidcraft, soundcraft, photocraft, vectorcraft, effectcraft, lightcraft or filmcraft.');
const checkout=path.join(root,'upstream',id);const head=execFileSync('git',['-C',checkout,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
if(head!==repo.pinnedCommit)throw Error(`Checkout ${head} differs from reviewed pin ${repo.pinnedCommit}`);
if(execFileSync('git',['-C',checkout,'status','--porcelain'],{encoding:'utf8'}).trim())throw Error('Checkout has local edits; review and preserve them before building.');
const env={...process.env,PATH:`${process.env.HOME}/.cargo/bin:${process.env.PATH}`,NO_COLOR:'true',CARGO_BUILD_JOBS:process.env.CARGO_BUILD_JOBS||'1',RAYON_NUM_THREADS:process.env.RAYON_NUM_THREADS||'1'};
const overlay=process.argv.includes('--overlay')?path.join(root,'integration/patches',`${id}-host-chrome.patch`):null;
if(overlay&&!fs.existsSync(overlay))throw Error('No reviewed overlay is available for this component.');
const overlaySha256=overlay?createHash('sha256').update(fs.readFileSync(overlay)).digest('hex'):null;
const started=new Date().toISOString();const trunkDir=path.join(checkout,'apps',`${id}-web`);
const command=fs.existsSync(path.join(trunkDir,'Trunk.toml'))?{cmd:'trunk',args:['build','--release','--dist','../../dist/verified-web'],cwd:trunkDir,out:path.join(checkout,'dist/verified-web')}:{cmd:'cargo',args:['xtask','web'],cwd:checkout,out:path.join(checkout,'target/web/dist')};
const logs=path.join(root,'verification/builds');fs.mkdirSync(logs,{recursive:true});const log=fs.openSync(path.join(logs,`${id}.log`),'w');
console.log(`Building ${id} at ${head}; log: verification/builds/${id}.log`);
if(overlay){execFileSync('git',['-C',checkout,'apply','--check',overlay]);execFileSync('git',['-C',checkout,'apply',overlay]);}
let result,overlayRestoreError;
const scheduled=process.platform==='darwin'?{cmd:'/usr/bin/nice',args:['-n','19','/usr/sbin/taskpolicy','-c','utility',command.cmd,...command.args]}:command;
try{result=spawnSync(scheduled.cmd,scheduled.args,{cwd:command.cwd,env,stdio:['ignore',log,log]});}
finally{fs.closeSync(log);if(overlay)try{execFileSync('git',['-C',checkout,'apply','--reverse',overlay]);}catch(error){overlayRestoreError=error.message;}}
const report={id,repo:repo.upstreamUrl,pin:head,started,finished:new Date().toISOString(),command:[command.cmd,...command.args],exitCode:result.status,error:result.error?.message,overlay:overlay?path.relative(root,overlay):null,overlaySha256,overlayRestoreError,resourcePolicy:{cargoJobs:env.CARGO_BUILD_JOBS,rayonThreads:env.RAYON_NUM_THREADS,nice:process.platform==='darwin'?19:null,qos:process.platform==='darwin'?'utility':null}};
if(result.status!==0){fs.writeFileSync(path.join(logs,`${id}.json`),JSON.stringify(report,null,2));throw Error(`Build failed. Inspect verification/builds/${id}.log`);}
// Stage a complete sibling bundle. No current editor, source pin or deployment is changed.
const destination=path.join(root,'staging',id,head+(overlay?`-omnicraft-${overlaySha256.slice(0,8)}`:''));if(fs.existsSync(destination))throw Error('A stage for this revision already exists; preserve/review it before rebuilding.');
fs.cpSync(command.out,destination,{recursive:true});
for(const filename of fs.readdirSync(checkout))if(/^(LICENSE|NOTICE|ATTRIBUTION|THIRD-PARTY-LICENSES|ASSETS)/.test(filename)&&fs.statSync(path.join(checkout,filename)).isFile())fs.copyFileSync(path.join(checkout,filename),path.join(destination,filename));
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)]);}
report.stagedPath=path.relative(root,destination);report.artifacts=files(destination).map(f=>({file:path.relative(destination,f),bytes:fs.statSync(f).size,sha256:createHash('sha256').update(fs.readFileSync(f)).digest('hex')}));
fs.writeFileSync(path.join(logs,`${id}.json`),JSON.stringify(report,null,2));console.log(`Source build staged at ${report.stagedPath}. Test and review before integrating; nothing was published.`);
