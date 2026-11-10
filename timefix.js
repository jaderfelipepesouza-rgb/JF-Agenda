'use strict';
/* JF Agenda 1.1.1 — Android HH:MM input mask.
   Presentation-only enhancement: does not modify persisted data or schemas. */
(function(){
  const valid=/^(?:[01]\d|2[0-3]):[0-5]\d$/;
  function isClock(el){
    if(!(el instanceof HTMLInputElement)||el.type!=='text')return false;
    return el.title?.includes('HH:MM')||el.placeholder==='HH:MM'||
      el.pattern?.includes('[0-5]')||
      /^(?:ws\d+|we\d+|v1-(?:blockStart|blockEnd|occurStart|occurEnd)|j11-vac(?:Start|End))$/.test(el.id)||
      (el.closest('#v1-ruleForm, #appointmentForm')&&/^(start|end)$/.test(el.name));
  }
  function mask(value){
    const digits=String(value||'').replace(/\D/g,'').slice(0,4);
    if(digits.length<3)return digits;
    return digits.slice(0,2)+':'+digits.slice(2);
  }
  function countDigits(s){return (s.match(/\d/g)||[]).length}
  function caretAt(formatted,digitCount){
    if(digitCount===0)return 0;
    let seen=0;
    for(let i=0;i<formatted.length;i++){if(/\d/.test(formatted[i]))seen++;if(seen>=digitCount)return i+1;}
    return formatted.length;
  }
  function apply(el){
    if(!isClock(el))return;
    const pos=el.selectionStart??el.value.length;
    const before=countDigits(el.value.slice(0,pos));
    const next=mask(el.value);
    if(next!==el.value){el.value=next;const c=caretAt(next,before);try{el.setSelectionRange(c,c)}catch{}}
    el.dataset.clockValid=(!next||valid.test(next))?'true':'false';
    el.setAttribute('aria-invalid',el.dataset.clockValid==='false'?'true':'false');
  }
  document.addEventListener('input',e=>apply(e.target),true);
  document.addEventListener('change',e=>apply(e.target),true);
  document.addEventListener('focusout',e=>apply(e.target),true);
  document.addEventListener('submit',e=>{
    for(const input of e.target.querySelectorAll('input'))apply(input);
  },true);
  document.addEventListener('focusin',e=>{
    const el=e.target;if(!isClock(el))return;
    el.inputMode='numeric';el.maxLength=5;el.autocomplete='off';
    el.setAttribute('aria-label',el.getAttribute('aria-label')||'Horário no formato HH:MM');
  },true);
})();
