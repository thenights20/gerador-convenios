import * as pdfjsLib from "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs";
pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";

const $ = (id) => document.getElementById(id);
const companyIds = ["razaoSocial","cnpj","cep","endereco","numero","bairro","cidade","uf"];
const personIds = ["representante","cpf","rg","cargo","email"];
const allIds = [...companyIds,...personIds,"data"];

$("data").value = new Date().toISOString().slice(0,10);

function digits(v){return v.replace(/\D/g,"")}
function maskCnpj(v){return digits(v).slice(0,14).replace(/^(\d{2})(\d)/,"$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/,"$1.$2.$3").replace(/\.(\d{3})(\d)/,".$1/$2").replace(/(\d{4})(\d)/,"$1-$2")}
function maskCpf(v){return digits(v).slice(0,11).replace(/^(\d{3})(\d)/,"$1.$2").replace(/^(\d{3})\.(\d{3})(\d)/,"$1.$2.$3").replace(/(\d{3})(\d{1,2})$/,"$1-$2")}
function maskCep(v){return digits(v).slice(0,8).replace(/(\d{5})(\d)/,"$1-$2")}
function clean(v){return (v||"").replace(/\*+/g,"").replace(/\s+/g," ").trim()}

function setValue(id,value){$(id).value=clean(value);$(id).dispatchEvent(new Event("input",{bubbles:true}))}
function count(ids){return ids.filter(id=>$(id).value.trim()).length}
function updateProgress(){
  const c=count(companyIds),p=count(personIds),d=$("data").value?1:0,total=c+p+d,percent=Math.round(total/14*100);
  $("progressText").textContent=total===14?"Dados obrigatórios preenchidos":`${percent}% preenchido`;
  $("progressCount").textContent=`${total}/14`;$("progressBar").style.width=`${percent}%`;
  $("companyCount").textContent=`${c}/8`;$("personCount").textContent=`${p}/5`;$("dateCount").textContent=`${d}/1`;
  $("companyCheck").textContent=c===8?"✓":"○";$("personCheck").textContent=p===5?"✓":"○";$("dateCheck").textContent=d?"✓":"○";
  $("generateButton").disabled=total!==14;$("previewName").textContent=$("razaoSocial").value||"Nome da instituição";
}

allIds.forEach(id=>$(id).addEventListener("input",e=>{
  if(id==="cnpj")e.target.value=maskCnpj(e.target.value);if(id==="cpf")e.target.value=maskCpf(e.target.value);if(id==="cep")e.target.value=maskCep(e.target.value);if(id==="uf")e.target.value=e.target.value.toUpperCase().slice(0,2);e.target.classList.remove("invalid");updateProgress();
}));

function rowsFromItems(items){
  const rows=[];
  for(const item of items){const y=Math.round(item.transform[5]/3)*3;let row=rows.find(r=>Math.abs(r.y-y)<=2);if(!row){row={y,items:[]};rows.push(row)}row.items.push({x:item.transform[4],text:item.str})}
  return rows.sort((a,b)=>b.y-a.y).map(r=>{r.items.sort((a,b)=>a.x-b.x);r.text=r.items.map(i=>i.text).join(" ").replace(/\s+/g," ").trim();return r}).filter(r=>r.text);
}
function findAfter(lines,label,stopLabels=[]){
  const idx=lines.findIndex(row=>row.text.toUpperCase().includes(label));if(idx<0)return"";
  const same=lines[idx].text.replace(new RegExp(`.*${label.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}`,"i"),"").trim();if(same&&!stopLabels.some(x=>same.toUpperCase().includes(x)))return same;
  for(let i=idx+1;i<Math.min(lines.length,idx+5);i++){const v=clean(lines[i].text);if(v&&!stopLabels.some(x=>v.toUpperCase().includes(x))&&!/^(PORTE|COMPROVANTE|DATA DE|CÓDIGO E DESCRIÇÃO)/i.test(v))return v}return"";
}
function columnValue(rows,label,headerLabels){
  const headerIndex=rows.findIndex(r=>headerLabels.every(h=>r.text.toUpperCase().includes(h)));
  if(headerIndex<0||!rows[headerIndex+1])return"";
  const header=rows[headerIndex],value=rows[headerIndex+1];
  const positions=headerLabels.map(h=>{const item=header.items.find(i=>i.text.toUpperCase().includes(h));return{x:item?.x??Infinity,label:h}}).sort((a,b)=>a.x-b.x);
  const current=positions.find(p=>p.label===label);if(!current||!Number.isFinite(current.x))return"";
  const currentIndex=positions.indexOf(current),next=positions[currentIndex+1];
  return clean(value.items.filter(i=>i.x>=current.x-3&&(!next||i.x<next.x-3)).map(i=>i.text).join(" "));
}
function parseReceipt(lines){
  const text=lines.map(r=>r.text).join("\n");
  const cnpj=(text.match(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/)||[])[0]||"";
  const razao=findAfter(lines,"NOME EMPRESARIAL",["TÍTULO DO ESTABELECIMENTO"]);
  let endereco=columnValue(lines,"LOGRADOURO",["LOGRADOURO","NÚMERO","COMPLEMENTO"]);
  let numero=columnValue(lines,"NÚMERO",["LOGRADOURO","NÚMERO","COMPLEMENTO"]);
  const cep=(text.match(/\b\d{2}\.\d{3}-\d{3}\b/)||text.match(/\b\d{5}-\d{3}\b/)||[])[0]||"";
  let bairro=columnValue(lines,"BAIRRO/DISTRITO",["CEP","BAIRRO/DISTRITO","MUNICÍPIO","UF"]);
  let cidade=columnValue(lines,"MUNICÍPIO",["CEP","BAIRRO/DISTRITO","MUNICÍPIO","UF"]);
  let uf=columnValue(lines,"UF",["CEP","BAIRRO/DISTRITO","MUNICÍPIO","UF"]);
  return{razaoSocial:razao,cnpj,cep,endereco,numero,bairro,cidade,uf:uf.slice(0,2)};
}

async function importPdf(file){
  $("importStatus").className="import-status";$("importStatus").textContent="Lendo o comprovante…";
  try{
    if(!file||file.type!=="application/pdf")throw new Error("Selecione um arquivo PDF.");
    const data=await file.arrayBuffer(),pdf=await pdfjsLib.getDocument({data}).promise;let lines=[];
    for(let p=1;p<=pdf.numPages;p++){const page=await pdf.getPage(p),content=await page.getTextContent();lines.push(...rowsFromItems(content.items))}
    const result=parseReceipt(lines);
    if(!result.cnpj||!result.razaoSocial)throw new Error("Não foi possível reconhecer este comprovante. Confira se ele foi emitido pela Receita Federal.");
    Object.entries(result).forEach(([id,value])=>setValue(id,value));
    const missing=companyIds.filter(id=>!$(id).value.trim());
    $("importStatus").className=`import-status ${missing.length?"error":"success"}`;
    $("importStatus").textContent=missing.length?`CNPJ identificado. Confira os campos não reconhecidos: ${missing.join(", ")}.`:"Comprovante lido com sucesso. Confira os dados preenchidos.";
  }catch(error){$("importStatus").className="import-status error";$("importStatus").textContent=error.message}
}

$("chooseFile").addEventListener("click",()=>$("pdfFile").click());$("pdfFile").addEventListener("change",e=>importPdf(e.target.files[0]));
const zone=$("dropZone");["dragenter","dragover"].forEach(ev=>zone.addEventListener(ev,e=>{e.preventDefault();zone.classList.add("dragging")}));["dragleave","drop"].forEach(ev=>zone.addEventListener(ev,e=>{e.preventDefault();zone.classList.remove("dragging")}));zone.addEventListener("drop",e=>importPdf(e.dataTransfer.files[0]));

const clauses=[
 ["CLÁUSULA 1ª - DO OBJETO E DA FINALIDADE DO CONVÊNIO","O presente Termo de Convênio tem por objeto viabilizar o desenvolvimento de atividades de estágio supervisionado curricular, projetos de iniciação científica, projetos de pesquisa e trabalhos de conclusão de curso pelos alunos regularmente matriculados nos cursos de graduação na modalidade de Ensino a Distância da UNINGÁ, proporcionando experiência prática para a formação do estagiário e o aperfeiçoamento técnico-profissional, em situações reais de aprendizagem profissional."],
 ["CLÁUSULA 2ª - DAS COMPETÊNCIAS DA UNINGÁ","Compete à UNINGÁ organizar os acadêmicos para realização da prática de estágio; identificar o docente Supervisor de Estágio e os acadêmicos; elaborar, em comum acordo com a CONCEDENTE, o Plano de Atividades; reunir-se quando necessário; apresentar sugestões para melhoria do estágio; e contratar seguro de acidentes pessoais em favor dos estudantes, na forma da Lei nº 11.788/2008."],
 ["CLÁUSULA 3ª - DAS COMPETÊNCIAS DA CONCEDENTE","Compete à CONCEDENTE permitir o acesso do professor Supervisor de Estágio; inteirar-se da organização do Plano de Estágio; designar profissional habilitado para a Supervisão de Campo; oferecer condições físicas e materiais; orientar adequadamente o supervisor; e comunicar qualquer irregularidade à UNINGÁ."],
 ["CLÁUSULA 4ª - DAS ÁREAS DE ESTÁGIO E DO NÚMERO DE VAGAS","A CONCEDENTE disponibilizará instalações para recebimento de estagiários nas áreas afins do Curso. O número de acadêmicos será definido em conjunto, observado o limite máximo de seis estagiários."],
 ["CLÁUSULA 5ª - DO TERMO DE COMPROMISSO DO ESTAGIÁRIO","A aceitação do estagiário não configurará vínculo empregatício. A vinculação será celebrada por Termo de Compromisso entre as partes, com a interveniência da UNINGÁ."],
 ["CLÁUSULA 6ª - DA CARGA HORÁRIA, DURAÇÃO E JORNADA","A carga horária, duração e jornada serão determinadas pelo Coordenador do Curso, conforme o Projeto Pedagógico, as Diretrizes Curriculares Nacionais, o Regimento Geral de Estágio Curricular EAD e o Calendário Acadêmico da UNINGÁ."],
 ["CLÁUSULA 7ª - DA EXCLUSÃO DE RESPONSABILIDADES","A UNINGÁ fornecerá cobertura de seguro de acidentes pessoais em favor do estagiário, nos termos da legislação vigente."],
 ["CLÁUSULA 8ª - DA VIGÊNCIA","O presente termo terá vigência por tempo indeterminado. A parte interessada em sua rescisão notificará a outra, por escrito, com antecedência de trinta dias."],
 ["CLÁUSULA 9ª - DA RESCISÃO","O termo poderá ser denunciado por qualquer das partes e rescindido a qualquer tempo mediante comunicação com antecedência mínima de trinta dias, sem ônus, preservadas as atividades em andamento até sua conclusão."],
 ["CLÁUSULA 10ª - DA ASSINATURA ELETRÔNICA E/OU DIGITAL","As partes concordam com a utilização de assinatura digital ou eletrônica, nos termos da Lei nº 14.063/2020 e da Medida Provisória nº 2.200-2/2001."],
 ["CLÁUSULA 11ª - DA PROTEÇÃO DE DADOS","Os dados pessoais serão armazenados e tratados exclusivamente para os fins deste convênio, em conformidade com a Lei nº 13.709/2018, durante sua vigência."],
 ["CLÁUSULA 12ª - DO FORO","Fica eleito o foro da Comarca de Maringá, Estado do Paraná, para dirimir litígios oriundos deste termo que não puderem ser resolvidos amigavelmente."],
];
function formatDate(iso){return new Intl.DateTimeFormat("pt-BR",{day:"numeric",month:"long",year:"numeric",timeZone:"UTC"}).format(new Date(`${iso}T00:00:00Z`))}
function generate(){
  let valid=true;allIds.forEach(id=>{const el=$(id),bad=!el.value.trim()||(id==="email"&&!/^\S+@\S+\.\S+$/.test(el.value));el.classList.toggle("invalid",bad);if(bad)valid=false});
  if(!valid){$("finalStatus").className="status error";$("finalStatus").textContent="Revise os campos destacados.";document.querySelector(".invalid")?.focus();return}
  const {jsPDF}=window.jspdf,pdf=new jsPDF({unit:"mm",format:"a4"});let y=25,page=1;const margin=22,width=166;
  const footer=()=>{pdf.setFont("helvetica","normal");pdf.setFontSize(8);pdf.setTextColor(90);pdf.text(`Gerado em ${new Date().toLocaleDateString("pt-BR")} • Página ${page}`,105,288,{align:"center"})};
  const next=()=>{footer();pdf.addPage();page++;y=24};
  const write=(text,size=11,bold=false,gap=5)=>{pdf.setFont("helvetica",bold?"bold":"normal");pdf.setFontSize(size);pdf.setTextColor(20,42,67);const lines=pdf.splitTextToSize(text,width),need=lines.length*(size*.38)+gap;if(y+need>278)next();pdf.text(lines,margin,y,{align:"justify",maxWidth:width});y+=need};
  pdf.setFont("helvetica","bold");pdf.setFontSize(16);pdf.setTextColor(16,42,67);pdf.text("TERMO DE CONVÊNIO DE CONCESSÃO DE",105,y,{align:"center"});y+=7;pdf.text("ESTÁGIO OBRIGATÓRIO",105,y,{align:"center"});y+=15;
  write(`Termo de Convênio de Concessão de Estágio que entre si celebram a UNINGÁ – CENTRO UNIVERSITÁRIO INGÁ e ${$("razaoSocial").value.toUpperCase()}, visando à concessão de Estágio Supervisionado Curricular Obrigatório, nos termos da Lei nº 11.788/2008.`,11,false,10);
  write(`A UNINGÁ – CENTRO UNIVERSITÁRIO INGÁ, mantida pela UNIDADE DE ENSINO SUPERIOR INGÁ LTDA., inscrita no CNPJ nº 01.207.056/0001-84, com sede em Maringá/PR; e ${$("razaoSocial").value.toUpperCase()}, inscrita no CNPJ nº ${$("cnpj").value}, com sede à ${$("endereco").value}, nº ${$("numero").value}, ${$("bairro").value}, ${$("cidade").value}/${$("uf").value}, CEP ${$("cep").value}, representada por ${$("representante").value}, RG nº ${$("rg").value}, CPF nº ${$("cpf").value}, ${$("cargo").value}, e-mail ${$("email").value}, doravante denominada CONCEDENTE, celebram o presente termo.`,11,false,9);
  clauses.forEach(([t,b])=>{write(t,11,true,3);write(b,10.5,false,7)});write(`Maringá/PR, ${formatDate($("data").value)}.`,11,false,22);if(y>245)next();pdf.setDrawColor(50);pdf.line(25,y,90,y);pdf.line(120,y,185,y);y+=6;pdf.setFontSize(9);pdf.setFont("helvetica","bold");pdf.text("UNIDADE DE ENSINO SUPERIOR INGÁ LTDA.",57.5,y,{align:"center",maxWidth:65});pdf.text($("razaoSocial").value.toUpperCase(),152.5,y,{align:"center",maxWidth:65});y+=12;pdf.setFont("helvetica","normal");pdf.text("UNINGÁ",57.5,y,{align:"center"});pdf.text("CONCEDENTE",152.5,y,{align:"center"});footer();
  const name=$("razaoSocial").value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");pdf.save(`convenio-${name}.pdf`);$("finalStatus").className="status success";$("finalStatus").textContent="PDF gerado com sucesso.";
}
$("form").addEventListener("submit",e=>{e.preventDefault();generate()});$("generateButton").addEventListener("click",generate);$("clearButton").addEventListener("click",()=>{if(confirm("Deseja limpar todos os dados?")){$("form").reset();$("data").value=new Date().toISOString().slice(0,10);$("importStatus").textContent="";$("finalStatus").textContent="";updateProgress()}});updateProgress();
