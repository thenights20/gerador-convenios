(function(){
  const onlyDigits=value=>String(value||'').replace(/\D/g,'');

  function validCpf(value){
    const cpf=onlyDigits(value);
    if(cpf.length!==11||/^(\d)\1{10}$/.test(cpf))return false;
    const digit=length=>{
      let sum=0;
      for(let i=0;i<length;i++)sum+=Number(cpf[i])*(length+1-i);
      const rest=(sum*10)%11;
      return (rest===10?0:rest)===Number(cpf[length]);
    };
    return digit(9)&&digit(10);
  }

  function validCnpj(value){
    const cnpj=onlyDigits(value);
    if(cnpj.length!==14||/^(\d)\1{13}$/.test(cnpj))return false;
    const calc=base=>{
      let weight=base.length-7,sum=0;
      for(const n of base){
        sum+=Number(n)*weight--;
        if(weight<2)weight=9;
      }
      const rest=sum%11;
      return rest<2?0:11-rest;
    };
    return calc(cnpj.slice(0,12))===Number(cnpj[12])&&calc(cnpj.slice(0,13))===Number(cnpj[13]);
  }

  function identifierIsCpf(){
    const btn=document.getElementById('typeCpf');
    return btn&&(btn.classList.contains('active')||btn.getAttribute('aria-pressed')==='true');
  }

  function setStatus(message){
    const status=document.getElementById('finalStatus');
    if(!status)return;
    status.className=message?'status error':'status';
    status.textContent=message||'';
  }

  function validateField(el,validator,message,showMessage){
    if(!el||!el.value.trim())return true;
    const ok=validator(el.value);
    el.classList.toggle('invalid',!ok);
    el.setAttribute('aria-invalid',String(!ok));
    if(!ok&&showMessage)setStatus(message);
    return ok;
  }

  function validateDocuments(showMessage=true){
    const identifier=document.getElementById('cnpj');
    const representativeCpf=document.getElementById('cpf');
    const isCpf=identifierIsCpf();
    const identifierOk=validateField(
      identifier,
      isCpf?validCpf:validCnpj,
      isCpf?'CPF do concedente inválido. Confira os números informados.':'CNPJ inválido. Confira os números informados.',
      showMessage
    );
    const representativeOk=validateField(
      representativeCpf,
      validCpf,
      'CPF do representante legal inválido. Confira os números informados.',
      showMessage&&identifierOk
    );
    if(identifierOk&&representativeOk&&showMessage){
      const status=document.getElementById('finalStatus');
      if(status&&/inválid/i.test(status.textContent||''))setStatus('');
    }
    return identifierOk&&representativeOk;
  }

  function blockIfInvalid(event){
    if(validateDocuments(true))return;
    event.preventDefault();
    event.stopImmediatePropagation();
    document.querySelector('.invalid')?.focus();
  }

  document.addEventListener('DOMContentLoaded',()=>{
    const identifier=document.getElementById('cnpj');
    const representativeCpf=document.getElementById('cpf');
    identifier?.addEventListener('blur',()=>validateDocuments(true));
    representativeCpf?.addEventListener('blur',()=>validateDocuments(true));
    identifier?.addEventListener('input',()=>{identifier.classList.remove('invalid');identifier.removeAttribute('aria-invalid');});
    representativeCpf?.addEventListener('input',()=>{representativeCpf.classList.remove('invalid');representativeCpf.removeAttribute('aria-invalid');});

    // Captura antes dos listeners do gerador para impedir PDF com documento inválido.
    document.getElementById('generateButton')?.addEventListener('click',blockIfInvalid,true);
    document.getElementById('form')?.addEventListener('submit',blockIfInvalid,true);
  });
})();
