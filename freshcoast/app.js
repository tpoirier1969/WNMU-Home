(()=>{
"use strict";
const DATA=window.FRESH_COAST_DATA||{viewers:[],films:{},blocks:[]};
const SB_URL="https://tdepltlnughyfrjqufdg.supabase.co";
const SB_KEY="sb_publishable_oz-1MPs6ix3grIJ7dCbOZg_jYpw6_Q1";
const STORE_KEY="fcff26_feedback_v1",VIEWER_KEY="fcff26_viewer";
const supabase=window.supabase.createClient(SB_URL,SB_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
let feedback=loadFeedback(),currentFilter="all",currentBlock=null,pendingSyncAfterAuth=false;
const $=id=>document.getElementById(id);
function loadFeedback(){try{return JSON.parse(localStorage.getItem(STORE_KEY)||"{}")}catch{return {}}}
function persist(){localStorage.setItem(STORE_KEY,JSON.stringify(feedback));updateSyncUI()}
function viewer(){return $("viewerName").value.trim()||"Viewer"}
function keyFor(sessionId,filmId){return sessionId+"::"+filmId}
function blankRecord(entry,block){return{feedbackId:crypto.randomUUID(),sessionId:entry.sessionId,filmId:entry.filmId,title:entry.title,block:block.block,date:block.date,start:block.start,venue:block.venue,viewer:viewer(),swearing:false,nudity:false,fun:false,audienceLovedIt:false,talkedToFilmmaker:false,underwritingRisks:false,musicRisks:false,broadcastInterest:null,notes:"",dirty:true,updatedAt:new Date().toISOString()}}
function getRecord(entry,block){const k=keyFor(entry.sessionId,entry.filmId);if(!feedback[k])feedback[k]=blankRecord(entry,block);feedback[k].viewer=viewer();return feedback[k]}
function show(id){["homeView","blocksView","blockView"].forEach(x=>$(x).classList.toggle("hidden",x!==id));scrollTo(0,0)}
function parseDate(d){
 const s=String(d||"").trim();
 let m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
 if(m){const dt=new Date(Number(m[1]),Number(m[2])-1,Number(m[3]),12,0,0);return Number.isNaN(dt.getTime())?null:dt}
 m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
 if(m){const dt=new Date(Number(m[3]),Number(m[1])-1,Number(m[2]),12,0,0);return Number.isNaN(dt.getTime())?null:dt}
 const dt=new Date(s);return Number.isNaN(dt.getTime())?null:dt
}
function fmtDate(d){const dt=parseDate(d);return dt?dt.toLocaleDateString("en-US",{weekday:"long",month:"short",day:"numeric"}):String(d||"Date unavailable")}
function dateSortValue(d){const dt=parseDate(d);return dt?dt.getTime():0}
function toISODate(d){const dt=parseDate(d);if(!dt)return null;return [dt.getFullYear(),String(dt.getMonth()+1).padStart(2,"0"),String(dt.getDate()).padStart(2,"0")].join("-")}
function fmtTime(t){const [h,m]=String(t).split(":").map(Number);return new Date(2026,0,1,h,m).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"})}
function assignedToMe(b){return b.assigned&&b.assigned.toLowerCase()===viewer().toLowerCase()}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]))}
function renderBlocks(filter=currentFilter){
 currentFilter=filter;$("blocksTitle").textContent=filter==="mine"?"My assigned blocks":"All film blocks";
 const list=$("blocksList");list.innerHTML="";
 let arr=DATA.blocks.filter(b=>filter!=="mine"||assignedToMe(b));
 arr.sort((a,b)=>dateSortValue(a.date)-dateSortValue(b.date)||a.start.localeCompare(b.start)||a.block.localeCompare(b.block));
 let last="";
 for(const b of arr){if(b.date!==last){const h=document.createElement("div");h.className="day-heading";h.textContent=fmtDate(b.date);list.appendChild(h);last=b.date}
  const card=document.createElement("button");card.className="block-card"+(assignedToMe(b)?" mine":"");
  const completed=b.films.filter(f=>feedback[keyFor(f.sessionId,f.filmId)]).length;
  card.innerHTML='<h3>'+esc(b.block)+'</h3><div class="when">'+fmtTime(b.start)+(b.assigned?' • '+esc(b.assigned):'')+'</div><div class="venue">'+esc(b.venue)+'</div><div class="badge-row"><span class="badge">'+b.films.length+' film'+(b.films.length===1?'':'s')+'</span>'+(completed?'<span class="badge">'+completed+' noted</span>':'')+(b.assigned?'<span class="badge assignment">'+esc(b.assigned)+'</span>':'')+'</div>';
  card.onclick=()=>openBlock(b);list.appendChild(card);
 }
 if(!arr.length)list.innerHTML='<div class="block-card"><h3>No assigned blocks found</h3><div class="venue">Check the viewer name or open All film blocks.</div></div>';
}
function openBlock(b){currentBlock=b;$("blockTitle").textContent=b.block;$("blockMeta").textContent=fmtDate(b.date)+" • "+fmtTime(b.start);$("blockVenue").textContent=b.venue+(b.assigned?" • "+b.assigned:"");renderFilms();show("blockView")}
const checks=[["swearing","Swearing"],["nudity","Nudity"],["fun","Fun"],["audienceLovedIt","Audience loved it"],["talkedToFilmmaker","Talked to filmmaker"],["underwritingRisks","Underwriting risks"],["musicRisks","Music risks"]];
function renderFilms(){
 const wrap=$("filmList");wrap.innerHTML="";
 currentBlock.films.forEach((entry,i)=>{const film=DATA.films[entry.filmId]||{},rec=getRecord(entry,currentBlock);const card=document.createElement("article");card.className="film-card";
  const checksHtml=checks.map(([k,l])=>'<label class="check-pill"><input type="checkbox" data-field="'+k+'" '+(rec[k]?"checked":"")+'> <span>'+l+'</span></label>').join("");
  const buttons=[1,2,3].map(n=>'<button type="button" class="interest-button '+(rec.broadcastInterest===n?"active":"")+'" data-interest="'+n+'">'+n+'</button>').join("");
  card.innerHTML='<h3>'+(i+1)+'. '+esc(entry.title)+'</h3><div class="film-meta">'+(film.runtime?film.runtime+' min • ':'')+esc(film.director||"")+'</div>'+(film.flags?'<div class="flags">'+esc(film.flags)+'</div>':'')+(film.description?'<p class="film-desc">'+esc(film.description)+'</p>':'')+'<div class="check-grid">'+checksHtml+'</div><div class="interest-row"><span>Broadcast interest</span>'+buttons+'</div><textarea class="notes" placeholder="Notes">'+esc(rec.notes||"")+'</textarea><div class="save-state">'+(rec.dirty?"Saved on phone • waiting to sync":"Synced")+'</div>';
  card.querySelectorAll("[data-field]").forEach(el=>el.onchange=()=>{rec[el.dataset.field]=el.checked;touch(rec);card.querySelector(".save-state").textContent="Saved on phone • waiting to sync"});
  card.querySelectorAll("[data-interest]").forEach(el=>el.onclick=()=>{rec.broadcastInterest=Number(el.dataset.interest);touch(rec);renderFilms()});
  card.querySelector(".notes").oninput=e=>{rec.notes=e.target.value;touch(rec);card.querySelector(".save-state").textContent="Saved on phone • waiting to sync"};
  wrap.appendChild(card);
 });
 persist();
}
function touch(rec){rec.viewer=viewer();rec.updatedAt=new Date().toISOString();rec.dirty=true;persist()}
function pending(){return Object.values(feedback).filter(r=>r.dirty)}
function updateSyncUI(){const n=pending().length,online=navigator.onLine;[$("syncButton"),$("syncButton2")].forEach(b=>{b.disabled=!n;b.classList.toggle("offline",!online)});$("syncText").textContent=n?"Update Spreadsheet ("+n+")":"Spreadsheet up to date";document.querySelectorAll(".sync-text-copy").forEach(x=>x.textContent=n?"Update ("+n+")":"Up to date");document.querySelectorAll(".sync-dot-copy").forEach(x=>x.style.background=online?"var(--ok)":"var(--danger)");$("homeStatus").textContent=n?n+" unsynced film note"+(n===1?"":"s")+" saved on this phone.":"No unsynced notes on this phone."}
async function requireSession(){const {data:{session}}=await supabase.auth.getSession();if(session)return session;pendingSyncAfterAuth=true;$("authDialog").showModal();return null}
async function syncNow(){
 if(!navigator.onLine){banner("Offline. Your notes are safe on this phone.");return}
 const rows=pending();if(!rows.length){banner("Nothing waiting to sync.");return}
 const session=await requireSession();if(!session)return;
 const payload=rows.map(r=>({feedback_id:r.feedbackId,user_id:session.user.id,viewer:r.viewer||viewer(),session_id:r.sessionId,festival_block:r.block,film_id:r.filmId,title:r.title,screening_date:toISODate(r.date),screening_start:r.start||null,venue:r.venue||"",swearing:!!r.swearing,nudity:!!r.nudity,fun:!!r.fun,audience_loved_it:!!r.audienceLovedIt,talked_to_filmmaker:!!r.talkedToFilmmaker,underwriting_risks:!!r.underwritingRisks,music_risks:!!r.musicRisks,broadcast_interest:r.broadcastInterest||null,notes:r.notes||"",client_updated_at:r.updatedAt||new Date().toISOString(),updated_at:new Date().toISOString()}));
 banner("Updating spreadsheet…");
 const {error}=await supabase.from("fc_feedback").upsert(payload,{onConflict:"feedback_id"});
 if(error){banner("Sync failed: "+error.message,true);return}
 rows.forEach(r=>r.dirty=false);persist();if(currentBlock)renderFilms();banner("Synced. Viewer Feedback will refresh in the spreadsheet when Google refreshes the live feed.")
}
function banner(msg,bad=false){const el=$("syncBanner");el.textContent=msg;el.className="sync-banner active"+(bad?" error":"");setTimeout(()=>{el.className="sync-banner";el.textContent=""},5500)}
$("viewerName").value=localStorage.getItem(VIEWER_KEY)||DATA.viewers?.[0]||"";
$("viewerName").oninput=e=>{localStorage.setItem(VIEWER_KEY,e.target.value);updateSyncUI()};
$("myBlocksBtn").onclick=()=>{renderBlocks("mine");show("blocksView")};$("allBlocksBtn").onclick=()=>{renderBlocks("all");show("blocksView")};
document.querySelectorAll("[data-home]").forEach(b=>b.onclick=()=>show("homeView"));$("backBlocks").onclick=()=>{renderBlocks();show("blocksView")};
$("syncButton").onclick=syncNow;$("syncButton2").onclick=syncNow;$("authCancel").onclick=()=>$("authDialog").close();
$("authForm").addEventListener("submit",async e=>{e.preventDefault();$("authError").textContent="";const {error}=await supabase.auth.signInWithPassword({email:$("authEmail").value.trim(),password:$("authPassword").value});if(error){$("authError").textContent=error.message;return}$("authDialog").close();if(pendingSyncAfterAuth){pendingSyncAfterAuth=false;syncNow()}});
window.addEventListener("online",updateSyncUI);window.addEventListener("offline",updateSyncUI);
if("serviceWorker"in navigator)navigator.serviceWorker.register("sw.js");
updateSyncUI();
})();