
const $ = id => document.getElementById(id);
const app = $('app');
const modal = $('confirm');
const resetModal = $('reset-confirm');
const key = 'test-hub-v1';
const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
let state = {theme:'light', active:null, history:[]};
try { state = {...state, ...JSON.parse(localStorage.getItem(key))}; } catch {}
let questions, byId, chapterCounts, view = 'home', result, filter = 'all', reviewPage = 0, charts = [];
function save() {
  try { localStorage.setItem(key, JSON.stringify(state)); }
  catch { $('storage').textContent = 'Browser storage is unavailable. Keep this tab open to retain your session.'; }
}
function theme() {
  document.documentElement.dataset.theme = state.theme;
  $('theme').textContent = state.theme === 'dark' ? 'Light mode' : 'Dark mode';
}
function go(next) { view = next; render(); window.scrollTo(0,0); }
function current() { return byId.get(state.active.ids[state.active.index]); }
function status(s,id) {
  return s.marked[id] ? 'review' : s.answers[id] != null ? 'answered' : s.visited[id] ? 'skipped' : 'unvisited';
}
function outcome(s,id) {
  return s.answers[id] == null ? 'skipped' : s.answers[id] === byId.get(id).answer ? 'correct' : 'incorrect';
}
const names = {review:'Marked for review',answered:'Answered',skipped:'Skipped',unvisited:'Not visited',correct:'Correct',incorrect:'Incorrect'};
function stats(s) {
  const count = {correct:0,incorrect:0,skipped:0};
  const topics = new Map();
  for (const id of s.ids) {
    const grade = outcome(s,id);
    count[grade]++;
    const topic = byId.get(id).topic;
    const row = topics.get(topic) ?? {correct:0,attempted:0};
    row.correct += Number(grade === 'correct');
    row.attempted += Number(grade !== 'skipped');
    topics.set(topic,row);
  }
  const attempted = count.correct + count.incorrect;
  return {...count,attempted,accuracy:attempted ? count.correct/attempted*100 : 0,net:count.correct-count.incorrect/4,topics};
}
function historyRow(s,i) {
  const paused = s.remainingMs != null;
  const date = new Date(paused ? s.pausedAt : s.ended).toLocaleString();
  const detail = paused ? Object.keys(s.answers).length+' of '+s.ids.length+' answered' : stats(s).net.toFixed(2)+' / '+s.ids.length+' points';
  return '<div class="history-row"><div><span class="status '+(paused?'review':'answered')+'">'+(paused?'Paused':'Completed')+'</span><h3>'+escape(s.title)+'</h3><small>'+date+' · '+detail+'</small></div><button data-act="'+(paused?'resume-history':'history')+'" data-i="'+i+'" '+(paused&&state.active?'disabled title="Submit or reset the current test first"':'')+'>'+(paused?'Resume test':'View result')+'</button></div>';
}
function home() {
  const topics = [...chapterCounts.keys()].sort((a,b)=>a.localeCompare(b));
  return '<section class="hero"><p class="label">Computer science practice</p><h1>Prepare for your next exam.</h1><p class="muted">'+questions.length.toLocaleString()+' extracted questions · +1 correct · −0.25 incorrect · 0 skipped</p></section>'+
    (state.active ? '<section class="card row between"><div><h2>Test in progress</h2><p class="muted">'+escape(state.active.title)+'</p></div><div class="actions"><button class="primary" data-act="resume">Resume test</button><button data-act="reset">Reset current test</button></div></section>' : '')+
    '<section class="card"><h2>Build a timed test</h2><form id="setup"><fieldset '+(state.active?'disabled':'')+' style="border:0;padding:0;margin:0"><div class="fields"><label>Section<select name="topic"><option value="">All sections</option>'+topics.map(t=>'<option value="'+escape(t)+'">'+escape(t)+' ('+chapterCounts.get(t).toLocaleString()+')</option>').join('')+'</select></label><label>Questions<input name="count" type="number" min="1" max="'+questions.length+'" value="25" required></label><label>Minutes<input name="minutes" type="number" min="1" max="1440" value="30" required></label></div><button class="primary">Start test</button></fieldset></form></section>'+
    '<section class="card"><h2>Questions by chapter</h2><ul class="chapter-list">'+topics.map(t=>'<li><span>'+escape(t)+'</span><strong class="mono">'+chapterCounts.get(t).toLocaleString()+'</strong></li>').join('')+'</ul></section>'+
    '<section class="card"><h2>Test history</h2>'+(state.history.length ? state.history.map(historyRow).join('') : '<p class="muted">Paused and completed tests appear here.</p>')+'</section>';
}
function exam() {
  const s = state.active, q = current();
  const checked = s.checked?.[q.id] === s.answers[q.id] && s.answers[q.id] != null;
  return '<div class="layout"><section class="card exam-card"><div class="row between"><div class="question-meta"><span class="label">Question '+(s.index+1)+' / '+s.ids.length+'</span>'+(q.source?'<span class="exam-source">'+escape(q.source)+'</span>':'')+'</div><span id="timer" class="timer" role="timer"></span></div><p class="muted">'+escape(q.topic)+'</p><h2 class="stem">'+escape(q.stem)+'</h2><div class="options" role="group" aria-label="Answer choices">'+q.options.map((o,i)=>'<button class="option" data-act="answer" data-i="'+i+'" aria-pressed="'+(s.answers[q.id]===i)+'"><b>'+letters[i]+'</b><span>'+escape(o)+'</span></button>').join('')+'</div><div class="actions"><button data-act="check" '+(s.answers[q.id]==null?'disabled':'')+'>Check answer</button><button data-act="clear" '+(s.answers[q.id]==null?'disabled':'')+'>Clear response</button><button data-act="mark" aria-pressed="'+Boolean(s.marked[q.id])+'">'+(s.marked[q.id]?'Remove review mark':'Mark for review')+'</button></div>'+(checked?'<section class="feedback" id="answer-feedback" tabindex="-1" aria-labelledby="feedback-title"><h3 id="feedback-title" class="'+outcome(s,q.id)+'">'+names[outcome(s,q.id)]+'</h3>'+reference(q)+breakdown(q)+'</section>':'')+'<hr><div class="actions between"><button data-act="jump" data-i="'+(s.index-1)+'" '+(s.index===0?'disabled':'')+'>Previous</button><button class="primary" data-act="jump" data-i="'+(s.index+1)+'" '+(s.index===s.ids.length-1?'disabled':'')+'>Next</button></div></section><aside class="card navigator"><h2>Question navigator</h2><div class="palette">'+s.ids.map((id,i)=>{
    const kind=status(s,id);
    return '<button class="'+kind+'" data-act="jump" data-i="'+i+'" aria-current="'+(i===s.index)+'" aria-label="Question '+(i+1)+', '+names[kind]+(kind==='review'&&s.answers[id]!=null?', answered':'')+'">'+(i+1)+'</button>';
  }).join('')+'</div><p class="row legend">'+['answered','review','skipped','unvisited'].map(k=>'<span class="'+k+'">● '+names[k]+'</span>').join('')+'</p><div class="exam-actions"><button class="primary" data-act="confirm">Submit test</button><button data-act="reset">Reset</button></div></aside></div>';
}
function visuals(q) {
  return (q.visuals ?? []).map(v => {
    if (v.type === 'table') return '<div class="visual"><table><caption>'+escape(v.title)+'</caption><thead><tr>'+v.headers.map(x=>'<th scope="col">'+escape(x)+'</th>').join('')+'</tr></thead><tbody>'+v.rows.map(row=>'<tr>'+row.map(x=>'<td>'+escape(x)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
    if (v.type === 'flow') return '<div class="visual"><svg role="img" aria-label="'+escape(v.title)+'" viewBox="0 0 420 '+(v.steps.length*58)+'" width="420">'+v.steps.map((x,i)=>'<rect x="10" y="'+(i*58+2)+'" width="400" height="36" rx="8" fill="var(--soft)"/><text x="210" y="'+(i*58+25)+'" text-anchor="middle" fill="var(--text)" font-size="13">'+escape(x)+'</text>'+(i<v.steps.length-1?'<path d="M210 '+(i*58+39)+'v14m-5-5 5 5 5-5" fill="none" stroke="var(--accent)"/>':'')).join('')+'</svg></div>';
    return '';
  }).join('');
}
function reference(q) {
  const exam = q.source ? escape(q.source) : 'Exam reference unavailable';
  return '<p class="reference"><small>'+exam+' · PDF page '+q.page+' · Question '+q.number+'</small></p>';
}
function breakdown(q) {
  const option=i=>letters[i]+'. '+escape(q.options[i]);
  return '<p><strong>Supplied key</strong> '+option(q.answer)+'</p><h3>Answer explanation</h3><p class="preserve">'+escape(q.explanation || 'No usable explanation was extracted from the source.')+'</p>'+visuals(q)+
    '<h3>Other options</h3><ul>'+q.options.map((_,i)=>i===q.answer?'':'<li><strong>'+option(i)+'</strong>'+ (q.elimination?.[i] ? ' — '+escape(q.elimination[i]) : '<br><small>No separate explanation available.</small>')+'</li>').join('')+'</ul>';
}
function solution(s,id) {
  const q=byId.get(id), grade=outcome(s,id), a=s.answers[id];
  return '<details class="review-item"><summary><span class="'+grade+'">'+names[grade]+'</span> · '+escape(q.stem.split('\n')[0])+'</summary><p class="stem">'+escape(q.stem)+'</p><ol type="A">'+q.options.map(o=>'<li class="preserve">'+escape(o)+'</li>').join('')+'</ol><p><strong>Your response</strong> '+(a==null?'Skipped':letters[a]+'. '+escape(q.options[a]))+'</p>'+reference(q)+breakdown(q)+'</details>';
}
function results() {
  const s=result, r=stats(s);
  const ids=s.ids.filter(id=>filter==='all'||outcome(s,id)===filter);
  return '<section class="card"><p class="label">'+(s.expired?'Time expired':'Test complete')+'</p><h1>Performance analyzer</h1><p class="muted">'+escape(s.title)+'</p><div class="metrics">'+[['Net score',r.net.toFixed(2)+' / '+s.ids.length],['Accuracy',r.accuracy.toFixed(1)+'%'],['Attempted',r.attempted],['Unattempted',r.skipped],['Positive marks','+'+r.correct],['Marks lost',(r.incorrect/4).toFixed(2)]].map(([label,value])=>'<div class="metric"><small>'+label+'</small><strong class="mono">'+value+'</strong></div>').join('')+'</div><div class="charts"><section><h2>Answer breakdown</h2><p class="muted">'+r.correct+' correct · '+r.incorrect+' incorrect · '+r.skipped+' skipped</p><div class="plot"><canvas id="donut" role="img" aria-label="Answer breakdown"></canvas></div></section><section><h2>Section accuracy</h2><details><summary>View section figures</summary><ul>'+[...r.topics].map(([t,v])=>'<li>'+escape(t)+' · '+v.correct+'/'+v.attempted+' correct</li>').join('')+'</ul></details><div class="plot"><canvas id="bars" role="img" aria-label="Accuracy by section"></canvas></div></section></div></section><section class="card"><div class="row between"><h2>Solution review</h2><label>Show <select id="filter">'+[['all','All'],['incorrect','Incorrect Only'],['correct','Correct Only'],['skipped','Skipped']].map(([v,n])=>'<option value="'+v+'" '+(filter===v?'selected':'')+'>'+n+'</option>').join('')+'</select></label></div>'+
    (ids.slice(reviewPage*25,reviewPage*25+25).map(id=>solution(s,id)).join('') || '<p class="muted">No questions match this filter.</p>')+(ids.length>25?'<div class="actions"><button data-act="page" data-i="'+(reviewPage-1)+'" '+(!reviewPage?'disabled':'')+'>Previous page</button><span>Page '+(reviewPage+1)+' of '+Math.ceil(ids.length/25)+'</span><button data-act="page" data-i="'+(reviewPage+1)+'" '+((reviewPage+1)*25>=ids.length?'disabled':'')+'>Next page</button></div>':'')+'</section>';
}
function drawCharts() {
  if (!globalThis.Chart) {
    document.querySelectorAll('.plot').forEach(el=>{el.hidden=true;});
    return;
  }
  const r=stats(result);
  const color=getComputedStyle(document.documentElement).getPropertyValue('--muted').trim();
  const options={maintainAspectRatio:false,animation:false};
  charts.push(new Chart($('donut'),{type:'doughnut',data:{labels:['Correct','Incorrect','Skipped'],datasets:[{data:[r.correct,r.incorrect,r.skipped],backgroundColor:['#1b9e77','#df5476','#a5aec5'],borderWidth:0}]},options:{...options,plugins:{legend:{labels:{color}}}}}));
  charts.push(new Chart($('bars'),{type:'bar',data:{labels:[...r.topics.keys()],datasets:[{data:[...r.topics.values()].map(v=>v.attempted?100*v.correct/v.attempted:null),backgroundColor:'#7867e9'}]},options:{...options,indexAxis:'y',plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>c.parsed.x.toFixed(1)+'%'}}},scales:{x:{min:0,max:100,ticks:{color,callback:v=>v+'%'}},y:{ticks:{color,callback:function(v){const t=this.getLabelForValue(v);return t.length>20?t.slice(0,19)+'…':t;}}}}}}));
}
function render() {
  charts.forEach(c=>c.destroy()); charts=[];
  app.innerHTML = view==='exam' ? exam() : view==='results' ? results() : home();
  if(view==='results') drawCharts();
  if(view==='exam') tick();
}
function showResult(s) { result=s; filter='all'; reviewPage=0; go('results'); }
function finish(expired) {
  if(!state.active)return;
  if(modal.open)modal.close();
  if(resetModal.open)resetModal.close();
  const s={...state.active,ended:Date.now(),expired};
  state.active=null; state.history.unshift(s); save(); showResult(s);
}
function tick() {
  const s=state.active;
  if(!s)return;
  const remaining=Math.max(0,Math.ceil((s.deadline-Date.now())/1000));
  if(!remaining){finish(true);return;}
  if($('timer'))$('timer').textContent=[Math.floor(remaining/60),remaining%60].map(v=>String(v).padStart(2,'0')).join(':');
}
app.addEventListener('submit', e=>{
  if(e.target.id!=='setup')return;
  e.preventDefault();
  if(state.active)return;
  const data=new FormData(e.target), topic=data.get('topic'), minutes=Number(data.get('minutes'));
  const pool=questions.filter(q=>!topic||q.topic===topic).map(q=>q.id);
  for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
  const ids=pool.slice(0,Number(data.get('count')));
  state.active={title:topic||'Mixed practice',ids,index:0,answers:{},marked:{},visited:{[ids[0]]:true},deadline:Date.now()+minutes*60000};
  save();go('exam');
});
app.addEventListener('change',e=>{
  if(e.target.name==='topic' && e.target.form?.id==='setup'){
    const count=e.target.form.elements.namedItem('count');
    count.max=chapterCounts.get(e.target.value) ?? questions.length;
    if(count.valueAsNumber>Number(count.max))count.value=count.max;
    return;
  }
  if(e.target.id!=='filter')return;
  filter=e.target.value;reviewPage=0;render();$('filter').focus();
});
app.addEventListener('click',e=>{
  const b=e.target.closest('button[data-act]');
  if(!b)return;
  const {act}=b.dataset,i=Number(b.dataset.i);
  if(act==='history'){showResult(state.history[i]);return;}
  if(act==='resume-history'){
    if(state.active || state.history[i]?.remainingMs == null)return;
    const [{remainingMs,pausedAt,...session}]=state.history.splice(i,1);
    state.active={...session,deadline:Date.now()+remainingMs};
    save();go('exam');return;
  }
  if(act==='page'){reviewPage=i;render();$('filter').focus();return;}
  if(act==='resume'){go('exam');return;}
  const s=state.active;
  if(!s)return;
  if(Date.now()>=s.deadline){finish(true);return;}
  const id=current().id;
  if(act==='reset'){
    resetModal.returnValue='';
    resetModal.showModal();return;
  }
  if(act==='confirm'){
    modal.returnValue='';
    $('confirm-summary').textContent=stats(s).skipped+' of '+s.ids.length+' questions are unanswered.';
    modal.showModal();return;
  }
  if(act==='check' && s.answers[id]!=null){
    s.checked ??= {};
    s.checked[id]=s.answers[id];
    save();render();$('answer-feedback')?.focus();
    return;
  }
  if(act==='answer' && s.answers[id]!==i){
    s.answers[id]=i;
    if(s.checked)delete s.checked[id];
  }
  if(act==='clear'){
    delete s.answers[id];
    if(s.checked)delete s.checked[id];
  }
  if(act==='mark')s.marked[id]=!s.marked[id];
  if(act==='jump'){s.index=i;s.visited[current().id]=true;}
  save();render();
  const selector=act==='jump'?'[data-act="answer"]':'[data-act="'+act+'"]'+(act==='answer'?'[data-i="'+i+'"]':'');
  app.querySelector(selector)?.focus({preventScroll:true});
});
resetModal.addEventListener('submit',event=>{
  if(event.submitter?.value!=='reset'||!state.active)return;
  event.preventDefault();
  resetModal.close();
  const {deadline,...session}=state.active;
  const pausedAt=Date.now();
  if(deadline<=pausedAt){finish(true);return;}
  state.history.unshift({...session,pausedAt,remainingMs:deadline-pausedAt});
  state.active=null;
  save();go('home');
  app.querySelector('[data-act="resume-history"]')?.focus();
});
modal.addEventListener('close',()=>{if(modal.returnValue==='submit')finish(Date.now()>=(state.active?.deadline??Infinity));});
$('theme').addEventListener('click',()=>{state.theme=state.theme==='light'?'dark':'light';theme();save();if(view==='results')render();});
$('home').addEventListener('click',()=>{if(questions)go('home');});
theme();
try {
  const response=await fetch('./questions.json');
  if(!response.ok)throw Error('HTTP '+response.status);
  const bank=await response.json();
  questions=bank.questions;
  byId=new Map(questions.map(q=>[q.id,q]));
  chapterCounts=new Map();
  for(const q of questions)chapterCounts.set(q.topic,(chapterCounts.get(q.topic)??0)+1);
  const valid=s=>s?.ids?.length&&s.ids.every(id=>byId.has(id));
  state.history=state.history.filter(valid);
  if(!valid(state.active))state.active=null;
  app.removeAttribute('aria-busy');
  if(state.active)go('exam');else render();
  setInterval(tick,250);
} catch(error) {
  app.removeAttribute('aria-busy');
  app.textContent='The question bank could not load. Open this site over HTTP and reload.';
  console.error(error);
}

