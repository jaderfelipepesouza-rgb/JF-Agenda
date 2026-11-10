/* JF Agenda v1.2.2 - presentation only; never edits appointment data. */
(()=>{
 'use strict';
 const PAGES=['agenda','alunos','disponibilidade','config'];
 const DEFAULT_HIDDEN=new Set([
  'agenda:Dicas de uso','agenda:Ocorrências de reposição',
  'alunos:Editar aluno e histórico','disponibilidade:Histórico de horários oferecidos',
  'config:Academias e deslocamentos','config:Bloqueio de vários dias / férias',
  'config:Frequência e relatório detalhado','config:Sobre esta versão'
 ]);
 const PREF='jf-agenda-ux-v122';
 let prefs={};try{prefs=JSON.parse(localStorage.getItem(PREF)||'{}')||{}}catch{}
 const titles={
  'A agenda aceita qualquer minuto de início:':'Dicas de uso',
  'Gerador de disponibilidade':'Disponibilidade',
  'Compromissos e intervalos':'Compromissos',
  'Ocorrências de reposição':'Reposições',
  'Histórico de horários oferecidos':'Propostas enviadas',
  'Frequência e relatório detalhado':'Relatórios',
  'Bloqueio de vários dias / férias':'Férias e bloqueios'
 };
 function page(){return document.querySelector('nav button.active')?.dataset.page||'agenda'}
 function header(panel){return panel.querySelector(':scope > h2, :scope > h3')}
 function label(panel){const h=header(panel);if(h)return h.textContent.trim();const note=panel.querySelector(':scope > .note');if(note)return note.textContent.trim();return ''}
 function nice(s){for(const [from,to] of Object.entries(titles))if(s.startsWith(from))return to;return s}
 function collapse(panel,key,defaultClosed){
  if(panel.dataset.uxReady)return;
  const original=header(panel);
  const oldLabel=label(panel);
  if(!oldLabel)return;
  const body=document.createElement('div');body.className='ux-panel-body';
  [...panel.childNodes].forEach(node=>{if(node!==original)body.appendChild(node)});
  const top=document.createElement('div');top.className='ux-panel-head';
  const title=document.createElement('h3');title.textContent=nice(oldLabel);
  const toggle=document.createElement('button');toggle.type='button';toggle.className='ux-panel-toggle';
  toggle.setAttribute('aria-expanded','true');
  function set(closed){
    panel.classList.toggle('ux-collapsed',closed);
    toggle.textContent=closed?'Mostrar':'Ocultar';
    toggle.setAttribute('aria-expanded',String(!closed));
    prefs[key]=closed;try{localStorage.setItem(PREF,JSON.stringify(prefs))}catch{}
  }
  toggle.addEventListener('click',()=>set(!panel.classList.contains('ux-collapsed')));
  top.append(title,toggle);panel.replaceChildren(top,body);panel.dataset.uxReady='yes';
  // Reuse preference from v1.2 for sections that the user previously collapsed.
  let old={};try{old=JSON.parse(localStorage.getItem('jf-agenda-ux-v12')||'{}')||{}}catch{}
  set(key in prefs?!!prefs[key]:((key.replace(':','::') in old)?!!old[key.replace(':','::')]:defaultClosed));
 }
 function run(){
  const sheet=document.querySelector('link[href="./ux.css"]'); if(sheet && sheet!==document.head.lastElementChild)document.head.append(sheet);
  for(const p of PAGES){
    const section=document.getElementById('page-'+p);if(!section)continue;
    // Remove former oversize hero if it exists from a previously executed design layer.
    section.querySelectorAll(':scope > .ux-hero').forEach(el=>el.remove());
    [...section.querySelectorAll(':scope > .panel')].forEach(panel=>{
      const raw=label(panel),friendly=nice(raw),key=p+':'+friendly;
      if(!raw||panel.dataset.uxReady)return;
      // Primary cards stay immediately visible.
      const primary=(p==='agenda'&&raw==='Agenda')||(p==='alunos'&&raw==='Alunos')||
                    (p==='disponibilidade'&&raw==='Gerador de disponibilidade')||
                    (p==='config'&&raw==='Configurações')||
                    (p==='agenda'&&raw==='Compromissos e intervalos')||
                    (p==='disponibilidade'&&raw==='Mensagem para WhatsApp');
      if(!primary) collapse(panel,key,DEFAULT_HIDDEN.has(key));
    });
  }
  // Search filters only the list of registered students. No changes to stored data.
  const list=document.getElementById('studentsList');
  const holder=list?.closest('.panel');
  if(list&&holder&&!document.getElementById('uxStudentSearch')){
    const search=document.createElement('input');search.id='uxStudentSearch';search.type='search';search.placeholder='Buscar aluno...';search.setAttribute('aria-label','Buscar aluno');search.className='ux-student-search';
    list.before(search);
    search.addEventListener('input',()=>{
      const q=search.value.toLocaleLowerCase('pt-BR');
      list.querySelectorAll(':scope > .item').forEach(el=>el.style.display=el.textContent.toLocaleLowerCase('pt-BR').includes(q)?'':'none');
    });
  }
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
 // Added future panels may be inserted after initialization.
 setTimeout(run,500);
})();
