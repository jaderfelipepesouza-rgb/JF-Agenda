/* JF Agenda UI v1.3: strictly presentational; existing handlers and storage retained */
(()=>{
'use strict';
const DEFAULT_CLOSED=new Set(['Dicas','Reposições do dia','Histórico de horários oferecidos','Academias e deslocamentos','Bloqueio de vários dias / férias','Frequência e relatório detalhado','Sobre esta versão','Sugestões de encaixe','Segurança e limitações']);
const LABELS=new Map([['A agenda aceita qualquer minuto de início:','Dicas'],['Ocorrências de reposição','Reposições do dia'],['Histórico de horários oferecidos','Propostas enviadas'],['Bloqueio de vários dias / férias','Férias e bloqueios'],['Frequência e relatório detalhado','Relatórios detalhados'],['Compromissos e intervalos','Compromissos']]);
let settings={};try{settings=JSON.parse(localStorage.getItem('jf-agenda-ui-v13')||'{}')||{}}catch{}
function nameOf(el){let h=el.querySelector(':scope > h2,:scope > h3');return h?.textContent.trim()||el.querySelector(':scope > .note')?.textContent.trim()||''}
function labelFor(s){for(let [a,b] of LABELS)if(s.startsWith(a))return b;return s}
function collapse(panel,page){if(panel.dataset.jfUiDone)return;const title=nameOf(panel);if(!title)return;const key=page+'|'+labelFor(title);const original=panel.querySelector(':scope > h2,:scope > h3');
 const body=document.createElement('div');body.className='ux-panel-body';[...panel.childNodes].forEach(n=>{if(n!==original)body.append(n)});
 const top=document.createElement('div');top.className='ux-panel-head';const h=document.createElement('h3');h.textContent=labelFor(title);
 const btn=document.createElement('button');btn.type='button';btn.className='ux-panel-toggle';
 const update=closed=>{panel.classList.toggle('ux-collapsed',closed);btn.textContent=closed?'Mostrar':'Ocultar';btn.setAttribute('aria-expanded',String(!closed));};
 btn.onclick=()=>{const closed=!panel.classList.contains('ux-collapsed');settings[key]=closed;try{localStorage.setItem('jf-agenda-ui-v13',JSON.stringify(settings))}catch{}update(closed)};
 top.append(h,btn);panel.replaceChildren(top,body);panel.dataset.jfUiDone='1';update(key in settings?settings[key]:DEFAULT_CLOSED.has(labelFor(title)));
}
function apply(){
 const text=document.querySelector('header .small');if(text && !document.getElementById('jfVersion')){const v=document.createElement('span');v.id='jfVersion';v.textContent='Interface v1.3';text.parentElement.append(v)}
 for(let page of ['agenda','alunos','disponibilidade','config']){
 const root=document.getElementById('page-'+page);if(!root)continue;
 root.querySelectorAll(':scope > .ux-hero').forEach(el=>el.remove());
 for(const panel of root.querySelectorAll(':scope > .panel')){
  const t=nameOf(panel);if(!t)continue;
  const primary=(page==='agenda'&&['Agenda','Compromissos e intervalos'].includes(t))||(page==='alunos'&&['Alunos','Alunos cadastrados','Grade fixa semanal'].includes(t))||(page==='disponibilidade'&&['Gerador de disponibilidade','Horários possíveis','Mensagem para WhatsApp'].includes(t))||(page==='config'&&t==='Configurações');
  if(!primary)collapse(panel,page);
 }
 }
 const l=document.getElementById('studentsList');const box=l?.closest('.panel');
 if(l&&box&&!document.getElementById('jfSearch')){
  const input=document.createElement('input');input.id='jfSearch';input.type='search';input.placeholder='Buscar aluno';input.setAttribute('aria-label','Buscar aluno');input.style.marginBottom='10px';l.before(input);
  input.addEventListener('input',()=>{let v=input.value.toLocaleLowerCase('pt-BR');l.querySelectorAll(':scope > .item').forEach(item=>{item.style.display=item.textContent.toLocaleLowerCase('pt-BR').includes(v)?'':'none'})});
 }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply);else apply();
})();
