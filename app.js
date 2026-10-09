const $=id=>document.getElementById(id);
const ids=['project','room','width','length','height','fireClass','temp','reserve','fillPercent'];
let result=null;
const get=()=>Object.fromEntries(ids.map(id=>[id,$(id).value]));
const sameInputs=(a,b)=>ids.every(id=>String(a[id])===String(b[id]));
function saveDraft(calculated=false){
 try{localStorage.setItem('fk-draft-v2',JSON.stringify({inputs:get(),calculated}))}catch{}
}
const f=(n,d=2)=>n.toLocaleString('th-TH',{maximumFractionDigits:d});
const fillText=t=>t.fills.map(fill=>f(fill.count,0)+' ถัง × '+f(fill.kg,2)+' กก.').join(' + ');
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
 result=null;
 ['mass','volume','area','concentration','base'].forEach(id=>$(id).textContent='—');
 $('detail').textContent='ยังไม่มีผลการคำนวณ';
 $('tankResult').hidden=true;
 ['tankSize','tankCount','tankFill','tankRange'].forEach(id=>$(id).textContent='');
 $('roundnote').textContent='รวมปริมาณเผื่อและปัดขึ้นเป็นจำนวนเต็ม';
 document.querySelectorAll('#fills tr').forEach(row=>row.classList.remove('selected-tank'));
 $('print').disabled=$('copy').disabled=true;
 $('viewResult').hidden=true;
 $('resultTitle').textContent='กรอกข้อมูลแล้วกดคำนวณ';
}

function run(){
 try{
  const x=get(), y=calculate(x), tank=selectTanks(y.mass,x.fillPercent);
  result={x,y,tank};
  $('error').textContent='';
  $('toast').textContent='คำนวณแล้ว: ปริมาตร '+f(y.volume,0)+' ม³ • สาร '+f(y.mass,0)+' กก.';
  $('resultTitle').textContent=[x.project,x.room].filter(Boolean).join(' / ')||'ปริมาณสาร FK-5-1-12';
  $('mass').textContent=f(y.mass,0);
  $('volume').textContent=f(y.volume,0)+' ม³';
  $('area').textContent=f(y.area,0)+' ม²';
  $('concentration').textContent=y.c+'%';
  $('base').textContent=f(y.base)+' กก.';
  $('roundnote').textContent='รวมปริมาณเผื่อ '+x.reserve+'% และปัดขึ้นเป็นจำนวนเต็ม';
  $('detail').textContent='S = '+y.s.toFixed(6)+' m³/kg\nfactor = '+y.factor.toFixed(9)+' kg/m³\nW = ROUNDUP('+y.volume+' × '+y.factor.toFixed(9)+' × '+(1+(+x.reserve)/100)+', 0)';
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
 // Some mobile keyboards emit a final input/change event after tapping Calculate.
 // An unchanged value must not erase a result that was just calculated.
 if(result&&sameInputs(get(),result.x)){saveDraft(true);return;}
 clearResult();updateFillLimits();$('error').textContent='';$('toast').textContent='ข้อมูลเปลี่ยนแล้ว กดคำนวณเพื่อดูผลใหม่';
 saveDraft();
}
$('form').addEventListener('input',onInputChange);
$('form').addEventListener('change',onInputChange);
$('example').onclick=()=>{
 const x={project:'ตัวอย่างจาก Excel',room:'',width:4.05,length:4.35,height:2.85,fireClass:'C',temp:20,reserve:2,fillPercent:80};
 ids.forEach(id=>$(id).value=x[id]);run();
};
$('reset').onclick=()=>{
 // A form control named/id="reset" can shadow HTMLFormElement.reset().
 // Clear explicitly: native reset would also restore defaults instead of emptying all fields.
 ids.forEach(id=>$(id).value='');
 clearResult();updateFillLimits();$('error').textContent='';$('toast').textContent='ล้างทุกช่องและผลคำนวณแล้ว';
 try{localStorage.removeItem('fk-inputs-v1');localStorage.removeItem('fk-draft-v2')}catch{}
};
$('print').onclick=()=>{if(result)window.print()};
$('copy').onclick=async()=>{
 if(!result)return;
 const {x,y,tank}=result;
 const text=['FK-5-1-12 / Novec 1230',x.project,x.room,
  'ขนาด: '+x.width+' × '+x.length+' × '+x.height+' ม.',
  'Class '+x.fireClass+' / C '+y.c+'% / T '+x.temp+' °C',
  'V '+y.volume+' ม³ / เผื่อ '+x.reserve+'%',
  'ปริมาณสาร '+y.mass+' กก.',
  'เติมสูงสุด '+x.fillPercent+'% ของค่าสูงสุดในตาราง',
  tank?'ถัง '+tank.liters+' ลิตร จำนวน '+tank.count+' ถัง':$('tankFill').textContent,
  tank?'การเติมสาร: '+fillText(tank)+' = '+tank.total+' กก.':'',
  tank?'สูงสุดตามตาราง '+tank.max+' × '+tank.fillPercent+'% = '+f(tank.effectiveMax,5)+' กก.':'',
  tank?'ช่วงเติมต่อถัง '+tank.min+'–'+f(tank.effectiveMax,5)+' กก.':'',
  'เลือกจำนวนถังน้อยที่สุด แล้วเลือกขนาดเล็กที่สุด ใช้ถังขนาดเดียวกัน',
  'สูตรสาร: DesignFireSup-20261002.xlsx, Sheet FK / ข้อมูลถัง: ตารางที่ผู้ใช้ให้มา'
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
  if(!draft||draft.calculated)run();
  else $('toast').textContent='คืนข้อมูลที่กรอกไว้แล้ว กดคำนวณเพื่อดูผล';
 }
}catch{}
updateFillLimits();
['calculateButton','example','reset'].forEach(id=>$(id).disabled=false);
$('runtimeNotice').hidden=true;
