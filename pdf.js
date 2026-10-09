/* Client-side A4 report: canvas preserves Thai shaping using the device's fonts.
 * Pages are embedded as high-resolution JPEGs in a standard PDF, without a CDN.
 */
function buildReportPdf(snapshot){
 const {x,y,tank}=snapshot;
 const agent=y.agent||'FK',co2=agent==='CO2',info=AGENTS[agent];
 const W=1240,H=1754,L=76,R=1164,BOTTOM=1635;
 const pages=[];let canvas,ctx,cursor;
 const number=(n,d=2)=>Number(n).toLocaleString('th-TH',{maximumFractionDigits:d});
 const date=new Date().toLocaleString('th-TH',{dateStyle:'medium',timeStyle:'short'});
 function font(size=25,bold=false){ctx.font=(bold?'600 ':'400 ')+size+'px "Tahoma", "Leelawadee UI", sans-serif';ctx.textBaseline='top';}
 function line(text,xp,yp,size=25,color='#253d55',bold=false){font(size,bold);ctx.fillStyle=color;ctx.fillText(String(text),xp,yp);}
 function newPage(){
  canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;ctx=canvas.getContext('2d');
  if(!ctx)throw Error('เบราว์เซอร์นี้ไม่รองรับการสร้างรายงาน');
  ctx.fillStyle='#ffffff';ctx.fillRect(0,0,W,H);pages.push(canvas);
  line('Fire Agent Calculator',L,58,34,'#215cc5',true);
  line('รายงานคำนวณสารดับเพลิง '+info.name,L,111,29,'#183452',true);
  line('วันที่จัดทำ '+date,L,160,21,'#63758a');
  ctx.fillStyle='#dce7f2';ctx.fillRect(L,203,R-L,2);cursor=233;
 }
 function need(height){if(cursor+height>BOTTOM)newPage();}
 function wrap(text,width,size=25,bold=false){
  font(size,bold);
  const str=String(text),out=[];
  const split=typeof Intl.Segmenter==='function'?new Intl.Segmenter('th',{granularity:'grapheme'}):null;
  for(const paragraph of str.split('\n')){
   const chars=split?Array.from(split.segment(paragraph),s=>s.segment):Array.from(paragraph);
   let current='';
   for(const ch of chars){if(current&&ctx.measureText(current+ch).width>width){out.push(current);current=ch}else current+=ch;}
   out.push(current);
  }
  return out;
 }
 function paragraph(text,size=23,color='#52677d'){
  for(const part of wrap(text,R-L,size)){need(size+15);line(part,L,cursor,size,color);cursor+=size+15;}
  cursor+=8;
 }
 function heading(text){need(100);cursor+=9;ctx.fillStyle='#edf4ff';ctx.fillRect(L,cursor,R-L,49);line(text,L+14,cursor+9,26,'#24578a',true);cursor+=66;}
 function row(label,value){
  const lines=wrap(value,R-450,25);need(42);
  line(label,L,cursor,24,'#64788e');
  for(const part of lines){need(40);line(part,450,cursor,25,'#203c57',true);cursor+=40;}
  cursor+=4;
 }
 newPage();
 row('โครงการ',x.project||'ไม่ได้ระบุ');row('ห้อง / ตำแหน่ง',x.room||'ไม่ได้ระบุ');
 heading('1. ข้อมูลห้องและเงื่อนไข');
 row('กว้าง × ยาว × สูง',x.width+' × '+x.length+' × '+x.height+' เมตร');
 row('พื้นที่ / ปริมาตรที่ใช้',number(y.area,0)+' ม² / '+number(y.volume,0)+' ม³ (ปัดขึ้น)');
 if(co2){
  row('f1 / f2',x.f1+' ม³/กก. / '+x.f2+' กก./ม³');
  row('พื้นที่ 5 ด้าน',number(y.surface,0)+' ม²');
  row('ช่องเปิด / พื้นที่ช่องเปิด',x.openingPercent+'% / '+number(y.opening,6)+' ม²');
  row('สารเพิ่ม (5 กก./ม²)',number(y.extra,6)+' กก.');
 }else{
  row('Class / ความเข้มข้น',x.fireClass+' / '+number(y.c)+'%');
  row('อุณหภูมิ',x.temp+' °C');row('ปริมาณเผื่อ',x.reserve+'%');
 }
 if(agent==='FK')row('เพดานเติมถัง',x.fillPercent+'% ของค่าสูงสุดในตาราง');
 heading('2. ผลการคำนวณ');
 need(96);ctx.fillStyle='#e9f7f0';ctx.fillRect(L,cursor,R-L,82);
 line(co2?'ปริมาณสาร W1 (V / f1)':'ปริมาณสารที่ต้องใช้',L+18,cursor+24,28,'#205e4b',true);
 const massText=number(y.mass,6)+' กก.';
 let massFont=44;font(massFont,true);while(ctx.measureText(massText).width>430&&massFont>18){massFont-=2;font(massFont,true);}
 line(massText,R-18-ctx.measureText(massText).width,cursor+18,massFont,'#18765a',true);cursor+=105;
 if(tank){
  row('ถังที่เลือก',number(tank.liters)+' ลิตร จำนวน '+number(tank.count,0)+' ถัง');
  if(tank.kind==='fixed'){
   row('สารต่อถัง / รวม',number(tank.perTank)+' กก. / '+number(tank.perTank*tank.count)+' กก.');
   if(co2){row('ปริมาณสาร W2 (V × f2)',number(y.mass2,6)+' กก.');row('จำนวนถังตาม W2',number(y.count2,0)+' ถัง / รวม '+number(tank.perTank*y.count2)+' กก.');}
  }else{
  row('ช่วงเติมต่อถัง',number(tank.min)+' - '+number(tank.effectiveMax,5)+' กก.');
  row('ค่าสูงสุดหลังปรับ',number(tank.max)+' × '+number(tank.fillPercent)+'% = '+number(tank.effectiveMax,5)+' กก.');
  row('การแบ่งสาร',tank.fills.map(v=>number(v.count,0)+' ถัง × '+number(v.kg)+' กก.').join(' + '));
  }
 }else paragraph('ไม่มีถังที่ตรงช่วงเติมสำหรับปริมาณสารและเปอร์เซ็นต์ที่ระบุ กรุณาตรวจสอบก่อนเลือกถัง',24,'#9b542b');
 heading('3. รายละเอียดและแหล่งอ้างอิง');
 paragraph(calculationText(x,y),22);
 paragraph('สูตรสาร: DesignFireSup-20261002.xlsx, Sheet '+info.sheet+(agent==='FK'?'\nข้อมูลถัง: ตารางที่ผู้ใช้ให้มา (25 - 127 ลิตร)':agent==='IG100'?'\nข้อมูลถัง: U13:V14 (80 ลิตร = 24.68 กก., 140 ลิตร = 43.18 กก.)':'\nข้อมูลถัง: T9:U9 (67.5 ลิตร = 45.9 กก.)'),21);
 paragraph(agent==='FK'?'เลือกจำนวนถังน้อยที่สุดก่อน แล้วเลือกขนาดเล็กที่สุดที่รองรับได้ โดยทุกถังอยู่ในช่วงเติมที่กำหนด':'จำนวนถัง = ROUNDUP(ปริมาณสาร / สารต่อถัง, 0) ตาม Excel',21);
 paragraph('ตรวจสอบข้อกำหนดของผู้ผลิตและมาตรฐานของโครงการก่อนนำไปออกแบบระบบ',21);
 const images=pages.map((page,index)=>{
  ctx=page.getContext('2d');ctx.fillStyle='#dce7f2';ctx.fillRect(L,1660,R-L,2);
  line(info.name+' | '+number(y.mass,6)+' kg'+(co2?' (W1)':''),L,1682,19,'#6b7e91');
  line('หน้า '+(index+1)+' / '+pages.length,1020,1682,19,'#6b7e91');
  const binary=atob(page.toDataURL('image/jpeg',0.94).split(',')[1]);
  return Uint8Array.from(binary,ch=>ch.charCodeAt(0));
 });
 return encodeImagePdf(images,W,H);
}

function encodeImagePdf(images,width,height){
 const enc=new TextEncoder(),parts=[],offsets=[0];let offset=0;
 const bytes=x=>typeof x==='string'?enc.encode(x):x;
 function append(x){const b=bytes(x);parts.push(b);offset+=b.length;}
 function object(id,body){offsets[id]=offset;append(id+' 0 obj\n');append(body);append('\nendobj\n');}
 function stream(id,dict,body){offsets[id]=offset;append(id+' 0 obj\n<< '+dict+' /Length '+body.length+' >>\nstream\n');append(body);append('\nendstream\nendobj\n');}
 append('%PDF-1.4\n');append(new Uint8Array([37,226,227,207,211,10]));
 object(1,'<< /Type /Catalog /Pages 2 0 R >>');
 object(2,'<< /Type /Pages /Count '+images.length+' /Kids ['+images.map((_,i)=>(3+i*3)+' 0 R').join(' ')+'] >>');
 images.forEach((img,i)=>{
  const page=3+i*3,image=page+1,content=page+2;
  object(page,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im0 '+image+' 0 R >> >> /Contents '+content+' 0 R >>');
  stream(image,'/Type /XObject /Subtype /Image /Width '+width+' /Height '+height+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode',img);
  stream(content,'',enc.encode('q\n595.28 0 0 841.89 0 0 cm\n/Im0 Do\nQ\n'));
 });
 const xref=offset,count=3+images.length*3;
 append('xref\n0 '+count+'\n0000000000 65535 f \n');
 for(let id=1;id<count;id++)append(String(offsets[id]).padStart(10,'0')+' 00000 n \n');
 append('trailer\n<< /Size '+count+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF\n');
 return new Blob(parts,{type:'application/pdf'});
}
