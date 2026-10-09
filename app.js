const $=id=>document.getElementById(id);
const ids=['agent','project','room','width','length','height','fireClass','temp','reserve','fillPercent','igCapacity','f1','f2','openingPercent'];
let result=null;
let pdfUrl=null;
function clearPdf(){
 if(pdfUrl){URL.revokeObjectURL(pdfUrl);pdfUrl=null;}
 $('pdfLinks').hidden=true;
 $('pdfStatus').textContent='';
}
const get=()=>Object.fromEntries(ids.map(id=>[id,$(id).value]));
const sameInputs=(a,b)=>ids.every(id=>String(a[id])===String(b[id]));
function saveDraft(calculated=false){
 try{localStorage.setItem('fk-draft-v2',JSON.stringify({inputs:get(),calculated}))}catch{}
}
const f=(n,d=2)=>n.toLocaleString('th-TH',{maximumFractionDigits:d});
const fillText=t=>t.fills.map(fill=>f(fill.count,0)+' ถัง × '+f(fill.kg,2)+' กก.').join(' + ');
const defaults={FK:{fireClass:'C',temp:20,reserve:2,fillPercent:80},IG100:{fireClass:'C',temp:25,reserve:10,igCapacity:140},CO2:{f1:.75,f2:1.33,openingPercent:2}};
const settings=new Map();let activeAgent=$('agent').value||'FK';
function configureAgent(){
 const a=$('agent').value||'FK',fk=a==='FK',co2=a==='CO2';
 ['classField','tempField','reserveField'].forEach(id=>$(id).hidden=co2);
 ['fillField','fillPercentHelp','reserveHelp','fkTable'].forEach(id=>$(id).hidden=!fk);
 $('igField').hidden=a!=='IG100';
 ['f1Field','f2Field','openingField'].forEach(id=>$(id).hidden=!co2);
 const concentrations=fk?{A:4.5,B:5.9,C:4.5}:{A:37.2,B:43.7,C:41.9};
 for(const option of $('fireClass').options||[]){if(concentrations[option.value])option.textContent='Class '+option.value+' — '+concentrations[option.value]+'%';}
 $('agentHelp').textContent=fk?'ความเข้มข้นตามชีท FK และเลือกถังตามช่วงเติมที่กำหนด':co2?'แสดงทั้ง W1 และ W2 ตามชีท CO2 รวมสารเพิ่ม 5 กก./ม² ของพื้นที่ช่องเปิด ใช้ถัง 67.5 ลิตร บรรจุ 45.9 กก./ถัง':'ความเข้มข้นตามชีท IG-100 (N2) เลือกถัง 80 หรือ 140 ลิตร และปัดจำนวนถังขึ้นตาม Excel';
 const common='A = ROUNDUP(w × l, 0)\nV = ROUNDUP(w × l × h, 0)\n';
 $('referenceFormula').textContent=common+(co2?'พื้นที่ 5 ด้าน = ROUNDUP(2wh + 2lh + wl, 0)\nสารเพิ่ม = พื้นที่ 5 ด้าน × ช่องเปิด% / 100 × 5\nW1 = ROUNDUP(V / f1, 0) + สารเพิ่ม\nW2 = ROUNDUP(V × f2, 0) + สารเพิ่ม\nจำนวนถัง = ROUNDUP(W / 45.9, 0)':(fk?'S = 0.0664 + 0.0002741 × T\nfactor = C / [S × (100 − C)]':'S = 0.7997 + 0.00293 × T\nfactor = (1 / S) × LN(100 / (100 − C))')+'\nW = ROUNDUP(V × factor × (1 + เผื่อ / 100), 0)'+(fk?'':'\nจำนวนถัง = ROUNDUP(W / สารต่อถัง, 0)'));
 $('referenceNote').textContent=fk?'ใช้สูตร N9 และ P9 ตามชีท FK ปรับเพดานเติมตามเปอร์เซ็นต์ที่ระบุ':co2?'ใช้สูตร H9:W9 ตามชีท CO2 ค่าเริ่มต้น f1 = 0.75, f2 = 1.33, ช่องเปิด = 2% เก็บทศนิยมของสารเพิ่มและ W1/W2 ตาม Excel ไม่มีการปัด W ซ้ำ':'ใช้สูตร H9:S9 ตามชีท IG-100 (N2) และตาราง U13:V14: ถัง 80 ลิตร = 24.68 กก., 140 ลิตร = 43.18 กก. ค่าปริมาณเผื่อเริ่มต้น 10%';
 $('sourceNote').textContent='แหล่งข้อมูล: DesignFireSup-20261002.xlsx • Sheet '+AGENTS[a].sheet+(fk?' • ข้อมูลถังจากตารางภาพที่ผู้ใช้ให้มา (25–127 ลิตร)':'');
 $('concentrationLabel').textContent=co2?'พื้นที่ 5 ด้าน':'ความเข้มข้น';
 $('baseLabel').textContent=co2?'สารเพิ่มจากช่องเปิด':'สารก่อนเผื่อ / ปัดขึ้น';
 $('resultPill').textContent=co2?'CO2 — วิธี W1 (V / f1 + สารเพิ่ม)':AGENTS[a].name;
 $('tankHeading').textContent=co2?'จำนวนถังตามวิธี W1':'ถังที่เลือกจากตาราง';
 $('tankRule').textContent=fk?'เลือกจำนวนถังน้อยที่สุด แล้วเลือกขนาดเล็กที่สุด ใช้ถังขนาดเดียวกัน แบ่งสารละเอียด 0.01 กก. ภายในช่วงเติมที่กำหนด และยอดรวมเท่ากับสารที่คำนวณได้':'จำนวนถัง = ปริมาณสาร ÷ สารต่อถัง แล้วปัดขึ้นเป็นจำนวนเต็มตาม Excel';
}
const limitCells=new Map();
function updateFillLimits(){
 let units;
 try{units=parseFillPercent($('fillPercent').value)}catch{}
 $('fillLimitHeading').textContent=units?'ใช้ได้ที่ '+f(units/100)+'% (กก.)':'เติมได้จริง (กก.)';
 TANKS.forEach(t=>{const cell=limitCells.get(t.liters);if(cell)cell.textContent=units?f(Math.round(t.max*10)*units/100000,5):'—'});
}

function showTank(t,mass){
 document.querySelectorAll('#fills tr').forEach(row=>row.classList.toggle('selected-tank',!!t&&+row.dataset.liters===t.liters));
 $('tankResult').hidden=false;
 $('tankResult').classList.toggle('no-tank',!t);
 if(t&&t.kind==='fixed'){
  $('tankSize').textContent=f(t.liters)+' ลิตร';$('tankCount').textContent=f(t.count,0)+' ถัง';
  $('tankFill').textContent='สารต่อถัง '+f(t.perTank)+' กก. × '+f(t.count,0)+' ถัง = '+f(t.perTank*t.count)+' กก.';
  $('tankRange').textContent='ปริมาณสารที่คำนวณได้ '+f(mass,6)+' กก. • จำนวนถังปัดขึ้นตาม Excel';return;
 }
 if(!t){
  $('tankSize').textContent='ไม่มีถังที่ตรงช่วงเติม';
  $('tankCount').textContent='';
  $('tankFill').textContent=mass<11?'ปริมาณสาร '+f(mass)+' กก. ต่ำกว่าขั้นต่ำ 11 กก. ของถังเล็กที่สุด':'ไม่สามารถแบ่งสาร '+f(mass)+' กก. ลงถังขนาดเดียวกันให้ตรงช่วงเติมที่ '+$('fillPercent').value+'% ได้';
  $('tankRange').textContent='ตรวจสอบเปอร์เซ็นต์เติมสูงสุดและช่วงเติมขั้นต่ำของถัง';
  return;
 }
 $('tankSize').textContent=f(t.liters,0)+' ลิตร';
 $('tankCount').textContent=f(t.count,0)+' ถัง';
 $('tankFill').textContent='การเติมสาร: '+fillText(t)+' = '+f(t.total,0)+' กก.';
 $('tankRange').textContent='สูงสุดตามตาราง '+f(t.max,1)+' × '+f(t.fillPercent)+'% = '+f(t.effectiveMax,5)+' กก.\nช่วงเติมที่ใช้เลือกถัง '+f(t.min,1)+'–'+f(t.effectiveMax,5)+' กก./ถัง';
 $('tankRange').style.whiteSpace='pre-line';
}

function clearResult(){
 clearPdf();
 result=null;
 ['mass','volume','area','concentration','base'].forEach(id=>$(id).textContent='—');
 $('detail').textContent='ยังไม่มีผลการคำนวณ';
 $('tankResult').hidden=true;
 $('co2Second').hidden=true;$('mass2').textContent='—';$('co2Count2').textContent='';
 ['tankSize','tankCount','tankFill','tankRange'].forEach(id=>$(id).textContent='');
 $('roundnote').textContent='รวมปริมาณเผื่อและปัดขึ้นเป็นจำนวนเต็ม';
 document.querySelectorAll('#fills tr').forEach(row=>row.classList.remove('selected-tank'));
 $('print').disabled=$('copy').disabled=true;
 $('viewResult').hidden=true;
 $('resultTitle').textContent='กรอกข้อมูลแล้วกดคำนวณ';
}

function run(){
 try{
  const x=get(), y=calculate(x), tank=agentTank(x,y);
  configureAgent();
  clearPdf();
  result={x,y,tank};
  $('error').textContent='';
  $('toast').textContent='คำนวณ '+AGENTS[y.agent].name+' แล้ว: ปริมาตร '+f(y.volume,0)+' ม³ • '+(y.agent==='CO2'?'W1 ':'สาร ')+f(y.mass,6)+' กก.';
  $('resultTitle').textContent=[x.project,x.room].filter(Boolean).join(' / ')||'ปริมาณสาร '+AGENTS[y.agent].name;
  $('mass').textContent=f(y.mass,6);
  $('volume').textContent=f(y.volume,0)+' ม³';
  $('area').textContent=f(y.area,0)+' ม²';
  $('concentration').textContent=y.agent==='CO2'?f(y.surface,0)+' ม²':y.c+'%';
  $('base').textContent=f(y.agent==='CO2'?y.extra:y.base,6)+' กก.';
  $('roundnote').textContent=y.agent==='CO2'?'รวมสารเพิ่มจากช่องเปิด '+x.openingPercent+'% ของพื้นที่ 5 ด้าน':'รวมปริมาณเผื่อ '+x.reserve+'% และปัดขึ้นเป็นจำนวนเต็ม';
  $('detail').textContent=calculationText(x,y);
  $('co2Second').hidden=y.agent!=='CO2';
  if(y.agent==='CO2'){$('mass2').textContent=f(y.mass2,6)+' กก.';$('co2Count2').textContent='ถัง 67.5 ลิตร จำนวน '+f(y.count2,0)+' ถัง • '+f(45.9*y.count2)+' กก. รวม';}
  $('detail').style.whiteSpace='pre-line';
  updateFillLimits();showTank(tank,y.mass);
  $('print').disabled=$('copy').disabled=false;
  $('viewResult').hidden=false;
  try{localStorage.setItem('fk-inputs-v1',JSON.stringify(x))}catch{}
  saveDraft(true);
  return true;
 }catch(e){clearResult();$('error').textContent=e.message;return false;}
}

// This is a local calculator, not an HTML form submission. Never navigate or reload.
$('calculateButton').onclick=()=>{saveDraft();run();};
$('form').addEventListener('keydown',e=>{
 if(e.key==='Enter'&&e.target&&e.target.tagName==='INPUT'){
  e.preventDefault();saveDraft();run();
 }
});
function onInputChange(){
 const next=$('agent').value||'FK';
 if(next!==activeAgent){
  settings.set(activeAgent,Object.fromEntries(Object.keys(defaults[activeAgent]).map(id=>[id,$(id).value])));
  Object.entries(settings.get(next)||defaults[next]).forEach(([id,v])=>$(id).value=v);
  activeAgent=next;configureAgent();
 }
 // Some mobile keyboards emit a final input/change event after tapping Calculate.
 // An unchanged value must not erase a result that was just calculated.
 if(result&&sameInputs(get(),result.x)){saveDraft(true);return;}
 clearResult();updateFillLimits();$('error').textContent='';$('toast').textContent='ข้อมูลเปลี่ยนแล้ว กดคำนวณเพื่อดูผลใหม่';
 saveDraft();
}
$('form').addEventListener('input',onInputChange);
$('form').addEventListener('change',onInputChange);
$('example').onclick=()=>{
 const a=$('agent').value||'FK';
 const dims={FK:{width:4.05,length:4.35,height:2.85},IG100:{width:5,length:9,height:3.67},CO2:{width:12,length:18,height:3.9}};
 const x={agent:a,project:'ตัวอย่างจาก Excel',room:'',...dims[a],...defaults[a]};
 Object.entries(x).forEach(([id,v])=>$(id).value=v);activeAgent=a;run();
};
$('reset').onclick=()=>{
 // A form control named/id="reset" can shadow HTMLFormElement.reset().
 // Clear explicitly: native reset would also restore defaults instead of emptying all fields.
 ids.filter(id=>id!=='agent').forEach(id=>$(id).value='');settings.clear();configureAgent();
 clearResult();updateFillLimits();$('error').textContent='';$('toast').textContent='ล้างทุกช่องและผลคำนวณแล้ว';
 try{localStorage.removeItem('fk-inputs-v1');localStorage.removeItem('fk-draft-v2')}catch{}
};
$('print').onclick=()=>{
 if(!result)return;
 try{
  clearPdf();
  const blob=buildReportPdf(result);
  pdfUrl=URL.createObjectURL(blob);
  const filename=result.y.agent+'-Report-'+new Date().toISOString().slice(0,10)+'.pdf';
  $('pdfDownload').href=pdfUrl;$('pdfDownload').download=filename;
  $('pdfOpen').href=pdfUrl;
  $('pdfLinks').hidden=false;
  $('pdfStatus').textContent='สร้าง PDF แล้ว หากยังไม่ดาวน์โหลด ให้กด “บันทึกไฟล์ PDF” หรือ “เปิด PDF” ด้านล่าง';
  $('pdfDownload').click();
 }catch(e){$('pdfStatus').textContent='สร้าง PDF ไม่สำเร็จ: '+e.message;}
};
$('copy').onclick=async()=>{
 if(!result)return;
 const {x,y,tank}=result;
 const co2=y.agent==='CO2',fixed=tank&&tank.kind==='fixed';
 const text=[AGENTS[y.agent].name,x.project,x.room,
  'ขนาด: '+x.width+' × '+x.length+' × '+x.height+' ม.',
  co2?'f1 '+x.f1+' / f2 '+x.f2+' / ช่องเปิด '+x.openingPercent+'%':'Class '+x.fireClass+' / C '+y.c+'% / T '+x.temp+' °C',
  'V '+y.volume+' ม³'+(co2?'':' / เผื่อ '+x.reserve+'%'),
  (co2?'W1 ':'ปริมาณสาร ')+y.mass+' กก.',
  y.agent==='FK'?'เติมสูงสุด '+x.fillPercent+'% ของค่าสูงสุดในตาราง':'',
  tank?'ถัง '+tank.liters+' ลิตร จำนวน '+tank.count+' ถัง':$('tankFill').textContent,
  co2?'W2 '+y.mass2+' กก. / จำนวน '+y.count2+' ถัง':'',
  fixed?'สารต่อถัง '+tank.perTank+' กก.':tank?'การเติมสาร: '+fillText(tank)+' = '+tank.total+' กก.':'',
  tank&&!fixed?'สูงสุดตามตาราง '+tank.max+' × '+tank.fillPercent+'% = '+f(tank.effectiveMax,5)+' กก.':'',
  calculationText(x,y),
  'สูตรสาร: DesignFireSup-20261002.xlsx, Sheet '+AGENTS[y.agent].sheet
 ].filter(Boolean).join('\n');
 try{await navigator.clipboard.writeText(text);$('toast').textContent='คัดลอกผลพร้อมข้อมูลถังแล้ว'}
 catch{$('toast').textContent='เบราว์เซอร์ไม่อนุญาตให้คัดลอก กรุณาใช้พิมพ์ / PDF'}
};

TANKS.forEach(t=>{
 const tr=document.createElement('tr');tr.dataset.liters=t.liters;
 [t.liters,t.min,t.max].forEach(v=>{const td=document.createElement('td');td.textContent=v;tr.append(td)});
 const limit=document.createElement('td');tr.append(limit);limitCells.set(t.liters,limit);
 $('fills').append(tr);
});
try{
 const draft=JSON.parse(localStorage.getItem('fk-draft-v2'));
 const saved=draft&&draft.inputs?draft.inputs:JSON.parse(localStorage.getItem('fk-inputs-v1'));
 if(saved&&typeof saved==='object'){
  ids.forEach(id=>{if(saved[id]!==undefined)$(id).value=String(saved[id])});
  activeAgent=$('agent').value||'FK';
  if(!draft||draft.calculated)run();
  else $('toast').textContent='คืนข้อมูลที่กรอกไว้แล้ว กดคำนวณเพื่อดูผล';
 }
}catch{}
configureAgent();updateFillLimits();
['calculateButton','example','reset'].forEach(id=>$(id).disabled=false);
$('runtimeNotice').hidden=true;
