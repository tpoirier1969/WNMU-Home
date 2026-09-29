(()=>{
"use strict";
const DATA=window.FRESH_COAST_DATA||{viewers:[],films:{},blocks:[]};
const SB_URL="https://tdepltlnughyfrjqufdg.supabase.co";
const SB_KEY="sb_publishable_oz-1MPs6ix3grIJ7dCbOZg_jYpw6_Q1";
const STORE_KEY="fcff26_feedback_v1",CONTACT_KEY="fcff26_contacts_v1",VIEWER_KEY="fcff26_viewer",RETRY_KEY="fcff26_retry_sync";
const supabase=window.supabase.createClient(SB_URL,SB_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
let feedback=loadFeedback(),contacts=loadContacts(),currentFilter="all",currentBlock=null,pendingSyncAfterAuth=false,pendingResultsAfterAuth=false,syncInFlight=false,bannerTimer=null;
const $=id=>document.getElementById(id);
function loadFeedback(){try{return JSON.parse(localStorage.getItem(STORE_KEY)||"{}")}catch{return {}}}
function loadContacts(){try{return JSON.parse(localStorage.getItem(CONTACT_KEY)||"{}")}catch{return {}}}
function persist(){localStorage.setItem(STORE_KEY,JSON.stringify(feedback));updateSyncUI()}
function persistContacts(){localStorage.setItem(CONTACT_KEY,JSON.stringify(contacts));updateSyncUI()}\nfunction retryWanted(){return localStorage.getItem(RETRY_KEY)==="1"}\nfunction setRetryWanted(wanted){if(wanted)localStorage.setItem(RETRY_KEY,"1");else localStorage.removeItem(RETRY_KEY)}\nfunction pendingCount(){return pending().length+pendingContacts().length}\nfunction savedChangesMessage(prefix,autoRetry=false){const n=pendingCount();return prefix+" "+n+" change"+(n===1?" is":"s are")+" still saved on this phone."+(autoRetry?" Reconnecting will retry automatically.":"")}
function viewer(){return $("viewerName").value.trim()||"Viewer"}
function isTod(){return viewer().toLowerCase()==="tod"}
function keyFor(sessionId,filmId){return sessionId+"::"+filmId}
function blankRecord(entry,block){return{feedbackId:crypto.randomUUID(),sessionId:entry.sessionId,filmId:entry.filmId,title:entry.title,block:block.block,date:block.date,start:block.start,venue:block.venue,viewer:viewer(),swearing:false,nudity:false,fun:false,audienceLovedIt:false,talkedToFilmmaker:false,underwritingRisks:false,musicRisks:false,broadcastInterest:null,notes:"",dirty:false,updatedAt:new Date().toISOString()}}
function getRecord(entry,block){const k=keyFor(entry.sessionId,entry.filmId);const rec=feedback[k]||blankRecord(entry,block);rec.viewer=viewer();return rec}
function getContact(entry){return contacts[entry.filmId]||{filmId:entry.filmId,title:entry.title,name:"",email:"",phone:"",dirty:false}}
function show(id){["homeView","blocksView","blockView","resultsView"].forEach(x=>$(x).classList.toggle("hidden",x!==id));scrollTo(0,0)}
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
 currentBlock.films.forEach((entry,i)=>{const film=DATA.films[entry.filmId]||{},rec=getRecord(entry,currentBlock),contact=getContact(entry);const card=document.createElement("article");card.className="film-card";
  const checksHtml=checks.map(([k,l])=>'<label class="check-pill"><input type="checkbox" data-field="'+k+'" '+(rec[k]?"checked":"")+'> <span>'+l+'</span></label>').join("");
  const buttons=[1,2,3].map(n=>'<button type="button" class="interest-button '+(rec.broadcastInterest===n?"active":"")+'" data-interest="'+n+'">'+n+'</button>').join("")+'<button type="button" class="interest-button interest-clear" data-interest-clear '+(rec.broadcastInterest==null?"disabled":"")+'>Clear</button>';
  const pendingHere=rec.dirty||contact.dirty;
  card.innerHTML='<h3>'+(i+1)+'. '+esc(entry.title)+'</h3><div class="film-meta">'+(film.runtime?film.runtime+' min • ':'')+esc(film.director||"")+'</div>'+(film.flags?'<div class="flags">'+esc(film.flags)+'</div>':'')+(film.description?'<p class="film-desc">'+esc(film.description)+'</p>':'')+'<div class="contact-section"><div class="section-title">Contact</div><div class="contact-grid"><label class="contact-name-wrap">Name<input type="text" class="contact-name" value="'+esc(contact.name||"")+'" placeholder="Contact name"></label><label>Email<input type="email" class="contact-email" value="'+esc(contact.email||"")+'" placeholder="filmmaker@example.com"></label><label>Phone<input type="tel" class="contact-phone" value="'+esc(contact.phone||"")+'" placeholder="Phone"></label></div></div><div class="check-grid">'+checksHtml+'</div><div class="interest-row"><span>Broadcast interest</span>'+buttons+'</div><textarea class="notes" placeholder="Notes">'+esc(rec.notes||"")+'</textarea><div class="save-state">'+(pendingHere?"Saved on phone • waiting to sync":(feedback[keyFor(entry.sessionId,entry.filmId)]?"Synced":"Not yet rated"))+'</div>';
  card.querySelectorAll("[data-field]").forEach(el=>el.onchange=()=>{rec[el.dataset.field]=el.checked;touch(rec);card.querySelector(".save-state").textContent="Saved on phone • waiting to sync"});
  card.querySelectorAll("[data-interest]").forEach(el=>el.onclick=()=>{const n=Number(el.dataset.interest);rec.broadcastInterest=rec.broadcastInterest===n?null:n;touch(rec);renderFilms()});
  card.querySelector("[data-interest-clear]").onclick=()=>{if(rec.broadcastInterest==null)return;rec.broadcastInterest=null;touch(rec);renderFilms()};
  card.querySelector(".notes").oninput=e=>{rec.notes=e.target.value;touch(rec);card.querySelector(".save-state").textContent="Saved on phone • waiting to sync"};
  card.querySelector(".contact-name").oninput=e=>{contact.name=e.target.value;touchContact(contact,entry);card.querySelector(".save-state").textContent="Saved on phone • waiting to sync"};
  card.querySelector(".contact-email").oninput=e=>{contact.email=e.target.value;touchContact(contact,entry);card.querySelector(".save-state").textContent="Saved on phone • waiting to sync"};
  card.querySelector(".contact-phone").oninput=e=>{contact.phone=e.target.value;touchContact(contact,entry);card.querySelector(".save-state").textContent="Saved on phone • waiting to sync"};
  wrap.appendChild(card);
 });
}
function touch(rec){feedback[keyFor(rec.sessionId,rec.filmId)]=rec;rec.viewer=viewer();rec.updatedAt=new Date().toISOString();rec.dirty=true;persist()}
function touchContact(contact,entry){contact.filmId=entry.filmId;contact.title=entry.title;contact.updatedAt=new Date().toISOString();contact.dirty=true;contacts[entry.filmId]=contact;persistContacts()}
function pending(){return Object.values(feedback).filter(r=>r.dirty)}
function pendingContacts(){return Object.values(contacts).filter(r=>r.dirty)}
function updateSyncUI(){const n=pendingCount(),online=navigator.onLine;[$("syncButton"),$("syncButton2")].forEach(b=>{b.disabled=!n||syncInFlight;b.classList.toggle("offline",!online)});$("syncText").textContent=syncInFlight?"Syncing…":(n?"Update Spreadsheet ("+n+")":"Cloud synced");document.querySelectorAll(".sync-text-copy").forEach(x=>x.textContent=syncInFlight?"Syncing…":(n?"Update ("+n+")":"Cloud synced"));document.querySelectorAll(".sync-dot-copy").forEach(x=>x.style.background=online?"var(--ok)":"var(--danger)");$("homeStatus").textContent=n?n+" unsynced change"+(n===1?"":"s")+" saved on this phone.":"No unsynced changes on this phone."}
async function requireSession(reason="sync"){const {data:{session}}=await supabase.auth.getSession();if(session)return session;if(reason==="results")pendingResultsAfterAuth=true;else pendingSyncAfterAuth=true;$("authDialog").showModal();return null}
async function refreshSharedContacts(){
 const {data:{session}}=await supabase.auth.getSession();if(!session||!navigator.onLine)return;
 const {data,error}=await supabase.functions.invoke("fresh-coast-contacts",{method:"GET"});
 if(error||!data?.contacts)return;
 for(const c of data.contacts){const local=contacts[c.filmId];if(!local?.dirty)contacts[c.filmId]={filmId:c.filmId,title:c.title||"",name:c.name||"",email:c.email||"",phone:c.phone||"",dirty:false}}
 persistContacts();if(currentBlock)renderFilms();
}
async function syncNow({automatic=false}={}){
 if(syncInFlight)return;
 if(!navigator.onLine){banner(savedChangesMessage("Offline.",true));return}
 const rows=pending(),contactRows=pendingContacts();if(!rows.length&&!contactRows.length){setRetryWanted(false);banner("Nothing waiting to sync.");return}
 let session;
 if(automatic){
  const {data}=await supabase.auth.getSession();session=data.session;
  if(!session){banner(savedChangesMessage("Connection restored, but sign-in is required to resume syncing."),true);return}
 }else{
  session=await requireSession("sync");if(!session)return;
 }
 syncInFlight=true;setRetryWanted(true);updateSyncUI();
 try{
  if(rows.length){
   const sentRows=rows.map(r=>({record:r,updatedAt:r.updatedAt}));
   const payload=rows.map(r=>({feedback_id:r.feedbackId,user_id:session.user.id,viewer:r.viewer||viewer(),session_id:r.sessionId,festival_block:r.block,film_id:r.filmId,title:r.title,screening_date:toISODate(r.date),screening_start:r.start||null,venue:r.venue||"",swearing:!!r.swearing,nudity:!!r.nudity,fun:!!r.fun,audience_loved_it:!!r.audienceLovedIt,talked_to_filmmaker:!!r.talkedToFilmmaker,underwriting_risks:!!r.underwritingRisks,music_risks:!!r.musicRisks,broadcast_interest:r.broadcastInterest||null,notes:r.notes||"",client_updated_at:r.updatedAt||new Date().toISOString(),updated_at:new Date().toISOString()}));
   banner(automatic?"Connection restored. Retrying saved changes…":"Updating spreadsheet…");
   const {error}=await supabase.from("fc_feedback").upsert(payload,{onConflict:"feedback_id"});
   if(error){banner(navigator.onLine?savedChangesMessage("Sync could not finish."):savedChangesMessage("Sync interrupted.",true),true);return}
   sentRows.forEach(({record,updatedAt})=>{if(record.updatedAt===updatedAt)record.dirty=false});persist();
  }
  for(const contact of contactRows){
   const sentAt=contact.updatedAt||null;
   const {error}=await supabase.functions.invoke("fresh-coast-contacts",{body:{filmId:contact.filmId,title:contact.title,name:contact.name||"",email:contact.email||"",phone:contact.phone||""}});
   if(error){banner(navigator.onLine?savedChangesMessage("Contact sync could not finish."):savedChangesMessage("Sync interrupted.",true),true);return}
   if((contact.updatedAt||null)===sentAt)contact.dirty=false;
   persistContacts();
  }
  if(!pendingCount())setRetryWanted(false);
  if(currentBlock)renderFilms();
  if(pendingCount())banner(savedChangesMessage("Some newer changes are still waiting to sync."));
  else banner("Cloud synced. The Google Sheet may still be refreshing.");
 }finally{
  syncInFlight=false;updateSyncUI();
 }
}
async function openResults(){
 if(!navigator.onLine){show("resultsView");$("resultsStatus").textContent="Offline. Synced results require a connection.";renderResults(Object.values(feedback).filter(r=>!r.dirty));return}
 const session=await requireSession("results");if(!session)return;
 show("resultsView");$("resultsStatus").textContent="Loading synced results…";
 const {data,error}=await supabase.from("fc_feedback").select("*").neq("session_id","CONTACT").order("title",{ascending:true}).order("updated_at",{ascending:false});
 if(error){$("resultsStatus").textContent="Could not load results: "+error.message;return}
 $("resultsStatus").textContent=(data||[]).length+" synced result"+((data||[]).length===1?"":"s");
 renderResults(data||[]);
}
function renderResults(rows){
 const list=$("resultsList");list.innerHTML="";
 if(!rows.length){list.innerHTML='<div class="result-card"><h3>No synced feedback yet</h3><p>Rate a film and press Update Spreadsheet.</p></div>';return}
 let last="";
 for(const r of rows){
  if(r.title!==last){const h=document.createElement("div");h.className="day-heading";h.textContent=r.title;list.appendChild(h);last=r.title}
  const card=document.createElement("article");card.className="result-card";
  const tags=[r.swearing?"Swearing":"",r.nudity?"Nudity":"",r.fun?"Fun":"",r.audience_loved_it?"Audience loved it":"",r.talked_to_filmmaker?"Talked to filmmaker":"",r.underwriting_risks?"Underwriting risk":"",r.music_risks?"Music risk":""].filter(Boolean);
  card.innerHTML='<div class="result-meta">'+esc(r.viewer||"")+(r.screening_date?" • "+esc(r.screening_date):"")+(r.festival_block?" • "+esc(r.festival_block):"")+'</div>'+(r.broadcast_interest?'<div class="result-interest">Broadcast interest: <strong>'+esc(r.broadcast_interest)+'</strong></div>':'')+(tags.length?'<div class="badge-row">'+tags.map(t=>'<span class="badge">'+esc(t)+'</span>').join("")+'</div>':'')+(r.notes?'<p class="result-notes">'+esc(r.notes)+'</p>':'')+(isTod()?'<button type="button" class="danger-button" data-delete-feedback="'+esc(r.feedback_id)+'">Delete feedback</button>':'');
  list.appendChild(card);
 }
 list.querySelectorAll("[data-delete-feedback]").forEach(btn=>btn.onclick=()=>deleteFeedback(btn.dataset.deleteFeedback));
}
async function deleteFeedback(id){
 if(!isTod())return;
 if(!window.confirm("Delete this synced feedback? This cannot be undone."))return;
 const session=await requireSession("results");if(!session)return;
 const {error}=await supabase.from("fc_feedback").delete().eq("feedback_id",id);
 if(error){$("resultsStatus").textContent="Delete failed: "+error.message;return}
 for(const [k,r] of Object.entries(feedback))if(r.feedbackId===id)delete feedback[k];
 persist();await openResults();
}
function banner(msg,bad=false){const el=$("syncBanner");if(bannerTimer)clearTimeout(bannerTimer);el.textContent=msg;el.className="sync-banner active"+(bad?" error":"");bannerTimer=setTimeout(()=>{el.className="sync-banner";el.textContent="";bannerTimer=null},5500)}
$("viewerName").value=localStorage.getItem(VIEWER_KEY)||DATA.viewers?.[0]||"";
$("viewerName").oninput=e=>{localStorage.setItem(VIEWER_KEY,e.target.value);updateSyncUI()};
$("myBlocksBtn").onclick=()=>{renderBlocks("mine");show("blocksView")};$("allBlocksBtn").onclick=()=>{renderBlocks("all");show("blocksView")};$("resultsBtn").onclick=openResults;$("refreshResults").onclick=openResults;
document.querySelectorAll("[data-home]").forEach(b=>b.onclick=()=>show("homeView"));$("backBlocks").onclick=()=>{renderBlocks();show("blocksView")};
$("syncButton").onclick=syncNow;$("syncButton2").onclick=syncNow;$("authCancel").onclick=()=>$("authDialog").close();
$("authForm").addEventListener("submit",async e=>{e.preventDefault();$("authError").textContent="";const {error}=await supabase.auth.signInWithPassword({email:$("authEmail").value.trim(),password:$("authPassword").value});if(error){$("authError").textContent=error.message;return}$("authDialog").close();await refreshSharedContacts();if(pendingSyncAfterAuth){pendingSyncAfterAuth=false;syncNow()}if(pendingResultsAfterAuth){pendingResultsAfterAuth=false;openResults()}});
window.addEventListener("online",()=>{updateSyncUI();refreshSharedContacts()});window.addEventListener("offline",updateSyncUI);
refreshSharedContacts();updateSyncUI();
})();