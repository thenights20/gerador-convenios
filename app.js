import * as pdfjsLib from "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs";
pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";

const $ = (id) => document.getElementById(id);
const companyIds = ["razaoSocial","cnpj","cep","endereco","numero","bairro","cidade","uf"];
const personIds = ["representante","cpf","rg","orgaoExpedidor","cargo","email"];
const allIds = [...companyIds,"complemento",...personIds,"data"];
const requiredIds = [...companyIds,...personIds,"data"];

$("data").value = new Date().toISOString().slice(0,10);

function digits(v){return v.replace(/\D/g,"")}
function maskCnpj(v){return digits(v).slice(0,14).replace(/^(\d{2})(\d)/,"$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/,"$1.$2.$3").replace(/\.(\d{3})(\d)/,".$1/$2").replace(/(\d{4})(\d)/,"$1-$2")}
function maskCpf(v){return digits(v).slice(0,11).replace(/^(\d{3})(\d)/,"$1.$2").replace(/^(\d{3})\.(\d{3})(\d)/,"$1.$2.$3").replace(/(\d{3})(\d{1,2})$/,"$1-$2")}
function maskCep(v){return digits(v).slice(0,8).replace(/(\d{5})(\d)/,"$1-$2")}
function validCpf(value){
  const cpf=digits(value);if(cpf.length!==11||/^(\d)\1{10}$/.test(cpf))return false;
  const check=length=>{let sum=0;for(let i=0;i<length;i++)sum+=Number(cpf[i])*(length+1-i);const rest=(sum*10)%11;return(rest===10?0:rest)===Number(cpf[length])};
  return check(9)&&check(10);
}
const estados={AC:"Estado do Acre",AL:"Estado de Alagoas",AP:"Estado do Amapá",AM:"Estado do Amazonas",BA:"Estado da Bahia",CE:"Estado do Ceará",DF:"Distrito Federal",ES:"Estado do Espírito Santo",GO:"Estado de Goiás",MA:"Estado do Maranhão",MT:"Estado de Mato Grosso",MS:"Estado de Mato Grosso do Sul",MG:"Estado de Minas Gerais",PA:"Estado do Pará",PB:"Estado da Paraíba",PR:"Estado do Paraná",PE:"Estado de Pernambuco",PI:"Estado do Piauí",RJ:"Estado do Rio de Janeiro",RN:"Estado do Rio Grande do Norte",RS:"Estado do Rio Grande do Sul",RO:"Estado de Rondônia",RR:"Estado de Roraima",SC:"Estado de Santa Catarina",SP:"Estado de São Paulo",SE:"Estado de Sergipe",TO:"Estado do Tocantins"};
function clean(v){return (v||"").replace(/\*+/g,"").replace(/\s+/g," ").trim()}
function normalizeLogradouro(value){
  const cleaned=clean(value);
  return cleaned.replace(/^R\.?\s+/i,"RUA ");
}

function setValue(id,value){$(id).value=clean(value);$(id).dispatchEvent(new Event("input",{bubbles:true}))}
function count(ids){return ids.filter(id=>$(id).value.trim()).length}
function updateProgress(){
  const c=count(companyIds),p=count(personIds),d=$("data").value?1:0,total=c+p+d,percent=Math.round(total/15*100);
  $("progressText").textContent=total===15?"Dados obrigatórios preenchidos":`${percent}% preenchido`;
  $("progressCount").textContent=`${total}/15`;$("progressBar").style.width=`${percent}%`;
  $("companyCount").textContent=`${c}/8`;$("personCount").textContent=`${p}/6`;$("dateCount").textContent=`${d}/1`;
  $("companyCheck").textContent=c===8?"✓":"○";$("personCheck").textContent=p===6?"✓":"○";$("dateCheck").textContent=d?"✓":"○";
  $("generateButton").disabled=total!==15;$("previewName").textContent=$("razaoSocial").value||"Nome da instituição";
}

allIds.forEach(id=>$(id).addEventListener("input",e=>{
  if(id==="cnpj")e.target.value=maskCnpj(e.target.value);if(id==="cpf")e.target.value=maskCpf(e.target.value);if(id==="cep")e.target.value=maskCep(e.target.value);if(id==="uf")e.target.value=e.target.value.toUpperCase().slice(0,2);if(id==="orgaoExpedidor")e.target.value=e.target.value.toUpperCase();e.target.classList.remove("invalid");updateProgress();
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
  let endereco=normalizeLogradouro(columnValue(lines,"LOGRADOURO",["LOGRADOURO","NÚMERO","COMPLEMENTO"]));
  let numero=columnValue(lines,"NÚMERO",["LOGRADOURO","NÚMERO","COMPLEMENTO"]);
  let complemento=columnValue(lines,"COMPLEMENTO",["LOGRADOURO","NÚMERO","COMPLEMENTO"]);
  const cep=(text.match(/\b\d{2}\.\d{3}-\d{3}\b/)||text.match(/\b\d{5}-\d{3}\b/)||[])[0]||"";
  let bairro=columnValue(lines,"BAIRRO/DISTRITO",["CEP","BAIRRO/DISTRITO","MUNICÍPIO","UF"]);
  let cidade=columnValue(lines,"MUNICÍPIO",["CEP","BAIRRO/DISTRITO","MUNICÍPIO","UF"]);
  let uf=columnValue(lines,"UF",["CEP","BAIRRO/DISTRITO","MUNICÍPIO","UF"]);
  return{razaoSocial:razao,cnpj,cep,endereco,numero,complemento,bairro,cidade,uf:uf.slice(0,2)};
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

function formatDate(iso){return new Intl.DateTimeFormat("pt-BR",{day:"numeric",month:"long",year:"numeric",timeZone:"UTC"}).format(new Date(`${iso}T00:00:00Z`))}
function wrapLines(text,font,size,maxWidth){
  const words=text.trim().split(/\s+/),lines=[];let line="";
  for(const word of words){const candidate=line?`${line} ${word}`:word;if(font.widthOfTextAtSize(candidate,size)<=maxWidth)line=candidate;else{if(line)lines.push(line);line=word}}
  if(line)lines.push(line);return lines;
}
function drawJustified(page,text,{x,y,width,font,size,lineHeight,maxLines}){
  let fittedSize=size,lines=wrapLines(text,font,fittedSize,width);
  while(lines.length>maxLines&&fittedSize>8.4){fittedSize-=.2;lines=wrapLines(text,font,fittedSize,width)}
  lines.forEach((line,index)=>{
    const words=line.split(" "),last=index===lines.length-1;
    if(last||words.length===1){page.drawText(line,{x,y:y-index*lineHeight,size:fittedSize,font,color:PDFLib.rgb(0,0,0)});return}
    const wordsWidth=words.reduce((sum,word)=>sum+font.widthOfTextAtSize(word,fittedSize),0),gap=(width-wordsWidth)/(words.length-1);let cursor=x;
    words.forEach(word=>{page.drawText(word,{x:cursor,y:y-index*lineHeight,size:fittedSize,font,color:PDFLib.rgb(0,0,0)});cursor+=font.widthOfTextAtSize(word,fittedSize)+gap});
  });
  return lines.length;
}
function richWords(segments,regular,bold){
  return segments.flatMap(segment=>segment.text.trim().split(/\s+/).filter(Boolean).map(text=>({text,font:segment.bold?bold:regular})));
}
function wrapRich(segments,regular,bold,size,maxWidth){
  const words=richWords(segments,regular,bold),space=regular.widthOfTextAtSize(" ",size),lines=[];let line=[],width=0;
  for(const word of words){const wordWidth=word.font.widthOfTextAtSize(word.text,size),next=width+(line.length?space:0)+wordWidth;if(line.length&&next>maxWidth){lines.push(line);line=[word];width=wordWidth}else{line.push(word);width=next}}
  if(line.length)lines.push(line);return lines;
}
function drawRichJustified(page,segments,{x,y,width,regular,bold,size,lineHeight,maxLines}){
  let fittedSize=size,lines=wrapRich(segments,regular,bold,fittedSize,width);
  while(lines.length>maxLines&&fittedSize>8.4){fittedSize-=.2;lines=wrapRich(segments,regular,bold,fittedSize,width)}
  lines.forEach((line,index)=>{const last=index===lines.length-1,wordsWidth=line.reduce((sum,word)=>sum+word.font.widthOfTextAtSize(word.text,fittedSize),0),gap=line.length===1?0:(last?regular.widthOfTextAtSize(" ",fittedSize):(width-wordsWidth)/(line.length-1));let cursor=x;line.forEach(word=>{page.drawText(word.text,{x:cursor,y:y-index*lineHeight,size:fittedSize,font:word.font,color:PDFLib.rgb(0,0,0)});cursor+=word.font.widthOfTextAtSize(word.text,fittedSize)+gap})});
}
function drawCenteredWrapped(page,text,{centerX,y,width,font,size,lineHeight,maxLines=3}){
  let fittedSize=size,lines=wrapLines(text,font,fittedSize,width);
  while(lines.length>maxLines&&fittedSize>6.5){fittedSize-=.2;lines=wrapLines(text,font,fittedSize,width)}
  lines.forEach((line,index)=>page.drawText(line,{x:centerX-font.widthOfTextAtSize(line,fittedSize)/2,y:y-index*lineHeight,size:fittedSize,font,color:PDFLib.rgb(0,0,0)}));
}
async function generate(){
  let valid=true,invalidCpf=false;requiredIds.forEach(id=>{const el=$(id),bad=!el.value.trim()||(id==="email"&&!/^\S+@\S+\.\S+$/.test(el.value))||(id==="cpf"&&!validCpf(el.value));el.classList.toggle("invalid",bad);if(bad){valid=false;if(id==="cpf"&&el.value.trim())invalidCpf=true}});
  if(!valid){$("finalStatus").className="status error";$("finalStatus").textContent=invalidCpf?"CPF inválido. Confira os números informados.":"Revise os campos destacados.";document.querySelector(".invalid")?.focus();return}
  $("finalStatus").className="status";$("finalStatus").textContent="Gerando o documento oficial…";
  try{
    const loadAsset=async path=>fetch(path).then(response=>{if(!response.ok)throw new Error(`Arquivo necessário não encontrado: ${path}`);return response.arrayBuffer()});
    const [templateBytes,regularBytes,boldBytes]=await Promise.all([loadAsset("modelo-convenio.pdf?v=20260717-7"),loadAsset("TIMES.TTF?v=20260717-7"),loadAsset("TIMESBD.TTF?v=20260717-7")]);
    const pdf=await PDFLib.PDFDocument.load(templateBytes);pdf.registerFontkit(fontkit);
    const pages=pdf.getPages(),regular=await pdf.embedFont(regularBytes,{subset:true}),bold=await pdf.embedFont(boldBytes,{subset:true}),white=PDFLib.rgb(1,1,1);
    const razao=$("razaoSocial").value.trim().toUpperCase(),complemento=$("complemento").value.trim();
    const estado=estados[$("uf").value.toUpperCase()]||`Estado de ${$("uf").value.toUpperCase()}`;
    const enderecoCompleto=`${$("endereco").value}, nº ${$("numero").value}${complemento?`, ${complemento}`:""}, ${$("bairro").value}, na cidade de ${$("cidade").value}, ${estado}, CEP ${$("cep").value}`;
    const qualificacao=`${$("representante").value}, PORTADOR DO RG Nº ${$("rg").value} ${$("orgaoExpedidor").value} E CPF Nº ${$("cpf").value}, ${$("cargo").value}, E-MAIL "${$("email").value}"`.toUpperCase();
    const intro=[{text:"Termo de Convênio de Concessão de Estágio que entre si celebram a UNINGÁ – CENTRO UNIVERSITÁRIO INGÁ e"},{text:razao,bold:true},{text:", visando à concessão de Estágio Supervisionado Curricular Obrigatório, nos termos da Lei 11.788/2008."}];
    const preambulo=[{text:"A UNINGÁ – CENTRO UNIVERSITÁRIO INGÁ, mantida pela UNIDADE DE ENSINO SUPERIOR INGÁ LTDA., pessoa jurídica de direito privado, inscrita no CNPJ sob N. 01.207.056/0001-84, com sede à Rodovia PR 317, N. 6114, Parque Industrial 200, na cidade de Maringá, Estado do Paraná, CEP 87035-510, doravante denominada UNINGÁ, neste ato representada pela Coordenação da Central de Estágios, Jaiane Cardoso Costa Tavares, inscrita no CPF Nº 121.804.459-46, portadora do RG Nº 14.523.783-1; e"},{text:razao,bold:true},{text:", inscrita no CNPJ sob N°"},{text:$("cnpj").value,bold:true},{text:", com sede à"},{text:enderecoCompleto.toUpperCase(),bold:true},{text:", neste ato representado por"},{text:qualificacao,bold:true},{text:", doravante denominado CONCEDENTE, celebram entre si o presente TERMO DE CONVÊNIO DE CONCESSÃO DE ESTÁGIO OBRIGATÓRIO, nos termos da Lei 11.788/2008 e demais normas aplicáveis, estipulando sob cláusulas seguintes:"}];

    const page1=pages[0];
    page1.drawRectangle({x:270,y:515,width:255,height:120,color:white});
    drawRichJustified(page1,intro,{x:278,y:607,width:240,regular,bold,size:12,lineHeight:14.55,maxLines:7});
    page1.drawRectangle({x:66,y:224,width:458,height:252,color:white});
    drawRichJustified(page1,preambulo,{x:76,y:457,width:441,regular,bold,size:12,lineHeight:18.5,maxLines:13});

    const page5=pages[4];
    page5.drawRectangle({x:72,y:300,width:225,height:23,color:white});
    page5.drawText(`Maringá/PR, ${formatDate($("data").value)}.`,{x:76,y:306,size:11,font:regular,color:PDFLib.rgb(0,0,0)});
    page5.drawRectangle({x:343,y:137,width:190,height:52,color:white});
    drawCenteredWrapped(page5,razao,{centerX:438,y:171,width:178,font:bold,size:8.5,lineHeight:9.5,maxLines:2});
    const concedente="CONCEDENTE";page5.drawText(concedente,{x:438-regular.widthOfTextAtSize(concedente,12)/2,y:144,size:12,font:regular,color:PDFLib.rgb(0,0,0)});

    pdf.setTitle("Termo de Convênio de Concessão de Estágio Obrigatório");pdf.setAuthor("UNINGÁ – Centro Universitário Ingá");pdf.setCreator("Gerador de Convênios em PDF");
    const bytes=await pdf.save(),blob=new Blob([bytes],{type:"application/pdf"}),url=URL.createObjectURL(blob),link=document.createElement("a");
    const name=razao.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");link.href=url;link.download=`convenio-${name}.pdf`;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    $("finalStatus").className="status success";$("finalStatus").textContent="Documento oficial de 6 páginas gerado com sucesso.";
  }catch(error){$("finalStatus").className="status error";$("finalStatus").textContent=`Não foi possível gerar o PDF: ${error.message}`}
}
$("form").addEventListener("submit",e=>{e.preventDefault();generate()});$("generateButton").addEventListener("click",generate);$("clearButton").addEventListener("click",()=>{if(confirm("Deseja limpar todos os dados?")){$("form").reset();$("data").value=new Date().toISOString().slice(0,10);$("importStatus").textContent="";$("finalStatus").textContent="";updateProgress()}});updateProgress();
