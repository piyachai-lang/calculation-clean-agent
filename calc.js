function calculate(x){
 const agent=x.agent||'FK';
 if(!['FK','IG100','CO2'].includes(agent))throw Error('กรุณาเลือกชนิดสาร');
 const keys=agent==='CO2'?['width','length','height','f1','f2','openingPercent']:['width','length','height','temp','reserve'];
 for(const k of keys)if(x[k]===''||!Number.isFinite(Number(x[k])))throw Error('กรุณากรอกข้อมูลตัวเลขให้ครบ');
 const w=+x.width,l=+x.length,h=+x.height,t=+x.temp,r=+x.reserve;
 if(w<=0||l<=0||h<=0)throw Error('ขนาดห้องต้องมากกว่า 0');
 const area=Math.ceil(w*l),volume=Math.ceil(w*l*h);
 if(!Number.isSafeInteger(area)||!Number.isSafeInteger(volume))throw Error('ขนาดห้องสูงเกินช่วงที่คำนวณได้');
 if(agent==='CO2'){
  const f1=+x.f1,f2=+x.f2,openingPercent=+x.openingPercent;
  if(f1<=0||f2<=0)throw Error('ค่า f1 และ f2 ต้องมากกว่า 0');
  if(openingPercent<0||openingPercent>100)throw Error('เปอร์เซ็นต์ช่องเปิดต้องอยู่ระหว่าง 0 ถึง 100');
  const base=Math.ceil(volume/f1),base2=Math.ceil(volume*f2),surface=Math.ceil(2*w*h+2*l*h+w*l),opening=surface*openingPercent/100,extra=5*opening;
  const mass=base+extra,mass2=base2+extra,count=Math.ceil(mass/45.9),count2=Math.ceil(mass2/45.9);
  if(![mass,mass2,surface,count,count2].every(v=>Number.isFinite(v)&&v<=Number.MAX_SAFE_INTEGER))throw Error('ค่าที่กรอกสูงเกินช่วงที่คำนวณได้');
  return {agent,area,volume,base,base2,surface,opening,extra,mass,mass2,count,count2};
 }
 if(r<0)throw Error('เปอร์เซ็นต์เผื่อต้องไม่น้อยกว่า 0');
 const c=(agent==='IG100'?{A:37.2,B:43.7,C:41.9}:{A:4.5,B:5.9,C:4.5})[x.fireClass],s=agent==='IG100'?.7997+.00293*t:.0664+.0002741*t;
 if(!c||s<=0)throw Error('ค่า Class หรืออุณหภูมิไม่สามารถคำนวณได้');
 const factor=agent==='IG100'?Math.log(100/(100-c))/s:c/(s*(100-c)),base=volume*factor,mass=Math.ceil(base*(1+r/100));
 if(!Number.isFinite(mass)||mass>Number.MAX_SAFE_INTEGER)throw Error('ค่าที่กรอกสูงเกินช่วงที่คำนวณได้');
 return {agent,area,volume,c,s,factor,base,mass};
}
const AGENTS={FK:{name:'FK-5-1-12 / Novec 1230',sheet:'FK'},IG100:{name:'IG-100 (N2)',sheet:'IG-100 (N2)'},CO2:{name:'CO2',sheet:'CO2'}};
function agentTank(x,y){
 if(y.agent==='CO2')return {kind:'fixed',liters:67.5,perTank:45.9,count:y.count,count2:y.count2};
 if(y.agent==='IG100'){
  const perTank={80:24.68,140:43.18}[x.igCapacity];
  if(!perTank)throw Error('กรุณาเลือกขนาดถัง IG-100');
  return {kind:'fixed',liters:+x.igCapacity,perTank,count:Math.ceil(y.mass/perTank)};
 }
 return selectTanks(y.mass,x.fillPercent);
}
function calculationText(x,y){
 if(y.agent==='CO2')return 'พื้นที่ 5 ด้าน = ROUNDUP(2wh + 2lh + wl, 0) = '+y.surface+' m²\nพื้นที่ช่องเปิด = '+y.surface+' × '+x.openingPercent+'% = '+y.opening+' m²\nสารเพิ่ม = 5 × '+y.opening+' = '+y.extra+' kg\nW1 = ROUNDUP('+y.volume+' / '+x.f1+', 0) + '+y.extra+' = '+y.mass+' kg\nW2 = ROUNDUP('+y.volume+' × '+x.f2+', 0) + '+y.extra+' = '+y.mass2+' kg\nจำนวนถังแต่ละวิธี = ROUNDUP(W / 45.9, 0)';
 return 'S = '+y.s.toFixed(6)+' m³/kg\nfactor = '+y.factor.toFixed(9)+' kg/m³\nW = ROUNDUP('+y.volume+' × '+y.factor.toFixed(9)+' × '+(1+(+x.reserve)/100)+', 0) = '+y.mass+' kg';
}
// Nominal volume (L), minimum and maximum agent fill (kg), from the user's table.
const TANKS = Object.freeze([
 {liters:25,min:11,max:30}, {liters:38,min:16.8,max:45.6},
 {liters:61,min:26.9,max:73.2}, {liters:80,min:35.2,max:88},
 {liters:84,min:37,max:100.8}, {liters:120,min:52.8,max:132},
 {liters:127,min:55.9,max:152.4}
].map(Object.freeze));

function parseFillPercent(value){
 if(value===''||value===null||value===undefined)throw Error('กรุณาระบุเปอร์เซ็นต์เติมสูงสุด');
 const percent=Number(value), units=Math.round(percent*100);
 if(!Number.isFinite(percent)||percent<=0||percent>100||Math.abs(percent*100-units)>1e-7)
  throw Error('เปอร์เซ็นต์เติมสูงสุดต้องมากกว่า 0 ถึง 100 และมีทศนิยมไม่เกิน 2 ตำแหน่ง');
 return units;
}
function selectTanks(mass,fillPercent=100){
 // Input is the whole-kg W result after Excel's ROUNDUP, including reserve.
 if(!Number.isSafeInteger(mass)||mass<=0||!Number.isSafeInteger(mass*100))
  throw Error('ปริมาณสารสำหรับเลือกถังต้องเป็นจำนวนเต็มบวกในช่วงที่คำนวณได้');
 const percentUnits=parseFillPercent(fillPercent), totalCents=mass*100;
 const candidates=[];
 for(const tank of TANKS){
  // Work in integer 0.01 kg units. Round the usable limit DOWN, never above the user's ceiling.
  const numerator=Math.round(tank.max*10)*percentUnits;
  const capCents=Math.floor(numerator/1000),minCents=Math.round(tank.min*100);
  if(capCents<minCents)continue;
  const count=Math.ceil(totalCents/capCents);
  const lowCents=Math.floor(totalCents/count),highCount=totalCents%count;
  if(lowCents<minCents)continue;
  const fills=[{count:count-highCount,kg:lowCents/100}];
  if(highCount)fills.push({count:highCount,kg:(lowCents+1)/100});
  candidates.push({...tank,count,fills,total:mass,fillPercent:percentUnits/100,effectiveMax:numerator/100000});
 }
 candidates.sort((a,b)=>a.count-b.count||a.liters-b.liters);
 return candidates[0]||null;
}
if(typeof module!=='undefined')module.exports={calculate,TANKS,selectTanks,parseFillPercent,AGENTS,agentTank,calculationText};
