/* JF Agenda v1.1.2 — exclusão controlada de recorrências incorretas. */
'use strict';
const jfDeleteSelection = new Set();
const jfRuleListBeforeDelete = v1RenderRules;
function jfRuleState(r){return r.until&&r.until<today()?'Encerrada':r.pauseFrom?'Pausada':'Ativa'}
function jfRuleList(){
 const el=document.getElementById('rulesList');if(!el)return;
 const rules=data.rules.slice().sort((a,b)=>getStudent(a.studentId).localeCompare(getStudent(b.studentId))||a.weekday-b.weekday||String(a.start).localeCompare(String(b.start)));
 for(const id of Array.from(jfDeleteSelection))if(!data.rules.some(r=>r.id===id))jfDeleteSelection.delete(id);
 el.innerHTML=`<div class="jf-delete-toolbar"><div><strong>Gerenciar horários cadastrados</strong><div class="small muted">Marque os lançamentos incorretos para excluí-los de uma vez. Encerrar mantém o histórico.</div></div><div class="jf-delete-actions"><button class="btn secondary tiny" onclick="jfToggleAllRules()">${rules.length&&rules.every(r=>jfDeleteSelection.has(r.id))?'Desmarcar todas':'Selecionar todas'}</button><button class="btn danger tiny" ${jfDeleteSelection.size?'':'disabled'} onclick="jfDeleteSelectedRules()">Excluir selecionadas (${jfDeleteSelection.size})</button></div></div>`+
 (rules.length?rules.map(r=>`<div class="rule-entry jf-rule-card"><label class="jf-rule-select"><input type="checkbox" ${jfDeleteSelection.has(r.id)?'checked':''} onchange="jfToggleRule('${r.id}',this.checked)" aria-label="Selecionar regra de ${safe(getStudent(r.studentId))} ${safe(V1_DAYS[r.weekday])}"><span class="jf-rule-summary"><b>${safe(getStudent(r.studentId))}</b> <span class="pill">${jfRuleState(r)}</span><span class="small muted">${safe(v1RuleText(r))}</span><span class="small muted">Desde ${safe(r.from)}${r.until?' até '+safe(r.until):''}</span></span></label><div class="jf-rule-buttons"><button class="btn secondary tiny" onclick="j11EditRule('${r.id}')">Editar</button><button class="btn secondary tiny" onclick="j11PauseRule('${r.id}')">Pausar / retomar</button><button class="btn secondary tiny" onclick="v1SplitRule('${r.id}')">Alterar futuras</button><button class="btn secondary tiny" onclick="v1DeleteRule('${r.id}')">Encerrar</button><button class="btn danger tiny" onclick="jfDeleteRules(['${r.id}'])">Excluir</button></div></div>`).join(''):'<div class="empty">Nenhuma regra semanal cadastrada.</div>');
}
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
