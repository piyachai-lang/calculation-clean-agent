function calculate(x){
 const keys=['width','length','height','temp','reserve'];
 for(const k of keys)if(x[k]===''||!Number.isFinite(Number(x[k])))throw Error('กรุณากรอกข้อมูลตัวเลขให้ครบ');
 const w=+x.width,l=+x.length,h=+x.height,t=+x.temp,r=+x.reserve;
 if(w<=0||l<=0||h<=0)throw Error('ขนาดห้องต้องมากกว่า 0');
 if(r<0)throw Error('เปอร์เซ็นต์เผื่อต้องไม่น้อยกว่า 0');
 const c={A:4.5,B:5.9,C:4.5}[x.fireClass],s=.0664+.0002741*t;
 if(!c||s<=0)throw Error('ค่า Class หรืออุณหภูมิไม่สามารถคำนวณได้');
 const area=Math.ceil(w*l),volume=Math.ceil(w*l*h),factor=c/(s*(100-c)),base=volume*factor,mass=Math.ceil(base*(1+r/100));
 if(!Number.isFinite(mass)||mass>Number.MAX_SAFE_INTEGER)throw Error('ค่าที่กรอกสูงเกินช่วงที่คำนวณได้');
 return {area,volume,c,s,factor,base,mass};
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
if(typeof module!=='undefined')module.exports={calculate,TANKS,selectTanks,parseFillPercent};
