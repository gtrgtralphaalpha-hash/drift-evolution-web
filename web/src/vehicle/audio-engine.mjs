/** Synthetic sound for tuning tests only; not a recorded HEMI or production audio. */
export class DriftAudioEngine {
  constructor() { this.ctx=null; this.master=null; this.a=null; this.b=null; this.filter=null; this.engineGain=null; this.noise=null; this.squeal=null; this.volume=.55; this.enabled=true; this.lastPop=0; }
  async start() {
    if (!this.enabled) return;
    if (!this.ctx) this.create();
    if (this.ctx.state === "suspended") await this.ctx.resume();
  }
  create() {
    const AC=window.AudioContext||window.webkitAudioContext;
    if (!AC) throw new Error("Web Audio unavailable");
    const c=this.ctx=new AC();
    this.master=c.createGain(); this.master.gain.value=this.volume; this.master.connect(c.destination);
    this.a=c.createOscillator(); this.a.type="sawtooth";
    this.b=c.createOscillator(); this.b.type="triangle";
    this.filter=c.createBiquadFilter(); this.filter.type="lowpass"; this.filter.frequency.value=800;
    this.engineGain=c.createGain(); this.engineGain.gain.value=.0001;
    const layer=c.createGain(); layer.gain.value=.0001;
    this.a.connect(this.filter); this.b.connect(this.filter); this.filter.connect(this.engineGain); this.engineGain.connect(this.master);
    this.b.connect(layer); layer.connect(this.master); this.layer=layer;
    this.a.start(); this.b.start();
    const buffer=c.createBuffer(1,c.sampleRate*2,c.sampleRate), data=buffer.getChannelData(0);
    let v=0; for(let i=0;i<data.length;i++){v=.82*v+.18*(Math.random()*2-1);data[i]=v;}
    this.noise=c.createBufferSource(); this.noise.buffer=buffer; this.noise.loop=true;
    const hp=c.createBiquadFilter(); hp.type="highpass"; hp.frequency.value=1100;
    this.squeal=c.createGain(); this.squeal.gain.value=.0001;
    this.noise.connect(hp).connect(this.squeal).connect(this.master); this.noise.start(); this.hp=hp;
  }
  setVolume(v){this.volume=Math.max(0,Math.min(1,Number(v)||0));if(this.master)this.master.gain.setTargetAtTime(this.enabled?this.volume:0,this.ctx.currentTime,.04);}
  setEnabled(v){this.enabled=!!v;if(this.master)this.master.gain.setTargetAtTime(this.enabled?this.volume:0,this.ctx.currentTime,.04);}
  update(s={}) {
    if(!this.ctx||this.ctx.state!=="running")return;
    const t=this.ctx.currentTime, rpm=Math.max(800,Math.min(7200,s.rpm||900)), slip=Math.min(1,Math.max(0,(Math.abs(s.driftAngle||0)-.08)/.55));
    const f=rpm/60*2;
    this.a.frequency.setTargetAtTime(f,t,.035); this.b.frequency.setTargetAtTime(f*2.01,t,.035);
    this.filter.frequency.setTargetAtTime(480+(s.throttle||0)*1800+rpm/7200*850,t,.05);
    const gain=.025+rpm/7200*.07;
    this.engineGain.gain.setTargetAtTime(gain,t,.05); this.layer.gain.setTargetAtTime(gain*.28,t,.05);
    this.squeal.gain.setTargetAtTime((slip*.075+(s.handbrake||0)*.035)*Math.min(1,(s.speedMps||0)/22),t,.07);
    this.hp.frequency.setTargetAtTime(1000+slip*2500,t,.06);
  }
  pop(){if(!this.ctx||this.ctx.state!=="running")return;const t=this.ctx.currentTime;if(t-this.lastPop<.22)return;this.lastPop=t;const o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type="square";o.frequency.setValueAtTime(105,t);o.frequency.exponentialRampToValueAtTime(42,t+.085);g.gain.setValueAtTime(.045,t);g.gain.exponentialRampToValueAtTime(.0001,t+.095);o.connect(g).connect(this.master);o.start(t);o.stop(t+.1);}
  close(){if(this.ctx)void this.ctx.close();this.ctx=null;}
}
