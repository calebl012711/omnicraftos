import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'integration/upstream-lock.json'),'utf8'));
const command=process.argv[2]||'status';
const id=process.argv.includes('--app')?process.argv[process.argv.indexOf('--app')+1]:null;
if(!['status','check','licenses'].includes(command))throw Error('Read-only commands: status, check, licenses [--app id]. Updates are reviewed manually.');
function git(dir,args){try{return execFileSync('git',['-C',dir,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:15000}).trim();}catch{return null;}}
if(id&&!manifest.repositories.some(repo=>repo.id===id))throw Error(`Unknown upstream component: ${id}`);
const rows=[];
for(const r of manifest.repositories.filter(r=>!id||id===r.id)){
 if(r.status==='blocked'){rows.push({id:r.id,status:'excluded',reason:r.thirdPartyNotes});continue;}
 const checkout=path.join(root,'upstream',r.id); const head=git(checkout,['rev-parse','HEAD']);
 const row={id:r.id,repo:r.upstreamUrl,pin:r.pinnedCommit,head,selectedLicense:r.selectedLicense,localMatches:head===r.pinnedCommit,dirty:git(checkout,['status','--porcelain']),status:r.status};
 if(command==='licenses')row.licenseFiles=(r.licenseFiles||[]).map(file=>({file,exists:fs.existsSync(path.join(checkout,file))}));
 if(command==='check'){
  let remote=null,release=null,error=null;
  try{
   const lines=execFileSync('git',['ls-remote',r.upstreamUrl,`refs/heads/${r.pinnedBranch||'main'}`],{encoding:'utf8',timeout:20000,stdio:['ignore','pipe','pipe']}).trim();
   remote=lines.split(/\s+/)[0]||null;
   if(!remote)error='Remote branch not found';
  }catch(e){error='Remote lookup failed: '+e.message.split('\n')[0];}
  try{
   const response=await fetch(`https://api.github.com/repos/${r.upstreamRepo}/releases/latest`,{signal:AbortSignal.timeout(10000),headers:{Accept:'application/vnd.github+json','User-Agent':'OmniCraftOS-update-check'}});
   if(response.ok){const data=await response.json();release={tag:data.tag_name,url:data.html_url,notes:data.body};}
   else if(response.status!==404)error=[error,`Release lookup HTTP ${response.status}`].filter(Boolean).join('; ');
  }catch(e){error=[error,'Release lookup failed: '+e.message].filter(Boolean).join('; ');}
  Object.assign(row,{remote,release,error,updateState:remote?(remote===r.pinnedCommit?'same-revision':'different-revision-review-required'):'unknown',compareUrl:remote?`${r.upstreamUrl}/compare/${r.pinnedCommit}...${remote}`:null});
 }
 rows.push(row); console.error(`${r.id}: ${command==='check'?row.updateState:row.localMatches?'pin matches':'CHECKOUT MISSING OR DIFFERENT'}${row.dirty?' (local modifications)':''}`);
}
console.log(JSON.stringify({checkedAt:new Date().toISOString(),readOnly:true,command,results:rows},null,2));
if(rows.some(r=>r.error||r.localMatches===false))process.exitCode=1;
