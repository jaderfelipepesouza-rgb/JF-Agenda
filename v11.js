'use strict';
/* JF Agenda v1.1 - compatibility layer; keeps jf-agenda-v01 key and v1.0 data. */
const J11_DAYS=['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];
const J11_BACKUP_KEY='jf-agenda-v11-pre-migration';
const j11Obj=(v)=>v&&typeof v==='object'&&!Array.isArray(v);
const j11ISO=(d)=>/^\d{4}-\d{2}-\d{2}$/.test(d||'')&&!Number.isNaN(dateObj(d).getTime())&&addDays(d,0)===d;
const j11Range=(a,b)=>j11ISO(a)&&j11ISO(b)&&a<=b;
const j11Clean=(s)=>safe(String(s??''));
function j11Ensure(){
  if(!Array.isArray(data.locations))data.locations=[];
  if(!Array.isArray(data.travelTimes))data.travelTimes=[];
  if(!Array.isArray(data.attendance))data.attendance=[];
  if(!Array.isArray(data.offers))data.offers=[];
  if(!Array.isArray(data.makeups))data.makeups=[];
  if(!Array.isArray(data.blocks))data.blocks=[];
  if(!Array.isArray(data.rules))data.rules=[];
  if(!Array.isArray(data.exceptions))data.exceptions=[];
  if(!Array.isArray(data.appointments))data.appointments=[];
  if(!Array.isArray(data.students))data.students=[];
  if(!j11Obj(data.settings.locationBuffers))data.settings.locationBuffers={};
  if(!j11Obj(data.messageSettings))data.messageSettings={dateMode:'weekday',template:'horarios'};
  if(!j11Obj(data.messages))data.messages={};
  for(const [key,t] of Object.entries(V1_TEMPLATES))if(typeof data.messages[key]!=='string')data.messages[key]=t.text;
  data.rules.forEach(r=>{if(r.active===false&&!r.pauseFrom&&!r.pausedRanges?.length){r.pauseFrom=r.from;}if(!Array.isArray(r.pausedRanges))r.pausedRanges=[];});
  data.version=3;
}
if(data.version<3){try{localStorage.setItem(J11_BACKUP_KEY,JSON.stringify({application:'JF Agenda',exportedAt:new Date().toISOString(),data:structuredClone(data)}))}catch(err){console.warn('Não foi possível gerar cópia automática pré-migração:',err)}j11Ensure();persist()}
else j11Ensure();
function j11RuleActive(r,date){
  const activeDay=r.weekday===v1Weekday(date)&&date>=r.from&&(!r.until||date<=r.until);
  if(!activeDay)return false;
  if(r.pauseFrom&&date>=r.pauseFrom&&(!r.pauseUntil||date<=r.pauseUntil))return false;
  if((r.pausedRanges||[]).some(p=>date>=p.from&&(!p.until||date<=p.until)))return false;
  return r.active!==false||date<(r.pauseFrom||r.from);
}
v1RuleOccurs=j11RuleActive;
function j11BlockAt(b,d){return (b.date===d)||(b.from&&b.until&&d>=b.from&&d<=b.until)}
function j11Attendance(id,date){return data.attendance.find(x=>x.id===id&&x.date===date)}
const j11OldAll=fullAppointments;
fullAppointments=function(date){
 const existing=j11OldAll(date).filter(a=>a.kind!=='rule'||j11RuleActive(data.rules.find(r=>r.id===a.id)||{},a.occurrenceDate));
 // v1 engine excludes paused rules based on a mutable active field; restore only valid historic occurrences.
 for(const r of data.rules){if(!j11RuleActive(r,date)||existing.some(a=>a.kind==='rule'&&a.id===r.id))continue;const ex=v1Exceptions(r.id,date);if(ex?.cancelled||ex?.replacement)continue;
 existing.push({id:r.id,originId:r.id,studentId:r.studentId,location:ex?.location??r.location,start:ex?.start??r.start,end:ex?.end??r.end,recurrence:'weekly',kind:'rule',occurrenceDate:date,weekday:r.weekday,startM:min(ex?.start??r.start),endM:min(ex?.end??r.end),date});}
 // Appointment instances created from a makeup are still normal appointments.
 return existing.sort((a,b)=>a.startM-b.startM);
};
function j11Travel(a,b){if(!a||!b||a.trim().toLowerCase()===b.trim().toLowerCase())return 0;let t=data.travelTimes.find(t=>(t.from===a&&t.to===b)||(t.from===b&&t.to===a));return t?Number(t.minutes)||0:0}
function j11Blocked(d,s,e){return data.blocks.some(b=>j11BlockAt(b,d)&&overlaps(s,e,min(b.start),min(b.end),0))}
function j11Conflict(d,s,e,ex=null,location=''){
 const busy=fullAppointments(d).filter(a=>!(ex&&a.id===ex.id&&a.occurrenceDate===ex.date));
 const buffer=Math.max(0,Number(data.settings.buffer)||0);
 if(j11Blocked(d,min(s),min(e)))return 'Conflito com bloqueio de agenda.';
 for(const a of busy){let before=j11Travel(location,a.location),after=j11Travel(a.location,location);
  if(min(s)<a.endM+Math.max(buffer,after)&&min(e)>a.startM-Math.max(buffer,before))return 'Conflito com '+getStudent(a.studentId)+' ('+a.start+'–'+a.end+') ou deslocamento necessário.';
 }
 if(data.offers.some(o=>o.status==='reserved'&&o.slots?.some(slt=>slt.date===d&&overlaps(min(s),min(e),slt.start,slt.end))))return 'Conflito com reserva provisória.';
 return '';
}
v1Conflicts=function(d,s,e,ex){return !!j11Conflict(d,s,e,ex)};
function j11DateArray(from,to){const arr=[];for(let d=from;d<=to;d=addDays(d,1)){arr.push(d);if(arr.length>367)break}return arr}
function j11ValidateRule(r,exclude){
 if(!j11ISO(r.from)||r.until&&!j11Range(r.from,r.until)||!v1ValidRange(r.start,r.end))return 'Datas ou horários inválidos.';
 const until=r.until&&r.until<addDays(r.from,365)?r.until:addDays(r.from,365);
 for(const d of j11DateArray(r.from,until)){if(v1Weekday(d)!==r.weekday||!j11RuleActive({...r,active:true},d))continue;const error=j11Conflict(d,r.start,r.end,exclude?{id:exclude,date:d}:null,r.location);if(error)return error+' Data: '+fmtDate(d)}return '';
}
v1RecurringCheck=j11ValidateRule;
const j11OldFree=freeIntervals;
freeIntervals=function(date){const w=data.settings.working[v1Weekday(date)];if(!w?.on||!v1ValidRange(w.start,w.end)&&min(w.end)<=min(w.start))return [];
 const from=min(w.start),to=min(w.end),buffer=Math.max(0,Number(data.settings.buffer)||0);
 const busy=fullAppointments(date).map(a=>[a.startM-buffer,a.endM+buffer]);
 const blocks=data.blocks.filter(b=>j11BlockAt(b,date)).map(b=>[min(b.start),min(b.end)]);
 const reservations=data.offers.filter(o=>o.status==='reserved').flatMap(o=>(o.slots||[]).filter(s=>s.date===date).map(s=>[s.start,s.end]));
 const sorted=[...busy,...blocks,...reservations].map(([s,e])=>[Math.max(from,s),Math.min(to,e)]).filter(([s,e])=>s<e).sort((a,b)=>a[0]-b[0]);
 const ans=[];let cursor=from;for(const [s,e] of sorted){if(s>cursor)ans.push([cursor,s]);cursor=Math.max(cursor,e)}if(cursor<to)ans.push([cursor,to]);return ans;
};
function j11Selected(){return chosen().map(s=>({...s}))}
function j11CurrentRecipient(){let id=document.getElementById('j11-recipient')?.value;return data.students.find(s=>s.id===id)||null}
function j11FmtLocation(s){let recipient=j11CurrentRecipient();return document.getElementById('j11-msgLocation')?.value.trim()||recipient?.location||''}
function j11SlotsText(slots,mode){if(!slots.length)return '(nenhum horário selecionado)';if(mode==='dated'){
 const grouped=new Map();for(const s of slots){if(!grouped.has(s.date))grouped.set(s.date,new Map());grouped.get(s.date).set(s.start+'-'+s.end,s)}
 return [...grouped.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([d,entries])=>'📅 '+fmtDate(d)+'\n'+[...entries.values()].sort((a,b)=>a.start-b.start).map(s=>'• '+timeLabel(s.start)+' às '+timeLabel(s.end)).join('\n')).join('\n\n');}
 const grouped=new Map();for(const s of slots){let d=v1Weekday(s.date);if(!grouped.has(d))grouped.set(d,new Map());grouped.get(d).set(s.start+'-'+s.end,s)}
 return [...grouped.entries()].sort((a,b)=>(a[0]+6)%7-(b[0]+6)%7).map(([d,entries])=>'📅 '+J11_DAYS[d]+'\n'+[...entries.values()].sort((a,b)=>a.start-b.start).map(s=>'• '+timeLabel(s.start)+' às '+timeLabel(s.end)).join('\n')).join('\n\n');
}
makeMessage=function(){const slots=j11Selected();const mode=document.getElementById('v1-dateMode')?.value||'weekday';const id=document.getElementById('v1-template')?.value||'horarios';const template=data.messages[id]||V1_TEMPLATES.horarios.text;const student=j11CurrentRecipient();const first=slots[0];const name=student?.name||document.getElementById('v1-recipient')?.value.trim()||'aluno';const locale=j11FmtLocation();const value={nome:name,horarios:j11SlotsText(slots,mode),data:first?fmtDate(first.date):'(data não selecionada)',hora:first?timeLabel(first.start):'(horário não selecionado)',local:locale||'(local não informado)',dia:first?J11_DAYS[v1Weekday(first.date)]:'(dia não selecionado)',duracao:first?String(first.end-first.start)+' min':'(duração não selecionada)'};
 return template.replace(/\{(nome|horarios|data|hora|local|dia|duracao)\}/g,(_,key)=>value[key]);};
const j11PrevRenderMessage=renderMessage;
renderMessage=function(){j11PrevRenderMessage();const p=document.getElementById('j11-previewHint');if(p)p.textContent=document.getElementById('v1-dateMode')?.value==='weekday'?'Horários semanais sem datas — um dia pode representar várias semanas.':'Datas específicas — indicado para reposições e encaixes pontuais.'};
function j11NewEl(html,target,where='beforeend'){document.querySelector(target)?.insertAdjacentHTML(where,html)}
function j11SelectStudents(el,selected=''){let select=document.getElementById(el);if(!select)return;select.innerHTML='<option value="">Escolha o aluno</option>'+data.students.map(s=>`<option value="${safe(s.id)}">${safe(s.name)}</option>`).join('');select.value=selected}
function j11SetupUI(){
 document.head.insertAdjacentHTML('beforeend','<link rel="stylesheet" href="./v11.css">');
 j11NewEl(`<div class="panel" id="j11StudentPanel"><h2>Editar aluno e histórico</h2><label class="field">Selecione um aluno<select id="j11-studentSelector" onchange="j11StudentInfo()"></select></label><div class="grid"><label class="field">Nome<input id="j11-studentName" maxlength="100"></label><label class="field">Telefone<input id="j11-studentPhone" maxlength="40"></label></div><label class="field">Academia principal<input id="j11-studentLocation" list="j11-locationsData" maxlength="100"></label><div class="actions"><button class="btn" onclick="j11SaveStudent()">Salvar alterações</button><button class="btn secondary" onclick="j11OpenRuleStudent()">+ Horário fixo deste aluno</button></div><div id="j11-studentHistory" class="mt"></div></div>`, '#page-alunos');
 j11NewEl(`<div class="panel" id="j11OfferPanel"><h2>Histórico de horários oferecidos</h2><p class="hint">Registre a proposta antes de enviar. Enviar não reserva automaticamente; marque uma proposta como provisória se precisar bloquear os horários.</p><div class="actions"><button class="btn" onclick="j11SaveOffer()">Registrar proposta atual</button></div><div id="j11-offersList"></div></div>`, '#page-disponibilidade');
 j11NewEl(`<div class="panel" id="j11PlacesPanel"><h2>Academias e deslocamentos</h2><div class="grid"><label class="field">Nome do local<input id="j11-placeName" placeholder="Academia / estúdio"></label><label class="field">Tempo até outro local (min)<input id="j11-travelMinutes" type="number" min="0" max="240" value="15"></label><label class="field">De<select id="j11-fromPlace"></select></label><label class="field">Para<select id="j11-toPlace"></select></label></div><div class="actions"><button class="btn" onclick="j11AddPlace()">Adicionar local</button><button class="btn secondary" onclick="j11AddTravel()">Salvar deslocamento</button></div><div id="j11-placesList"></div><datalist id="j11-locationsData"></datalist></div>`, '#page-config');
 j11NewEl(`<p id="j11-previewHint" class="hint"></p><div class="grid"><label class="field">Aluno destinatário<select id="j11-recipient" onchange="j11OnRecipient()"></select></label><label class="field">Local da mensagem (opcional)<input id="j11-msgLocation" placeholder="Academia / estúdio" oninput="renderMessage()"></label></div><div class="actions"><button class="btn secondary tiny" onclick="j11ResetMessage()">Regerar texto</button><button class="btn secondary tiny" onclick="j11DeleteTemplate()">Excluir modelo personalizado</button></div>`, '#v1-finalText','afterend');
 j11NewEl(`<div class="panel" id="j11VacationPanel"><h2>Bloqueio de vários dias / férias</h2><div class="grid"><label class="field">De<input id="j11-vacFrom" type="date"></label><label class="field">Até<input id="j11-vacTo" type="date"></label><label class="field">Horário inicial<input id="j11-vacStart" inputmode="numeric" value="00:00"></label><label class="field">Horário final<input id="j11-vacEnd" inputmode="numeric" value="23:59"></label></div><label class="field">Motivo<input id="j11-vacName" value="Férias"></label><button class="btn" onclick="j11Vacation()">Bloquear período de datas</button></div>`, '#page-config');
 j11NewEl(`<div class="panel"><h2>Frequência e relatório detalhado</h2><p class="hint">Selecione um período no relatório acima e calcule a ocupação. Neste painel, registre presença e faltas pela agenda; cancelamentos e reposições aparecem no resumo detalhado.</p><div id="j11-reportExtra"></div></div>`, '#page-config');
 const backupPanel=[...document.querySelectorAll('#page-config .panel')].find(p=>p.textContent.includes('Segurança e limitações'));
 backupPanel?.insertAdjacentHTML('beforeend','<p class="hint">Backup local não substitui backup em nuvem. Ao restaurar, será criada uma cópia de segurança do estado atual quando possível.</p><button class="btn secondary" onclick="j11DownloadBackup()">Baixar backup completo v1.1</button><button class="btn secondary" onclick="j11DownloadPrevious()">Baixar dados pré-atualização</button>');
 j11NewEl(`<div class="panel"><h2>Ocorrências de reposição</h2><p class="hint">Selecione uma reposição em Ajustes para agendar; o horário confirmado ficará na agenda como aula avulsa vinculada.</p></div>`, '#page-agenda');
 document.querySelector('#j11-vacFrom').value=today();document.querySelector('#j11-vacTo').value=today();
 document.getElementById('v1-recipient').placeholder='Nome livre (se não selecionar aluno)';
 document.querySelector('#v1-templateDialog .hint').textContent='Variáveis: {nome}, {horarios}, {data}, {hora}, {local}, {dia}, {duracao}. Se houver vários horários, use {horarios}.';
 // Mark all HH:MM controls as text to avoid clipped Android native picker.
 v1ConvertTimes();j11RenderAll();
}
function j11RenderAll(){j11SelectStudents('j11-studentSelector',document.getElementById('j11-studentSelector')?.value);j11SelectStudents('j11-recipient',document.getElementById('j11-recipient')?.value);j11Places();j11StudentInfo();j11Offers();j11RenderMakeups();renderMessage();}
function j11OnRecipient(){let s=j11CurrentRecipient();if(s?.location)document.getElementById('j11-msgLocation').value=s.location;renderMessage()}
function j11ResetMessage(){v1ManuallyEdited=false;document.getElementById('v1-finalText').value='';renderMessage()}
function j11DeleteTemplate(){const key=document.getElementById('v1-template').value;if(!key.startsWith('custom-'))return alert('Os modelos padrão não podem ser excluídos.');if(!confirm('Excluir este modelo?'))return;delete data.messages[key];delete data.messageTitles?.[key];data.messageSettings.template='horarios';persist();v1RenderTemplateSelect();document.getElementById('v1-template').value='horarios';v1ManuallyEdited=false;renderMessage()}
function j11StudentInfo(){const id=document.getElementById('j11-studentSelector')?.value;const s=data.students.find(x=>x.id===id);for(const [k,v] of [['Name',s?.name||''],['Phone',s?.phone||''],['Location',s?.location||'']]){let input=document.getElementById('j11-student'+k);if(input)input.value=v}
 const el=document.getElementById('j11-studentHistory');if(!el)return;if(!s){el.innerHTML='<p class="hint">Selecione um aluno para ver seu histórico.</p>';return}
 const rules=data.rules.filter(r=>r.studentId===id),app=data.appointments.filter(a=>a.studentId===id),mk=data.makeups.filter(m=>m.studentId===id);
 const recent=data.attendance.filter(a=>data.rules.find(r=>r.id===a.id)?.studentId===id||data.appointments.find(x=>x.id===a.id)?.studentId===id);
 el.innerHTML=`<p class="hint">${rules.length} horários fixos · ${app.length} aulas avulsas/antigas · ${mk.length} reposições · ${recent.length} registros de presença/falta</p>`+rules.map(r=>`<div class="item"><span>${J11_DAYS[r.weekday]} ${safe(r.start)}–${safe(r.end)}</span><button class="btn secondary tiny" onclick="v1EditRule('${r.id}')">Editar</button></div>`).join('')+mk.map(m=>`<div class="item"><span>Reposição ${safe(m.date)} · ${safe(m.status)}</span></div>`).join('');
}
function j11SaveStudent(){const id=document.getElementById('j11-studentSelector').value,s=data.students.find(x=>x.id===id);if(!s)return alert('Selecione um aluno');let name=document.getElementById('j11-studentName').value.trim();if(!name)return alert('Informe o nome');s.name=name;s.phone=document.getElementById('j11-studentPhone').value.trim();s.location=document.getElementById('j11-studentLocation').value.trim();persist();renderStudents();j11RenderAll();renderAgenda()}
function j11OpenRuleStudent(){const id=document.getElementById('j11-studentSelector').value;if(!id)return alert('Selecione um aluno');v1EditRule();document.getElementById('v1-ruleForm').elements.studentId.value=id}
const j11OldRenderStudents=renderStudents;
renderStudents=function(){j11OldRenderStudents();j11SelectStudents('j11-studentSelector',document.getElementById('j11-studentSelector')?.value);j11SelectStudents('j11-recipient',document.getElementById('j11-recipient')?.value);j11StudentInfo()};
deleteStudent=function(id){if(data.appointments.some(x=>x.studentId===id)||data.rules.some(x=>x.studentId===id)||data.makeups.some(x=>x.studentId===id))return alert('Há atendimentos, regras ou reposições associados. Preserve o histórico e não exclua este aluno.');if(confirm('Excluir aluno sem histórico?')){data.students=data.students.filter(x=>x.id!==id);persist();renderStudents();j11RenderAll()}};
function j11Places(){const localOptions=data.locations.map(p=>`<option value="${safe(p.name)}">${safe(p.name)}</option>`).join('');let dl=document.getElementById('j11-locationsData');if(dl)dl.innerHTML=localOptions;
 for(const id of ['j11-fromPlace','j11-toPlace']){let el=document.getElementById(id);if(!el)continue;let selected=el.value;el.innerHTML='<option value="">Selecione…</option>'+data.locations.map(l=>`<option value="${safe(l.name)}">${safe(l.name)}</option>`).join('');el.value=selected}
 const root=document.getElementById('j11-placesList');if(root)root.innerHTML=data.locations.map(l=>`<div class="item"><b>${safe(l.name)}</b><button class="btn danger tiny" onclick="j11RemovePlace('${l.id}')">Excluir</button></div>`).join('')+data.travelTimes.map(t=>`<div class="item"><span>${safe(t.from)} ↔ ${safe(t.to)} · ${t.minutes} min</span><button class="btn danger tiny" onclick="j11DeleteTravel('${t.id}')">Excluir</button></div>`).join('');}
function j11AddPlace(){let name=document.getElementById('j11-placeName').value.trim();if(!name)return alert('Informe o nome do local.');if(data.locations.some(l=>l.name.toLowerCase()===name.toLowerCase()))return alert('Local já cadastrado.');data.locations.push({id:uid(),name});persist();document.getElementById('j11-placeName').value='';j11Places()}
function j11RemovePlace(id){let l=data.locations.find(x=>x.id===id);if(!l||!confirm('Remover o local da lista? Os atendimentos existentes manterão o texto.'))return;data.locations=data.locations.filter(x=>x.id!==id);data.travelTimes=data.travelTimes.filter(t=>t.from!==l.name&&t.to!==l.name);persist();j11Places()}
function j11AddTravel(){let from=document.getElementById('j11-fromPlace').value,to=document.getElementById('j11-toPlace').value,minutes=Number(document.getElementById('j11-travelMinutes').value);if(!from||!to||from===to||!Number.isInteger(minutes)||minutes<0||minutes>240)return alert('Informe dois locais distintos e minutos válidos.');let found=data.travelTimes.find(t=>(t.from===from&&t.to===to)||(t.from===to&&t.to===from));if(found)found.minutes=minutes;else data.travelTimes.push({id:uid(),from,to,minutes});persist();j11Places();renderAvailability()}
function j11DeleteTravel(id){data.travelTimes=data.travelTimes.filter(t=>t.id!==id);persist();j11Places();renderAvailability()}
function j11OfferSlots(){return j11Selected().map(s=>({date:s.date,start:s.start,end:s.end}));}
function j11SaveOffer(){const slots=j11OfferSlots();if(!slots.length)return alert('Selecione pelo menos um horário.');data.offers.push({id:uid(),createdAt:new Date().toISOString(),studentId:j11CurrentRecipient()?.id||null,recipient:j11CurrentRecipient()?.name||document.getElementById('v1-recipient')?.value.trim()||'',message:document.getElementById('v1-finalText')?.value||makeMessage(),slots,status:'offered'});persist();j11Offers();alert('Proposta registrada. Ela não bloqueia automaticamente a agenda.')}
function j11Offers(){const el=document.getElementById('j11-offersList');if(!el)return;el.innerHTML=data.offers.slice().reverse().map(o=>`<div class="item"><div class="item-main"><b>${safe(o.recipient||'Destinatário não informado')}</b> <span class="pill">${safe(o.status==='reserved'?'Provisória':o.status==='confirmed'?'Confirmada':o.status==='expired'?'Encerrada':'Oferecida')}</span><div class="small muted">${safe((o.slots||[]).map(s=>s.date+' '+time(s.start)).slice(0,5).join(' · '))}</div><div class="small muted">${safe((o.createdAt||'').slice(0,10))}</div></div><div class="actions"><button class="btn secondary tiny" onclick="j11OfferStatus('${o.id}','reserved')">Reservar</button><button class="btn secondary tiny" onclick="j11OfferStatus('${o.id}','confirmed')">Confirmar</button><button class="btn secondary tiny" onclick="j11OfferStatus('${o.id}','expired')">Encerrar</button></div></div>`).join('')||'<p class="hint">Nenhuma proposta registrada.</p>'}
function j11OfferStatus(id,status){const o=data.offers.find(o=>o.id===id);if(!o)return;if(status==='reserved'){
 if((o.slots||[]).some(s=>{const conflicts=fullAppointments(s.date).some(a=>overlaps(s.start,s.end,a.startM,a.endM))||j11Blocked(s.date,s.start,s.end)||data.offers.some(other=>other.id!==id&&other.status==='reserved'&&(other.slots||[]).some(t=>t.date===s.date&&overlaps(t.start,t.end,s.start,s.end)));return conflicts}))return alert('Um dos horários já está ocupado. Ajuste a proposta antes de reservar.');
 if(!confirm('Reservar provisoriamente TODOS os horários desta proposta? Eles ficarão indisponíveis até encerrar ou confirmar.'))return;
 } if(status==='confirmed'){
  if(!o.studentId||!data.students.some(s=>s.id===o.studentId))return alert('Para confirmar uma proposta, selecione um aluno cadastrado ao criar a proposta.');
  const slots=o.slots||[];if(!slots.length)return alert('Esta proposta não contém horários.');
  const choice=prompt('Qual opção foi aceita? Digite um número de 1 a '+slots.length+'\n'+slots.map((s,i)=>(i+1)+'. '+fmtDate(s.date)+' '+time(s.start)+'–'+time(s.end)).join('\n'),'1');
  if(choice===null)return;
  const n=Number(choice);if(!Number.isInteger(n)||n<1||n>slots.length)return alert('Escolha um número válido.');
  const selected=slots[n-1];const start=time(selected.start),end=time(selected.end);
  const place=prompt('Local do atendimento:',data.students.find(s=>s.id===o.studentId)?.location||'');if(place===null)return;
  const current=o.status;o.status='offered';
  const error=j11Conflict(selected.date,start,end,null,place.trim());
  if(error){o.status=current;return alert(error)}
  const a={id:uid(),studentId:o.studentId,date:selected.date,start,end,location:place.trim(),recurrence:'once',weekday:v1Weekday(selected.date),offerId:o.id};
  data.appointments.push(a);o.status='confirmed';o.confirmedSlot=selected;o.appointmentId=a.id;o.updatedAt=new Date().toISOString();
  persist();j11Offers();renderAgenda();renderAvailability();alert('Aula confirmada na agenda. Os demais horários da proposta foram liberados.');return;
 }
 o.status=status;persist();j11Offers();renderAvailability();renderAgenda()}
function j11Vacation(){let from=document.getElementById('j11-vacFrom').value,until=document.getElementById('j11-vacTo').value,start=document.getElementById('j11-vacStart').value,end=document.getElementById('j11-vacEnd').value,name=document.getElementById('j11-vacName').value.trim()||'Férias';if(!j11Range(from,until)||!v1ValidRange(start,end)&&!(start==='00:00'&&end==='23:59')||j11DateArray(from,until).length>366)return alert('Período inválido ou superior a 366 dias.');
 const busy=j11DateArray(from,until).filter(d=>fullAppointments(d).some(a=>overlaps(min(start),min(end),a.startM,a.endM)));
 if(busy.length&&!confirm(`Há ${busy.length} dia(s) com aulas neste período. Bloquear mesmo assim? As aulas continuarão visíveis e deverão ser canceladas individualmente.`))return;
 data.blocks.push({id:uid(),from,until,name,start,end});persist();v1RenderBlocks();renderAgenda();renderAvailability()}
const j11OldRenderBlocks=v1RenderBlocks;
v1RenderBlocks=function(){const el=document.getElementById('v1-blocksList');if(!el)return;el.innerHTML=data.blocks.slice().sort((a,b)=>(a.from||a.date).localeCompare(b.from||b.date)).map(b=>`<div class="item"><div>${safe(fmtDate(b.from||b.date))}${b.until?' até '+safe(fmtDate(b.until)):''} · ${safe(b.start)}–${safe(b.end)}<div class="small muted">${safe(b.name)}</div></div><button class="btn danger tiny" onclick="v1DeleteBlock('${b.id}')">Excluir</button></div>`).join('')||'<p class="hint">Nenhum bloqueio.</p>'};
// Distinguish dated cancellation and attendance from a recurring rule's lifetime.
function j11Status(id,date,status){let existing=data.attendance.find(x=>x.id===id&&x.date===date);if(existing)existing.status=status;else data.attendance.push({id,date,status,updatedAt:new Date().toISOString()});persist();renderAgenda();j11StudentInfo()}
function j11OccurrenceStatus(id,date){return j11Attendance(id,date)?.status||'scheduled'}
v1EventMarkup=function(a,date){const label=a.kind==='rule'?'Fixo semanal':a.kind==='moved'?'Remarcada':a.kind==='legacy'?'Semanal (antigo)':'Avulso';const att=j11OccurrenceStatus(a.id,a.occurrenceDate);const tag=att==='done'?'Realizada':att==='absent'?'Falta registrada':att==='cancelled'?'Cancelada':'Prevista';return `<div class="item"><div class="item-main"><div class="time">${safe(a.start)}–${safe(a.end)} · ${safe(getStudent(a.studentId))}</div><div class="small muted">${safe(a.location||'Local não informado')} · ${label} · ${tag}</div></div><div class="actions"><button class="btn secondary tiny" onclick="v1OpenOccurrence('${a.id}','${a.occurrenceDate}','${date}')">Remarcar</button><button class="btn secondary tiny" onclick="j11Status('${a.id}','${a.occurrenceDate}','done')">Feita</button><button class="btn secondary tiny" onclick="j11Status('${a.id}','${a.occurrenceDate}','absent')">Falta</button><button class="btn danger tiny" onclick="v1CancelOccurrence('${a.id}','${a.occurrenceDate}','${date}')">Cancelar</button></div></div>`};
const j11OldCancel=v1CancelOccurrence;
v1CancelOccurrence=function(id,original,display){j11OldCancel(id,original,display);const ex=data.exceptions.find(x=>x.id===id&&x.date===original);if(ex?.cancelled||!data.appointments.some(a=>a.id===id)){j11Status(id,original,'cancelled');}}
const j11OldSaveOccurrence=v1SaveOccurrence;
v1SaveOccurrence=function(){const x=v1EditingOccurrence;if(!x)return;const date=document.getElementById('v1-occurDate').value,start=document.getElementById('v1-occurStart').value,end=document.getElementById('v1-occurEnd').value,location=document.getElementById('v1-occurLocation').value.trim();if(!j11ISO(date)||!v1ValidRange(start,end))return alert('Data ou horários inválidos.');const err=j11Conflict(date,start,end,{id:x.id,date:x.originDate},location);if(err)return alert(err);j11OldSaveOccurrence()};
// Preserve historical occurrences when pausing rules; editable cutoffs, never delete old rules.
v1RenderRules=function(){const el=document.getElementById('rulesList');if(!el)return;el.innerHTML=data.rules.slice().sort((a,b)=>getStudent(a.studentId).localeCompare(getStudent(b.studentId))||a.weekday-b.weekday).map(r=>`<div class="rule-entry"><div class="actions"><div class="grow"><b>${safe(getStudent(r.studentId))}</b> <span class="pill">${r.until&&r.until<today()?'Encerrada':r.pauseFrom?'Pausada':'Ativa'}</span><div class="small muted">${safe(v1RuleText(r))} · Desde ${safe(r.from)} ${r.until?'até '+safe(r.until):''}</div></div><button class="btn secondary tiny" onclick="j11EditRule('${r.id}')">Editar</button><button class="btn secondary tiny" onclick="j11PauseRule('${r.id}')">Pausar / retomar</button><button class="btn secondary tiny" onclick="v1SplitRule('${r.id}')">Alterar futuras</button><button class="btn danger tiny" onclick="v1DeleteRule('${r.id}')">Encerrar</button></div></div>`).join('')||'<div class="empty">Nenhuma recorrência.</div>'};
function j11EditRule(id){const r=data.rules.find(x=>x.id===id);if(!r)return;const when=prompt('Editar horário a partir de qual data? (AAAA-MM-DD). Para preservar o histórico, a alteração será aplicada apenas a partir dessa data.',today());if(!when)return;if(!j11ISO(when)||when<=r.from||r.until&&when>r.until)return alert('Informe uma data posterior ao início da regra, dentro da vigência.');const oldUntil=r.until;const nr={...structuredClone(r),id:uid(),from:when,until:oldUntil,pauseFrom:null,pauseUntil:null,pausedRanges:[]};r.until=addDays(when,-1);data.rules.push(nr);persist();v1EditRule(nr.id);renderStudents()}
function j11PauseRule(id){const r=data.rules.find(x=>x.id===id);if(!r)return;if(r.pauseFrom){const resume=prompt('Retomar a recorrência a partir de qual data? AAAA-MM-DD',today());if(!j11ISO(resume)||resume<r.pauseFrom)return alert('Data inválida.');r.pausedRanges??=[];r.pausedRanges.push({from:r.pauseFrom,until:addDays(resume,-1)});r.pauseFrom=null;r.pauseUntil=null;r.active=true;}else{const from=prompt('Pausar a partir de qual data? AAAA-MM-DD',today());if(!j11ISO(from)||from<r.from)return alert('Data inválida.');r.pauseFrom=from;r.active=true;}persist();v1RenderRules();renderAgenda();renderAvailability()}
// Guard against accidentally editing historical rule in place from the old modal.
const j11OldSaveRule=v1SaveRule;
v1SaveRule=function(e){let f=e.target,id=f.dataset.id,old=data.rules.find(r=>r.id===id);if(old&&old.from<today()&&f.elements.from.value<=old.from&&[old.weekday,old.start,old.end,old.location].join('|')!==[Number(f.elements.weekday.value),f.elements.start.value,f.elements.end.value,f.elements.location.value.trim()].join('|')){e.preventDefault();return alert('Para preservar as aulas passadas, use “Editar” e informe a data de início da alteração.');}return j11OldSaveRule(e)};
const j11OldSaveAppointment=saveAppointment;
saveAppointment=function(e){const f=e.target,fd=new FormData(f),a={date:String(fd.get('date')),start:String(fd.get('start')),end:String(fd.get('end')),location:String(fd.get('location')).trim(),recurrence:String(fd.get('recurrence'))};if(!j11ISO(a.date)||!v1ValidRange(a.start,a.end)){e.preventDefault();return alert('Data ou horários inválidos.')}if(a.recurrence==='once'){let err=j11Conflict(a.date,a.start,a.end,f.dataset.editId?{id:f.dataset.editId,date:a.date}:null,a.location);if(err){e.preventDefault();return alert(err)}}return j11OldSaveAppointment(e)};
// Makeup records link to original occurrence and new appointment, enforcing a real reservation.
function j11MakeupOriginal(studentId,date){return fullAppointments(date).find(a=>a.studentId===studentId)||null}
v1AddMakeup=function(){let studentId=document.getElementById('v1-makeupStudent').value,date=document.getElementById('v1-makeupDate').value,reason=document.getElementById('v1-makeupReason').value.trim();if(!studentId||!j11ISO(date))return alert('Selecione aluno e data válida.');let original=j11MakeupOriginal(studentId,date);if(!original&&!confirm('Nenhuma aula original encontrada para esta data. Registrar crédito manual sem vínculo?'))return;data.makeups.push({id:uid(),studentId,date,originId:original?.id||null,reason,status:'pending',updatedAt:new Date().toISOString()});persist();j11RenderMakeups();j11StudentInfo()};
function j11MakeupSchedule(id){let x=data.makeups.find(x=>x.id===id);if(!x)return;const d=prompt('Data da reposição (AAAA-MM-DD):',today());if(!j11ISO(d))return alert('Data inválida.');const start=prompt('Início (HH:MM):','15:00');if(!v1Minutes(start)&&start!=='00:00'||!Number.isFinite(v1Minutes(start)))return alert('Início inválido.');const end=prompt('Fim (HH:MM):',time(min(start)+(Number(data.settings.duration)||50)));if(!v1ValidRange(start,end))return alert('Fim inválido.');const location=prompt('Local do atendimento:',data.students.find(s=>s.id===x.studentId)?.location||'')||'';let err=j11Conflict(d,start,end,null,location);if(err)return alert(err);if(x.appointmentId){const old=data.appointments.find(a=>a.id===x.appointmentId);if(old&&old.recurrence==='once')data.appointments=data.appointments.filter(a=>a.id!==old.id)}let a={id:uid(),studentId:x.studentId,date:d,start,end,location,recurrence:'once',weekday:v1Weekday(d),makeupId:x.id};data.appointments.push(a);x.appointmentId=a.id;x.status='scheduled';x.updatedAt=new Date().toISOString();persist();j11RenderMakeups();renderAgenda();renderAvailability();}
function j11MakeupChange(id,status){const x=data.makeups.find(x=>x.id===id);if(!x)return;if(status==='done'&&!x.appointmentId)return alert('Agende uma aula de reposição antes de concluí-la.');if(status==='cancelled'&&x.appointmentId){if(!confirm('Cancelar a reposição e liberar seu horário?'))return;data.appointments=data.appointments.filter(a=>a.id!==x.appointmentId);x.appointmentId=null;}x.status=status;x.updatedAt=new Date().toISOString();if(status==='done'&&x.appointmentId){const a=data.appointments.find(a=>a.id===x.appointmentId);if(a)j11Status(a.id,a.date,'done')}persist();j11RenderMakeups();renderAgenda();renderAvailability();}
function j11RenderMakeups(){const el=document.getElementById('v1-makeupList');if(!el)return;el.innerHTML=data.makeups.map(m=>`<div class="item"><div class="item-main"><b>${safe(getStudent(m.studentId))}</b> · ${safe(m.date)}<div class="small muted">${safe(m.reason||'Reposição')} · ${m.status==='done'?'Concluída':m.status==='scheduled'?'Agendada':m.status==='cancelled'?'Cancelada':'Pendente'}${m.originId?' · Vinculada à aula original':''}</div></div><div class="actions"><button class="btn secondary tiny" onclick="j11MakeupSchedule('${m.id}')">Agendar</button><button class="btn secondary tiny" onclick="j11MakeupChange('${m.id}','done')">Concluir</button><button class="btn danger tiny" onclick="j11MakeupChange('${m.id}','cancelled')">Cancelar</button></div></div>`).join('')||'<p class="hint">Nenhuma reposição registrada.</p>'}
v1RenderMakeups=j11RenderMakeups;
// Score real candidate slots using neighbouring lessons and travel feasibility.
v1RenderOptimizer=function(){let el=document.getElementById('v1-optimizer');if(!el)return;const slots=visibleSlots.slice();const location=document.getElementById('j11-msgLocation')?.value.trim()||j11CurrentRecipient()?.location||'';let ranked=slots.map(s=>{let events=fullAppointments(s.date),before=events.filter(a=>a.endM<=s.start).sort((a,b)=>b.endM-a.endM)[0],after=events.filter(a=>a.startM>=s.end).sort((a,b)=>a.startM-b.startM)[0];let pre=before?s.start-before.endM:Infinity,post=after?after.startM-s.end:Infinity;let canBefore=!before||pre>=j11Travel(before.location,location),canAfter=!after||post>=j11Travel(location,after.location);let feasible=canBefore&&canAfter;let extra=(Number.isFinite(pre)?pre:120)+(Number.isFinite(post)?post:120);return {...s,feasible,score:feasible?Math.max(0,100-Math.round(extra/4)):0,closest:Math.min(pre,post)}}).filter(x=>x.feasible).sort((a,b)=>b.score-a.score||a.date.localeCompare(b.date)||a.start-b.start).slice(0,7);
 el.innerHTML=ranked.map((s,i)=>`<div class="item"><div class="item-main"><b>${safe(fmtDate(s.date))} · ${time(s.start)}–${time(s.end)}</b><div class="small muted">${i===0?'Melhor encaixe':'Alternativa'} · escore ${s.score}/100 · deslocamento verificado${Number.isFinite(s.closest)?' · intervalo próximo '+s.closest+' min':''}</div></div><button class="btn secondary tiny" onclick="toggleSlot('${s.key}')">${selectedSlots.has(s.key)?'Desmarcar':'Selecionar'}</button></div>`).join('')||'<p class="hint">Nenhum encaixe viável com as restrições atuais.</p>'};
const j11OldRenderAvailability=renderAvailability;
renderAvailability=function(){j11OldRenderAvailability();v1RenderOptimizer()};
const j11OldReport=v1Report;
v1Report=function(){j11OldReport();const from=document.getElementById('v1-reportFrom').value,to=document.getElementById('v1-reportTo').value;if(!j11Range(from,to)||j11DateArray(from,to).length>91)return;const events=j11DateArray(from,to).flatMap(d=>fullAppointments(d).map(a=>({...a,scheduledDate:d})));let scheduled=events.length,done=events.filter(a=>j11OccurrenceStatus(a.id,a.occurrenceDate)==='done').length,absent=events.filter(a=>j11OccurrenceStatus(a.id,a.occurrenceDate)==='absent').length,cancelled=data.attendance.filter(a=>a.date>=from&&a.date<=to&&a.status==='cancelled').length,makeupPending=data.makeups.filter(m=>m.status==='pending').length,makeupDone=data.makeups.filter(m=>m.status==='done').length;let perDay={};events.forEach(a=>(perDay[a.scheduledDate]??=0,perDay[a.scheduledDate]++));document.getElementById('j11-reportExtra').innerHTML=`<div class="grid3"><div class="stat"><strong>${scheduled}</strong><span>Previstas</span></div><div class="stat"><strong>${done}</strong><span>Realizadas</span></div><div class="stat"><strong>${absent}</strong><span>Faltas registradas</span></div><div class="stat"><strong>${cancelled}</strong><span>Cancelamentos</span></div><div class="stat"><strong>${makeupPending}</strong><span>Reposições pendentes</span></div><div class="stat"><strong>${makeupDone}</strong><span>Reposições feitas</span></div></div><h3>Atendimentos por dia</h3>`+Object.entries(perDay).map(([d,n])=>`<div class="item"><span>${safe(fmtDate(d))}</span><b>${n}</b></div>`).join('');};
// Full backup, atomic validation/rollback on malformed imports; retain pre-import safety copy.
function j11CheckBackup(d){if(!j11Obj(d)||![1,2,3].includes(d.version)||!Array.isArray(d.students)||!Array.isArray(d.appointments)||!Array.isArray(d.exceptions)||!j11Obj(d.settings)||!Array.isArray(d.settings.working)||d.settings.working.length!==7)return false;const ids=new Set();for(let s of d.students){if(!s.id||!s.name||ids.has(s.id))return false;ids.add(s.id)}for(let a of d.appointments){if(!ids.has(a.studentId)||!v1ValidRange(a.start,a.end)||!j11ISO(a.date))return false}for(let r of d.rules||[]){if(!ids.has(r.studentId)||!v1ValidRange(r.start,r.end)||!j11ISO(r.from)||r.until&&!j11ISO(r.until))return false}for(let b of d.blocks||[]){if(!v1ValidRange(b.start,b.end)&&!(b.start==='00:00'&&b.end==='23:59'))return false;if(!j11ISO(b.from||b.date)||b.until&&!j11ISO(b.until))return false}return true}
function j11DownloadBlob(obj,name){const blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000)}
function j11DownloadBackup(){j11DownloadBlob({application:'JF Agenda',version:'1.1',exportedAt:new Date().toISOString(),data},'jf-agenda-v1.1-backup-'+today()+'.json')}
function j11DownloadPrevious(){let raw=localStorage.getItem(J11_BACKUP_KEY)||localStorage.getItem(V1_BACKUP);if(!raw)return alert('Não existe cópia pré-atualização neste dispositivo.');let payload=JSON.parse(raw);j11DownloadBlob(payload,'jf-agenda-pre-atualizacao.json')}
exportBackup=j11DownloadBackup;
importBackup=async function(e){const file=e.target.files?.[0];if(!file)return;try{if(file.size>10e6)throw Error('Arquivo acima de 10 MB.');const raw=JSON.parse(await file.text()),incoming=raw.data;if(!j11CheckBackup(incoming))throw Error('Estrutura inválida ou referências inconsistentes.');if(!confirm('Restaurar o backup e substituir os dados atuais?'))return;let old=structuredClone(data);try{localStorage.setItem('jf-agenda-v11-before-import',JSON.stringify({application:'JF Agenda',data:old,exportedAt:new Date().toISOString()}));data=structuredClone(incoming);j11Ensure();persist();selectedSlots.clear();renderStudents();renderSettings();renderAgenda();renderAvailability();j11RenderAll();alert('Backup restaurado. Revise as recorrências e exporte uma nova cópia.')}catch(err){data=old;persist();throw err}}catch(err){alert('Não foi possível importar: '+err.message)}finally{e.target.value=''}};
const j11OldSettings=saveSettings;
saveSettings=function(e){const locations=structuredClone(data.settings.locationBuffers||{});j11OldSettings(e);data.settings.locationBuffers=locations;persist();renderAvailability()};
const j11OldRenderSettings=renderSettings;
renderSettings=function(){j11OldRenderSettings();j11Places();j11RenderMakeups();v1RenderBlocks();v1ConvertTimes()};
const j11OldClear=clearAll;
clearAll=function(){j11OldClear();j11Ensure();persist();j11RenderAll()};
// Maintain privacy and do not silently sync/export anything.
window.addEventListener('error',e=>console.error('JF Agenda v1.1:',e.message));
j11SetupUI();
