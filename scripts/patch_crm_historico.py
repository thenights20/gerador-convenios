from pathlib import Path

app=Path('app.js')
index=Path('index.html')
s=app.read_text(encoding='utf-8')
h=index.read_text(encoding='utf-8')

if 'CRM_CONVENIO_GERADO' not in s:
    old='''    const bytes=await pdf.save(),blob=new Blob([bytes],{type:"application/pdf"}),url=URL.createObjectURL(blob),link=document.createElement("a");\n    const name=razao.toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");link.href=url;link.download=`convenio-${name}.pdf`;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);\n    $("finalStatus").className="status success";$("finalStatus").textContent="Documento oficial de 6 páginas gerado com sucesso.";'''
    new='''    const bytes=await pdf.save(),blob=new Blob([bytes],{type:"application/pdf"}),url=URL.createObjectURL(blob),link=document.createElement("a");\n    const name=razao.toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");\n    const nomeArquivo=`convenio-${name}.pdf`;link.href=url;link.download=nomeArquivo;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);\n    try{\n      let binario="";const bloco=0x8000;for(let i=0;i<bytes.length;i+=bloco)binario+=String.fromCharCode(...bytes.subarray(i,Math.min(i+bloco,bytes.length)));\n      const pdfBase64=btoa(binario);\n      if(window.parent&&window.parent!==window)window.parent.postMessage({type:"CRM_CONVENIO_GERADO",payload:{\n        razaoSocial:$("razaoSocial").value.trim(),cnpj:$("cnpj").value.trim(),representanteLegal:$("representante").value.trim(),cidade:$("cidade").value.trim(),\n        dataPreenchimento:$("data").value,duracaoAnos:definirDuracao.checked?Number(duracaoAnos.value||0):0,prazoIndeterminado:!definirDuracao.checked,\n        arquivoNome:nomeArquivo,pdfBase64:pdfBase64\n      }},"*");\n    }catch(bridgeError){console.warn("CRM: não foi possível enviar o termo gerado ao histórico.",bridgeError)}\n    $("finalStatus").className="status success";$("finalStatus").textContent="Documento oficial de 6 páginas gerado com sucesso.";'''
    if old not in s: raise SystemExit('Trecho de geração do PDF não localizado.')
    s=s.replace(old,new,1)
    app.write_text(s,encoding='utf-8')

h=h.replace('app.js?v=20260830-01','app.js?v=20260831-02')
index.write_text(h,encoding='utf-8')
print('Integração CRM_CONVENIO_GERADO aplicada.')