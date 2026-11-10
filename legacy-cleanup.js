/* JF Agenda v1.1.3: administra recorrências legadas de data.appointments.
   Registros antigos nunca são removidos automaticamente. */
'use strict';
const jfLegacySelected = new Set();
function jfLegacyEntries(){return data.appointments.filter(a=>a.recurrence==='weekly');}
function jfLegacyRender(){
 const root=document.getElementById('jfLegacyList');if(!root)return;
 const items=jfLegacyEntries();
 for(const id of jfLegacySelected)if(!items.some(a=>a.id===id))jfLegacySelected.delete(id);
 root.innerHTML=items.length?`<div class="jf-delete-toolbar"><span class="small muted">${items.length} recorrência(s) do sistema anterior. Estas aulas não aparecem na lista de regras novas e podem continuar bloqueando horários.</span><div class="jf-delete-actions"><button class="btn secondary tiny" onclick="jfLegacySelectAll()">${items.every(a=>jfLegacySelected.has(a.id))?'Desmarcar':'Selecionar todas'}</button><button class="btn danger tiny" ${jfLegacySelected.size?'':'disabled'} onclick="jfLegacyDeleteSelected()">Excluir selecionadas (${jfLegacySelected.size})</button></div></div>`+
 items.map(a=>`<div class="rule-entry jf-rule-card"><label class="jf-rule-select"><input type="checkbox" ${jfLegacySelected.has(a.id)?'checked':''} onchange="jfLegacyToggle('${safe(a.id)}',this.checked)"><span class="jf-rule-summary"><b>${safe(getStudent(a.studentId))}</b> <span class="pill">Antiga</span><span class="small muted">${safe(V1_DAYS[a.weekday]||V1_DAYS[v1Weekday(a.date)])} · ${safe(a.start)}–${safe(a.end)} · Desde ${safe(a.date)}</span><span class="small muted">${safe(a.location||'Local não informado')}</span></span></label><div class="jf-rule-buttons"><button class="btn danger tiny" onclick="jfLegacyDelete(['${safe(a.id)}'])">Excluir definitivamente</button></div></div>`).join(''):'<div class="empty">Nenhuma recorrência antiga encontrada. Os horários antigos não estão bloqueando sua agenda.</div>';
}
function jfLegacyToggle(id,checked){if(checked)jfLegacySelected.add(id);else jfLegacySelected.delete(id);jfLegacyRender()}
function jfLegacySelectAll(){const items=jfLegacyEntries();if(items.length&&items.every(a=>jfLegacySelected.has(a.id)))jfLegacySelected.clear();else items.forEach(a=>jfLegacySelected.add(a.id));jfLegacyRender()}
function jfLegacyDeleteSelected(){jfLegacyDelete([...jfLegacySelected])}
function jfLegacyDelete(ids){
 ids=[...new Set(ids)].filter(id=>jfLegacyEntries().some(a=>a.id===id));if(!ids.length)return alert('Selecione ao menos uma recorrência antiga.');
 const dependent=(data.makeups||[]).filter(m=>ids.includes(m.originId)||ids.includes(m.appointmentId));
 const offers=(data.offers||[]).filter(o=>ids.includes(o.appointmentId));
 if(dependent.length||offers.length)return alert('Há registros associados a estas aulas ('+dependent.length+' reposição(ões) e '+offers.length+' proposta(s)). Resolva os vínculos antes de excluir para não perder o histórico.');
 const labels=ids.map(id=>{const a=data.appointments.find(a=>a.id===id);return getStudent(a.studentId)+' — '+(V1_DAYS[a.weekday]||V1_DAYS[v1Weekday(a.date)])+' '+a.start+'–'+a.end}).join('\n');
 if(!confirm('Excluir DEFINITIVAMENTE '+ids.length+' recorrência(s) ANTIGA(S)?\n\n'+labels+'\n\nElas deixarão de aparecer em todas as semanas e os horários serão liberados. Registros de presença e exceções dessas regras também serão apagados. Os demais alunos, regras novas e aulas avulsas permanecerão.'))return;
 if(prompt('Digite EXCLUIR para confirmar:')!=='EXCLUIR')return;
 const snapshot=JSON.stringify({application:'JF Agenda',exportedAt:new Date().toISOString(),data:structuredClone(data)});
 try{localStorage.setItem('jf-agenda-v113-before-legacy-delete',snapshot)}catch(e){alert('Não foi possível criar uma cópia de segurança antes de excluir. Exporte um backup e libere espaço.');return}
 const idsSet=new Set(ids),previous=structuredClone(data);
 try{
   data.appointments=data.appointments.filter(a=>!idsSet.has(a.id));
   data.exceptions=data.exceptions.filter(e=>!idsSet.has(e.id));
   if(Array.isArray(data.attendance))data.attendance=data.attendance.filter(a=>!idsSet.has(a.id));
   persist();
 }catch(e){data=previous;try{persist()}catch{}alert('Falha ao salvar exclusão. Nenhum registro foi intencionalmente descartado.');return}
 ids.forEach(id=>jfLegacySelected.delete(id));
 renderStudents();renderAgenda();renderAvailability();if(typeof j11RenderAll==='function')j11RenderAll();
 alert('Recorrência(s) antiga(s) excluída(s). Os horários foram liberados.');
}
function jfLegacyDownloadSafety(){const raw=localStorage.getItem('jf-agenda-v113-before-legacy-delete');if(!raw)return alert('Nenhuma cópia de exclusão antiga neste navegador.');j11DownloadBlob(JSON.parse(raw),'jf-agenda-antes-de-excluir-recorrencia-antiga.json')}
(function(){
 const weekly=document.getElementById('rulesList');if(!weekly)return;
 const panel=weekly.closest('.panel');panel.insertAdjacentHTML('afterend','<section class="panel"><h3>Horários semanais antigos</h3><p class="hint">Se uma aula ainda aparecer como <b>Semanal (antigo)</b> após excluir uma regra, ela foi criada no sistema anterior. Exclua-a aqui para liberar o horário. Faça backup JSON antes.</p><div id="jfLegacyList"></div><button class="btn secondary mt" onclick="jfLegacyDownloadSafety()">Baixar cópia da última exclusão antiga</button></section>');
 const before=renderStudents;renderStudents=function(){before();jfLegacyRender()};
 jfLegacyRender();
})();
