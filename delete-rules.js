/* JF Agenda v1.1.2 — exclusão controlada de recorrências incorretas. */
'use strict';
const jfDeleteSelection = new Set();
const jfRuleListBeforeDelete = v1RenderRules;
function jfRuleState(r){return r.until&&r.until<today()?'Encerrada':r.pauseFrom?'Pausada':'Ativa'}
let jfSelectionMode=false;
function jfRuleList(){
 const el=document.getElementById('rulesList');if(!el)return;
 const rules=data.rules.slice().sort((a,b)=>getStudent(a.studentId).localeCompare(getStudent(b.studentId))||a.weekday-b.weekday||String(a.start).localeCompare(String(b.start)));
 for(const id of Array.from(jfDeleteSelection))if(!data.rules.some(r=>r.id===id))jfDeleteSelection.delete(id);
 if(jfDeleteSelection.size)jfSelectionMode=true;
 const grouped=new Map();
 for(const r of rules){const group=grouped.get(r.studentId)||[];group.push(r);grouped.set(r.studentId,group)}
 const total=rules.length;
 const toolbar=`<div class="jf-compact-toolbar"><div class="jf-compact-count"><strong>${total} horário${total===1?'':'s'} fixo${total===1?'':'s'}</strong><span>${grouped.size} aluno${grouped.size===1?'':'s'}</span></div><button class="jf-select-mode" type="button" onclick="jfSetSelectionMode()">${jfSelectionMode?'Concluir seleção':'Selecionar vários'}</button></div>`;
 const batch=jfSelectionMode?`<div class="jf-compact-batch"><span>${jfDeleteSelection.size} selecionado${jfDeleteSelection.size===1?'':'s'}</span><button type="button" class="jf-minor-link" onclick="jfToggleAllRules()">${total&&rules.every(r=>jfDeleteSelection.has(r.id))?'Desmarcar todos':'Selecionar todos'}</button><button type="button" class="jf-batch-delete" ${jfDeleteSelection.size?'':'disabled'} onclick="jfDeleteSelectedRules()">Excluir (${jfDeleteSelection.size})</button></div>`:'';
 let html='';
 for(const [studentId,list] of grouped){
   const student=safe(getStudent(studentId));
   html+=`<div class="jf-student-group"><div class="jf-student-group-head"><strong>${student}</strong><span>${list.length} horário${list.length===1?'':'s'}</span></div>`;
   for(const r of list){
     const state=jfRuleState(r),tone=state==='Ativa'?'active':state==='Pausada'?'paused':'ended';
     const when=`${safe(V1_DAYS[r.weekday])} · ${safe(r.start)}–${safe(r.end)}`;
     const location=safe(r.location||'Local não informado');
     html+=`<div class="jf-compact-rule" data-rule-id="${safe(r.id)}"><div class="jf-compact-rule-main">
       ${jfSelectionMode?`<label class="jf-compact-check"><input type="checkbox" ${jfDeleteSelection.has(r.id)?'checked':''} onchange="jfToggleRule('${r.id}',this.checked)" aria-label="Selecionar horário de ${student} ${safe(V1_DAYS[r.weekday])}"></label>`:''}
       <div class="jf-rule-text"><div class="jf-rule-title">${when}<span class="jf-rule-dot ${tone}" title="${state}" aria-label="${state}"></span></div><div class="jf-rule-caption">${location} · ${state}</div>${r.until?`<div class="jf-rule-caption">Até ${safe(r.until.split('-').reverse().join('/'))}</div>`:''}</div>
       </div><div class="jf-rule-compact-actions"><button type="button" class="jf-edit-compact" onclick="j11EditRule('${r.id}')">Editar</button>
       <details class="jf-more-details"><summary>Mais <span aria-hidden="true">⌄</span></summary><div class="jf-more-list">
       <button type="button" onclick="j11PauseRule('${r.id}');jfCloseMenus()">${state==='Pausada'?'Retomar':'Pausar / retomar'}</button>
       <button type="button" onclick="v1SplitRule('${r.id}');jfCloseMenus()">Alterar futuras</button>
       <button type="button" onclick="v1DeleteRule('${r.id}');jfCloseMenus()">Encerrar</button>
       <button type="button" class="jf-more-danger" onclick="jfDeleteRules(['${r.id}']);jfCloseMenus()">Excluir definitivamente</button>
       </div></details></div></div>`;
   }
   html+='</div>';
 }
 el.innerHTML=toolbar+batch+(html||'<div class="empty">Nenhuma regra semanal cadastrada.</div>');
}
function jfSetSelectionMode(){jfSelectionMode=!jfSelectionMode;if(!jfSelectionMode)jfDeleteSelection.clear();jfRuleList()}
function jfCloseMenus(){document.querySelectorAll('#rulesList details[open]').forEach(x=>x.open=false)}

v1RenderRules=jfRuleList;
function jfToggleRule(id,checked){if(checked)jfDeleteSelection.add(id);else jfDeleteSelection.delete(id);jfRuleList()}
function jfToggleAllRules(){const all=data.rules.map(r=>r.id);if(all.every(id=>jfDeleteSelection.has(id)))jfDeleteSelection.clear();else all.forEach(id=>jfDeleteSelection.add(id));jfRuleList()}
function jfDeleteSelectedRules(){jfDeleteRules(Array.from(jfDeleteSelection))}
function jfDeleteRules(ids){
 ids=[...new Set(ids)].filter(id=>data.rules.some(r=>r.id===id));if(!ids.length)return alert('Selecione pelo menos um horário fixo.');
 const dependents=data.makeups.filter(m=>ids.includes(m.originId));
 if(dependents.length)return alert('Há '+dependents.length+' reposição(ões) vinculada(s) a essas regras. Resolva ou cancele as reposições primeiro para preservar o histórico.');
 const labels=ids.map(id=>{const r=data.rules.find(x=>x.id===id);return getStudent(r.studentId)+' — '+V1_DAYS[r.weekday]+' '+r.start+'–'+r.end}).join('\n');
 const exceptions=data.exceptions.filter(x=>ids.includes(x.id)).length;
 const attendance=data.attendance.filter(x=>ids.includes(x.id)).length;
 if(!confirm('Excluir DEFINITIVAMENTE '+ids.length+' regra(s) cadastrada(s)?\n\n'+labels+'\n\nAs aulas geradas por essas regras desaparecerão da agenda, inclusive as anteriores. '+(exceptions+attendance?'Também serão removidos '+exceptions+' ajuste(s) pontual(is) e '+attendance+' registro(s) de presença/falta associados. ':'')+'\n\nOutros alunos, aulas avulsas e regras não serão alterados.'))return;
 if(prompt('Para confirmar a exclusão, digite EXCLUIR:')!=='EXCLUIR')return;
 try{
   // A local safety copy is retained before deletion, separate from the downloadable JSON backup.
   localStorage.setItem('jf-agenda-v112-before-rule-delete',JSON.stringify({application:'JF Agenda',exportedAt:new Date().toISOString(),data:structuredClone(data)}));
 }catch(err){alert('Não consegui salvar uma cópia de segurança antes de excluir. Libere espaço ou faça backup em Ajustes e tente novamente.');return}
 const set=new Set(ids);
 data.rules=data.rules.filter(r=>!set.has(r.id));
 data.exceptions=data.exceptions.filter(x=>!set.has(x.id));
 data.attendance=data.attendance.filter(x=>!set.has(x.id));
 ids.forEach(id=>jfDeleteSelection.delete(id));
 persist();renderStudents();renderAgenda();renderAvailability();j11RenderAll();
 alert(ids.length===1?'Horário fixo excluído. Você já pode cadastrá-lo novamente.':ids.length+' horários fixos excluídos. Você já pode cadastrá-los novamente.');
}
// Option to download the safety copy after a mistaken deletion.
function jfDownloadDeleteSafety(){const raw=localStorage.getItem('jf-agenda-v112-before-rule-delete');if(!raw)return alert('Não existe cópia anterior a uma exclusão neste dispositivo.');j11DownloadBlob(JSON.parse(raw),'jf-agenda-antes-da-exclusao.json')}
(function(){const el=document.getElementById('rulesList');if(el){el.insertAdjacentHTML('beforebegin','<p class="hint">Errou um cadastro? Use <b>Excluir</b> para apagar uma regra, ou selecione várias. O botão <b>Encerrar</b> apenas impede novas aulas.</p>');}
const settings=document.getElementById('page-config');if(settings){settings.insertAdjacentHTML('beforeend','<section class="panel"><h3>Segurança das exclusões</h3><p class="hint">O aplicativo guarda uma cópia local antes da última exclusão de horários fixos. Faça também backup JSON em Ajustes, fora do navegador.</p><button class="btn secondary" onclick="jfDownloadDeleteSafety()">Baixar cópia anterior à exclusão</button></section>');}
v1RenderRules();})();
