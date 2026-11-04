import {createVehicleConfig,createVehicleState,stepVehicle} from "../vehicle/drift-physics.mjs";
import {DriftAudioEngine} from "../vehicle/audio-engine.mjs";

const el=id=>document.getElementById(id);
const canvas=el("scene"),ctx=canvas.getContext("2d",{alpha:false});
const ui={overlay:el("overlay"),start:el("start"),reset:el("reset"),sound:el("sound"),
 speed:el("speed"),rpm:el("rpm"),angle:el("angle"),score:el("score"),gear:el("gear"),road:el("road"),
 front:el("front"),rear:el("rear"),lateral:el("lateral"),sim:el("sim"),arcade:el("arcade"),
 modeText:el("modeText"),volume:el("volume"),volText:el("volText")};

const base=createVehicleConfig({massKg:1991,wheelbaseM:3.052,frontWeightRatio:.55,
 enginePowerKw:362,maxDriveForceN:8800,dragCoefficient:.335,frontalAreaM2:2.4});
const arcade=createVehicleConfig({...base,tireFriction:1.2,handbrakeRearFriction:.36,
 frontCorneringStiffnessNPerRad:90000,rearCorneringStiffnessNPerRad:97000});
const audio=new DriftAudioEngine();
const track={ox:112,oz:76,ix:66,iz:31};
const keys=new Set(),touch=new Set();
let car=createVehicleState({z:-52}),mode="sim",started=false,paused=false,last=0,score=0,lastThrottle=0;
let marks=[],lastMark=null,w=1,h=1,scale=2,frame=0;

function input(){
 let steer=(down("right")?1:0)-(down("left")?1:0);
 const throttle=down("throttle")?1:0,brake=down("brake")?1:0,handbrake=down("handbrake")?1:0;
 if(mode==="arcade"){const f=Math.min(1,Math.abs(car.vx)/26);steer=Math.sign(steer)*Math.pow(Math.abs(steer),.82)*(.68+f*.27);}
 return {throttle,brake,steering:steer,handbrake};
}
function down(k){return keys.has(k)||touch.has(k);}
function reset(){
 car=createVehicleState({z:-52});score=0;lastThrottle=0;marks=[];lastMark=null;
 audio.update({speedMps:0,rpm:900});
}
function resize(){
 const r=canvas.getBoundingClientRect(),d=Math.min(2,devicePixelRatio||1);
 w=Math.max(1,r.width);h=Math.max(1,r.height);canvas.width=w*d;canvas.height=h*d;
 ctx.setTransform(d,0,0,d,0,0);
 scale=Math.max(1.2,Math.min(4.2,Math.min(w*.43/track.ox,h*.38/track.oz)));
}
function point(x,z){return {x:w/2+x*scale,y:h/2+z*scale};}
function onTrack(x,z){
 const outer=(x/track.ox)**2+(z/track.oz)**2,inner=(x/track.ix)**2+(z/track.iz)**2;
 return outer<=1&&inner>=1;
}
function ellipse(rx,rz,fill,stroke){
 ctx.beginPath();ctx.ellipse(w/2,h/2,rx*scale,rz*scale,0,0,Math.PI*2);
 ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle=stroke;ctx.lineWidth=Math.max(2,scale*.8);ctx.stroke();
}
function drawTrack(){
 ctx.fillStyle="#294b32";ctx.fillRect(0,0,w,h);
 ctx.save();ctx.globalAlpha=.12;ctx.strokeStyle="#d5e0c7";ctx.lineWidth=1;
 const grid=Math.max(22,scale*9);for(let x=w/2%grid;x<w;x+=grid){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}
 for(let y=h/2%grid;y<h;y+=grid){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}ctx.restore();
 ellipse(track.ox,track.oz,"#38423d","#c2c5b0");
 ellipse(track.ix,track.iz,"#315d39","#aeb9a1");
 ctx.save();ctx.setLineDash([10*scale,10*scale]);ctx.strokeStyle="#e3ddbd";ctx.lineWidth=1;
 ctx.beginPath();ctx.ellipse(w/2,h/2,(track.ox+track.ix)*.5*scale,(track.oz+track.iz)*.5*scale,0,0,Math.PI*2);ctx.stroke();ctx.restore();
 ctx.fillStyle="#3d6941";ctx.beginPath();ctx.ellipse(w/2,h/2,19*scale,10*scale,0,0,Math.PI*2);ctx.fill();
 for(const q of [[-30,-45],[30,-45],[30,45],[-30,45]]){const p=point(q[0],q[1]);ctx.fillStyle="#f28d4f";ctx.beginPath();ctx.moveTo(p.x,p.y-5*scale);ctx.lineTo(p.x-4*scale,p.y+4*scale);ctx.lineTo(p.x+4*scale,p.y+4*scale);ctx.closePath();ctx.fill();}
 const start=point(-9,-53.5),tile=Math.max(4,scale*2.8);
 for(let i=0;i<8;i++){ctx.fillStyle=i%2?"#202522":"#f1f1e7";ctx.fillRect(start.x+i*tile,start.y-2*scale,tile,4*scale);}
 ctx.save();ctx.textAlign="center";ctx.fillStyle="#dce8d766";ctx.font="800 "+Math.max(9,scale*4)+"px Arial";
 ctx.fillText("DRIFT TEST LOOP / 392 V8 RWD",w/2,h/2+4*scale);ctx.restore();
}
function drawMarks(){
 ctx.save();ctx.lineCap="round";for(const m of marks){const a=point(m.x1,m.z1),b=point(m.x2,m.z2);ctx.strokeStyle="rgba(7,9,8,"+m.a+")";ctx.lineWidth=Math.max(1.2,scale*1.2);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}ctx.restore();
}
function drawCar(){
 const p=point(car.x,car.z),L=8.4*scale,W=3.45*scale;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(car.yaw);
 ctx.shadowColor="#000b";ctx.shadowBlur=12*scale;ctx.shadowOffsetY=4*scale;ctx.fillStyle="#090c0a";
 for(const x of [-2.25,2.1])for(const y of [-W*.56,W*.56]){ctx.beginPath();ctx.roundRect(x*scale-1.15*scale,y-.38*scale,2.3*scale,.76*scale,.2*scale);ctx.fill();}
 ctx.shadowBlur=0;ctx.shadowOffsetY=0;ctx.fillStyle="#e86b27";ctx.strokeStyle="#ffc28e";ctx.lineWidth=Math.max(1,scale*.3);
 ctx.beginPath();ctx.roundRect(-L/2,-W/2,L,W,1.05*scale);ctx.fill();ctx.stroke();
 ctx.fillStyle="#a9431e";ctx.beginPath();ctx.roundRect(L*.08,-W*.34,L*.32,W*.68,.5*scale);ctx.fill();
 ctx.fillStyle="#16252a";ctx.beginPath();ctx.roundRect(-L*.12,-W*.37,L*.35,W*.74,.6*scale);ctx.fill();
 ctx.fillStyle="#c4e4e2";ctx.globalAlpha=.82;ctx.beginPath();ctx.moveTo(L*.4,-W*.3);ctx.lineTo(L*.47,-W*.2);ctx.lineTo(L*.47,W*.2);ctx.lineTo(L*.4,W*.3);ctx.closePath();ctx.fill();ctx.globalAlpha=1;
 ctx.fillStyle="#fff0c2";ctx.fillRect(L*.43,-W*.34,.25*scale,.53*scale);ctx.fillRect(L*.43,W*.18,.25*scale,.53*scale);
 ctx.fillStyle="#9b1718";ctx.fillRect(-L*.49,-W*.34,.2*scale,.55*scale);ctx.fillRect(-L*.49,W*.17,.2*scale,.55*scale);ctx.restore();
}
function updateMarks(inp){
 const speed=Math.hypot(car.vx,car.vy),drifting=speed>7&&(Math.abs(car.driftAngleRad)>.13||inp.handbrake>.5);
 if(!drifting){lastMark=null;return;}
 const x=car.x-Math.cos(car.yaw)*2.5,z=car.z-Math.sin(car.yaw)*2.5;
 if(lastMark&&frame%2===0){marks.push({x1:lastMark.x,z1:lastMark.z,x2:x,z2:z,a:Math.min(.34,.12+speed/130)});if(marks.length>1400)marks.splice(0,marks.length-1400);}
 lastMark={x,z};
}
function rpmGear(kmh,throttle){
 const t=[0,24,42,63,88,116,148,186,240];let g=1;for(let i=1;i<t.length;i++)if(kmh>t[i])g=i+1;
 const r=Math.max(0,Math.min(1,(kmh-t[g-1])/Math.max(1,(t[g]||245)-t[g-1])));
 return {gear:kmh<1?(throttle?"1":"N"):String(Math.min(8,g)),rpm:Math.max(850,Math.min(6400,900+r*5050+throttle*420))};
}
function hud(speed,rg,road){
 ui.speed.textContent=Math.round(speed);ui.rpm.textContent=Math.round(rg.rpm/100)*100;ui.gear.textContent=rg.gear;
 ui.angle.textContent=(car.driftAngleRad*180/Math.PI).toFixed(1)+"°";ui.score.textContent=Math.floor(score);
 ui.front.textContent=(car.frontSlipRad*180/Math.PI).toFixed(1)+"°";ui.rear.textContent=(car.rearSlipRad*180/Math.PI).toFixed(1)+"°";
 ui.lateral.textContent=car.vy.toFixed(1)+" m/s";ui.road.textContent=road?"داخل الحلبة":"خارج المسار";ui.road.style.color=road?"#e9f0e7":"#ff8a72";
}
function tick(now){
 const dt=last?Math.min(.05,(now-last)/1000):1/60;last=now;
 if(started&&!paused){
  const inp=input(),prevRpm=rpmGear(Math.hypot(car.vx,car.vy)*3.6,lastThrottle).rpm;
  let next=stepVehicle(mode==="sim"?base:arcade,car,inp,dt);
  if(mode==="arcade"){const vy=next.vy*.965;next=Object.freeze({...next,vy,yawRate:next.yawRate*.985,driftAngleRad:Math.atan2(vy,Math.max(Math.abs(next.vx),.1))});}
  car=next;const speed=Math.hypot(car.vx,car.vy),kmh=speed*3.6,road=onTrack(car.x,car.z),rg=rpmGear(kmh,inp.throttle);
  const angle=Math.abs(car.driftAngleRad);if(road&&kmh>22&&angle>.14){const quality=Math.max(0,1-Math.abs(angle-.48)/.9);score+=dt*kmh*.34*quality*(1+inp.handbrake*.1);}
  updateMarks(inp);hud(kmh,rg,road);audio.update({speedMps:speed,throttle:inp.throttle,driftAngle:car.driftAngleRad,handbrake:inp.handbrake,rpm:rg.rpm});
  if(lastThrottle>.82&&inp.throttle<.08&&prevRpm>2800&&inp.brake<.2)audio.pop();lastThrottle=inp.throttle;
 }
 drawTrack();drawMarks();drawCar();frame++;requestAnimationFrame(tick);
}
async function start(){try{await audio.start();ui.sound.textContent="كتم الصوت";}catch(e){console.warn(e);}started=true;paused=false;ui.overlay.classList.add("hidden");}
function setMode(m){mode=m;ui.sim.classList.toggle("active",m==="sim");ui.arcade.classList.toggle("active",m==="arcade");ui.modeText.textContent=m==="sim"?"توجيه مباشر مع تماسك الإطارات وانتقال الوزن.":"مساعدة أكبر على التحكم واستقرار السيارة.";}

ui.start.addEventListener("click",start);ui.reset.addEventListener("click",reset);
ui.sim.addEventListener("click",()=>setMode("sim"));ui.arcade.addEventListener("click",()=>setMode("arcade"));
ui.sound.addEventListener("click",async()=>{if(!started)return start();const mute=ui.sound.dataset.muted!=="yes";audio.setEnabled(!mute);ui.sound.dataset.muted=mute?"yes":"no";ui.sound.textContent=mute?"تشغيل الصوت":"كتم الصوت";if(!mute)await audio.start();});
ui.volume.addEventListener("input",()=>{const v=Number(ui.volume.value)/100;audio.setVolume(v);ui.volText.textContent=Math.round(v*100)+"%";});
const map={ArrowUp:"throttle",KeyW:"throttle",ArrowDown:"brake",KeyS:"brake",ArrowLeft:"left",KeyA:"left",ArrowRight:"right",KeyD:"right",Space:"handbrake"};
window.addEventListener("keydown",e=>{if(map[e.code]){keys.add(map[e.code]);e.preventDefault();}if(e.code==="KeyR")reset();if(e.code==="KeyP"||e.code==="Escape"){if(started){paused=!paused;if(!paused)last=0;}}},{passive:false});
window.addEventListener("keyup",e=>{if(map[e.code]){keys.delete(map[e.code]);e.preventDefault();}},{passive:false});
window.addEventListener("blur",()=>{keys.clear();touch.clear();});
document.querySelectorAll("[data-control]").forEach(b=>{const k=b.dataset.control;b.addEventListener("pointerdown",e=>{e.preventDefault();touch.add(k);b.setPointerCapture&&b.setPointerCapture(e.pointerId);});["pointerup","pointercancel","lostpointercapture"].forEach(n=>b.addEventListener(n,e=>{e.preventDefault();touch.delete(k);}));});
window.addEventListener("resize",resize);window.addEventListener("orientationchange",()=>setTimeout(resize,80));
resize();setMode("sim");requestAnimationFrame(tick);
