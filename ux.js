
(function(){
  const PAGE_META={
    agenda:{title:'Agenda inteligente',subtitle:'Visualize o dia, marque aulas e acesse compromissos com menos rolagem.'},
    alunos:{title:'Alunos e rotinas',subtitle:'Cadastre, edite e organize grades fixas sem poluição visual.'},
    disponibilidade:{title:'Horários disponíveis',subtitle:'Filtre opções, selecione os melhores encaixes e gere a mensagem com mais rapidez.'},
    config:{title:'Ajustes e estrutura',subtitle:'Controle jornada, locais, férias e backups em blocos mais organizados.'}
  };
  const COLLAPSED_DEFAULTS=new Set([
    'agenda::Ocorrências de reposição',
    'agenda::A agenda aceita qualquer minuto de início: 15h05, 16h25 ou 19h40. Os compromissos recorrentes valem semanalmente, e é possível cancelar apenas uma ocorrência.',
    'alunos::Editar aluno e histórico',
    'disponibilidade::Histórico de horários oferecidos',
    'config::Academias e deslocamentos',
    'config::Bloqueio de vários dias / férias',
    'config::Frequência e relatório detalhado',
    'config::Sobre esta versão'
  ]);
  const STORE='jf-agenda-ux-v12';
  function loadState(){try{return JSON.parse(localStorage.getItem(STORE)||'{}')}catch{return {}}}
  function saveState(s){localStorage.setItem(STORE,JSON.stringify(s))}
  function pageSection(page){return document.getElementById('page-'+page)}
  function escapeHtml(s){return (s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
  function panelTitle(panel){
    const heading=panel.querySelector(':scope > h2,:scope > h3')||panel.querySelector('h2,h3');
    if(heading)return heading.textContent.trim();
    const note=panel.querySelector('.note');
    if(note)return note.textContent.trim();
    return 'Seção';
  }
  function ensureHero(page){
    const sec=pageSection(page); if(!sec||sec.querySelector('.ux-hero')) return;
    const meta=PAGE_META[page];
    const hero=document.createElement('div'); hero.className='panel ux-hero';
    let actions='';
    if(page==='agenda') actions=`<div class="actions"><button class="btn" type="button" data-ux-action="novo-atendimento">+ Atendimento</button><button class="btn secondary" type="button" data-ux-action="hoje">Hoje</button><button class="btn secondary" type="button" data-ux-action="7dias">Próximos 7 dias</button></div>`;
    if(page==='alunos') actions=`<div class="actions"><button class="btn" type="button" data-ux-action="novo-aluno">Novo aluno</button><button class="btn secondary" type="button" data-ux-action="buscar-aluno">Buscar</button></div>`;
    if(page==='disponibilidade') actions=`<div class="actions"><button class="btn" type="button" data-ux-action="recalcular-horarios">Atualizar horários</button><button class="btn secondary" type="button" data-ux-action="semana-atual">Próximos 7 dias</button><button class="btn secondary" type="button" data-ux-action="ir-mensagem">Mensagem</button></div>`;
    if(page==='config') actions=`<div class="actions"><button class="btn" type="button" data-ux-action="salvar-ajustes">Salvar ajustes</button><button class="btn secondary" type="button" data-ux-action="backup">Backup</button></div>`;
    hero.innerHTML=`<h2>${meta.title}</h2><p>${meta.subtitle}</p>${actions}<div class="ux-quickbar" data-ux-quickbar="${page}"></div>`;
    sec.prepend(hero);
  }
  function slug(s){return s.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'secao'}
  function ensureAnchors(page){
    const sec=pageSection(page); if(!sec) return;
    const bar=sec.querySelector(`[data-ux-quickbar="${page}"]`); if(!bar) return;
    const panels=[...sec.querySelectorAll(':scope > .panel:not(.ux-hero)')];
    const links=[];
    panels.forEach((panel,idx)=>{
      const title=panelTitle(panel);
      if(!panel.id) panel.id=`${page}-${slug(title)}-${idx}`;
      panel.classList.add('ux-section-anchor');
      links.push(`<a class="ux-chip" href="#${panel.id}">${escapeHtml(title)}</a>`);
    });
    bar.innerHTML=links.join('');
  }
  function makeCollapsible(panel,page){
    if(panel.classList.contains('ux-hero')||panel.dataset.uxReady) return;
    const titleEl=panel.querySelector(':scope > h2,:scope > h3');
    const title=panelTitle(panel);
    const key=`${page}::${title}`;
    const state=loadState();
    const shouldCollapse=(key in state)?state[key]:COLLAPSED_DEFAULTS.has(key);
    if(!titleEl && !panel.querySelector('.note')) return;
    const body=document.createElement('div'); body.className='ux-panel-body';
    const nodes=[...panel.childNodes];
    nodes.forEach(n=>{if(n!==titleEl) body.appendChild(n)});
    const head=document.createElement('div'); head.className='ux-panel-head';
    const titleNode=document.createElement(titleEl?titleEl.tagName.toLowerCase():'h3'); titleNode.textContent=title;
    const toggle=document.createElement('button'); toggle.type='button'; toggle.className='ux-panel-toggle';
    function sync(collapsed){
      panel.classList.toggle('ux-collapsed',collapsed);
      toggle.textContent=collapsed?'Mostrar':'Ocultar';
      state[key]=collapsed; saveState(state);
    }
    toggle.addEventListener('click',()=>sync(!panel.classList.contains('ux-collapsed')));
    head.append(titleNode,toggle);
    panel.innerHTML=''; panel.append(head,body); panel.dataset.uxReady='1';
    sync(!!shouldCollapse);
  }
  function enhancePanels(page){
    const sec=pageSection(page); if(!sec) return;
    [...sec.querySelectorAll(':scope > .panel:not(.ux-hero)')].forEach(panel=>{
      const title=panelTitle(panel);
      if(['Agenda','Alunos','Gerador de disponibilidade','Configurações'].includes(title)) return; // keep primary sections expanded/plain
      makeCollapsible(panel,page);
    });
  }
  function ensureStudentSearch(){
    const page=pageSection('alunos'); if(!page||page.querySelector('.ux-search')) return;
    const listPanel=[...page.querySelectorAll(':scope > .panel')].find(p=>p.textContent.includes('Alunos cadastrados'));
    if(!listPanel) return;
    const wrap=document.createElement('div'); wrap.className='ux-search';
    wrap.innerHTML='<label class="field">Buscar por nome<input type="search" id="uxStudentSearch" placeholder="Encontrar aluno ou horário recorrente"></label>';
    listPanel.prepend(wrap);
    const input=wrap.querySelector('input');
    input.addEventListener('input',()=>filterStudents(input.value.trim().toLowerCase()));
  }
  function filterStudents(q){
    const page=pageSection('alunos'); if(!page) return;
    const selectors=['#studentsList > .item','.rule-entry','.jf-rule-card','#j11-studentHistory .item'];
    page.querySelectorAll(selectors.join(',')).forEach(el=>{
      const txt=el.textContent.toLowerCase();
      el.style.display=!q||txt.includes(q)?'':'none';
    });
  }
  function bindHeroActions(){
    document.querySelectorAll('[data-ux-action]').forEach(btn=>{
      if(btn.dataset.uxBound) return; btn.dataset.uxBound='1';
      btn.addEventListener('click',()=>{
        const act=btn.dataset.uxAction;
        if(act==='novo-atendimento') return window.openAppointment?.();
        if(act==='hoje'){ const d=document.getElementById('agendaDate'),m=document.getElementById('agendaMode'); if(d){d.value=today(); m.value='day'; renderAgenda();}}
        if(act==='7dias'){ const d=document.getElementById('agendaDate'),m=document.getElementById('agendaMode'); if(d){d.value=today(); m.value='week'; renderAgenda();}}
        if(act==='novo-aluno'){ showPage('alunos'); document.querySelector('#studentForm input[name="name"]')?.focus(); window.scrollTo({top:0,behavior:'smooth'}); }
        if(act==='buscar-aluno'){ showPage('alunos'); document.getElementById('uxStudentSearch')?.focus(); }
        if(act==='recalcular-horarios'){ renderAvailability?.(); }
        if(act==='semana-atual'){ const from=document.getElementById('fromDate'),to=document.getElementById('toDate'); if(from&&to){from.value=today(); to.value=addDays(today(),6); renderAvailability();}}
        if(act==='ir-mensagem'){ document.getElementById('messagePreview')?.scrollIntoView({behavior:'smooth',block:'start'}); }
        if(act==='salvar-ajustes'){ document.querySelector('#settingsForm button[type="submit"]')?.click(); }
        if(act==='backup'){ exportBackup?.(); }
      });
    });
  }
  function patchShowPage(){
    const old=window.showPage;
    if(!old||old.__uxPatched) return;
    window.showPage=function(page){ old(page); setTimeout(()=>refresh(page),0); };
    window.showPage.__uxPatched=true;
  }
  function patchAddStudent(){
    const old=window.addStudent;
    if(!old||old.__uxPatched) return;
    window.addStudent=function(e){ old(e); setTimeout(()=>{ensureStudentSearch(); filterStudents(document.getElementById('uxStudentSearch')?.value.trim().toLowerCase()||'');},0)};
    window.addStudent.__uxPatched=true;
  }
  function patchOpenAppointment(){
    const old=window.openAppointment;
    if(!old||old.__uxPatched) return;
    window.openAppointment=function(id){ old(id); const dialog=document.getElementById('appointmentDialog'); if(dialog){ dialog.classList.add('ux-dialog'); setTimeout(()=>dialog.querySelector('select, input, textarea')?.focus(),50);} };
    window.openAppointment.__uxPatched=true;
  }
  function refresh(page){
    if(page){ ensureHero(page); ensureAnchors(page); enhancePanels(page); }
    else ['agenda','alunos','disponibilidade','config'].forEach(p=>{ensureHero(p); ensureAnchors(p); enhancePanels(p)});
    ensureStudentSearch(); bindHeroActions();
  }
  const obs=new MutationObserver(()=>{ clearTimeout(window.__uxTick); window.__uxTick=setTimeout(()=>refresh(document.querySelector('nav button.active')?.dataset.page||'agenda'),120); });
  function start(){ patchShowPage(); patchAddStudent(); patchOpenAppointment(); refresh(); obs.observe(document.querySelector('main'),{childList:true,subtree:true}); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start); else start();
})();
