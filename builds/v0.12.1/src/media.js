// Start with ample headroom. Native preload can stop just short of the file end.
export function bufferFilm(video,canPlay){
 let wanted=false,pending=false;
 const ready=()=>Number.isFinite(video.duration)&&video.duration>0&&video.readyState>=3&&video.buffered.length>0&&video.buffered.start(0)<.1&&video.buffered.end(video.buffered.length-1)>=video.duration-Math.min(.35,video.duration*.1);
 const start=()=>{if(wanted&&canPlay()&&ready()&&video.paused&&!pending){pending=true;video.play().catch(()=>{}).finally(()=>pending=false);}};
 for(const type of ['progress','loadeddata','canplaythrough','durationchange'])video.addEventListener(type,start);
 video.auroraBuffered=ready;
 video.auroraPlayback=wantedNow=>{if(wanted!==wantedNow){wanted=wantedNow;if(wanted)video.preload='auto';else video.pause();}start();};
}
export const MEDIA={
 aurora:'../assets/design/aurora-hologram-source.png',vesper:null,ilex:null,
 dance:null,cozy:null,video1:null,poster1:null,video2:null,poster2:null,
 worldHub:null,worldDance:null,worldLounge:null,worldMuseum:null,
};
// Accepted production files replace this staging map before a release is frozen.
export async function loadMedia(){try{const r=await fetch('assets/media.json');if(r.ok)Object.assign(MEDIA,await r.json());}catch{}return MEDIA;}
export class MediaDirector{
 constructor(){this.enabled=false;this.volume=.65;this.track='';this.title='';this.audio=new Map();this.sources=new Set();this.ctx=null;this.analyser=null;this.duck=false;this.voiceAudio=null;this.voiceCaption='';this.voiceNode=null;this.voicePausedForPause=false;this.events=[];}
 gain(audio,value){value=Math.max(0,Math.min(1,value));if(Math.abs(audio.volume-value)>.0001)audio.volume=value;}
 async activate(enabled=true){this.enabled=enabled;if(!enabled){this.cancelVoice();for(const a of this.audio.values())a.pause();return;}if(enabled){try{this.ctx||=new AudioContext();this.analyser||=this.ctx.createAnalyser();this.analyser.fftSize=256;this.analyser.connect(this.ctx.destination);await this.ctx.resume();}catch{}if(this.track)this.play(this.track,this.title);}}
 play(file,title){this.track=file;this.title=title;if(!file)return;for(const [key,a] of this.audio)if(key!==file)a.pause();let a=this.audio.get(file);if(!a){a=new Audio(file);a.crossOrigin='anonymous';a.loop=true;a.preload='auto';a.className='media-source';a.dataset.auroraRole='music';a.setAttribute('aria-hidden','true');document.body.append(a);this.audio.set(file,a);if(this.ctx&&this.analyser){try{const src=this.ctx.createMediaElementSource(a);src.connect(this.analyser);this.sources.add(file);}catch{}}a.addEventListener('error',()=>{this.events.push({type:'error',file,code:a.error?.code});this.onFailure?.({kind:'music',file});});a.addEventListener('playing',()=>{this.events.push({type:'playing',file});this.onPlaying?.({kind:'music',file});});}if(this.ctx&&this.analyser&&!this.sources.has(file)){try{this.ctx.createMediaElementSource(a).connect(this.analyser);this.sources.add(file);}catch{}}this.gain(a,this.volume*((this.duck||this.voiceAudio&&!this.voiceAudio.paused)?.24:1));if(a.error)a.load();if(this.enabled)a.play().catch(e=>{this.events.push({type:'blocked',file,message:e.message});if(e.name!=='AbortError')this.onFailure?.({kind:'music',file,reason:e.message});});}
 update(dt=0,voiceActive=false){
  const voice=this.voiceAudio;
  if(voice){
   if(voice.ended)this.cancelVoice();
   else if(voiceActive){
    if(voice.currentTime>this.voiceLastTime+.01){this.voiceLastTime=voice.currentTime;this.voiceIdle=0;}
    else this.voiceIdle+=dt;
    // Count only unpaused game time. A healthy, advancing cue has no time limit.
    if(this.voiceIdle>8)this.failVoice(voice,'playback made no progress for eight active seconds');
   }
  }
  for(const a of this.audio.values()){const fade=Number.isFinite(a.duration)?Math.min(1,a.currentTime/1.3,Math.max(0,(a.duration-a.currentTime)/1.3)):1;this.gain(a,this.volume*((this.duck||this.voiceAudio&&!this.voiceAudio.paused)?.23:1)*Math.max(0,fade));}
 }
 reset(){this.cancelVoice();for(const a of this.audio.values()){a.pause();try{a.currentTime=0;}catch{}}}
 cancelVoice(){const a=this.voiceAudio;this.voiceAudio=null;a?.pause();a?.remove();this.voiceNode?.disconnect();this.voiceNode=null;this.voiceCaption='';this.voicePausedForPause=false;this.voiceIdle=0;this.voiceLastTime=0;}
 failVoice(a,reason){
  // Late errors from a cancelled/replaced cue must not replace the current caption.
  if(this.voiceAudio!==a)return;
  const caption=this.voiceCaption,file=this.voiceFile;
  const duration=Math.max(3,(Number.isFinite(a.duration)?a.duration:this.voiceDuration)-(a.currentTime||0));
  this.events.push({type:'voice-failed',file,reason});
  this.cancelVoice();
  this.onFailure?.({kind:'voice',file,caption,duration});
 }
 playVoice(a){a.play().catch(e=>{if(e.name==='AbortError'&&a.paused)return;this.failVoice(a,e.message);});}
 voice(file,caption='',duration=0){
  if(!file||!this.enabled)return;
  this.cancelVoice();
  const a=new Audio(file);a.crossOrigin='anonymous';a.volume=this.volume;a.className='media-source';a.dataset.auroraRole='voice';a.setAttribute('aria-hidden','true');document.body.append(a);
  this.voiceAudio=a;this.voiceCaption=caption;this.voiceFile=file;this.voiceDuration=duration||Math.max(7,caption.length/15);
  if(this.ctx&&this.analyser){try{this.voiceNode=this.ctx.createMediaElementSource(a);this.voiceNode.connect(this.analyser);}catch{}}
  a.addEventListener('error',()=>this.failVoice(a,'media error '+a.error?.code));
  a.addEventListener('ended',()=>{if(this.voiceAudio===a)this.cancelVoice();});
  this.playVoice(a);
 }
 pause(){for(const a of this.audio.values())a.pause();this.voicePausedForPause=!!this.voiceAudio&&!this.voiceAudio.paused&&!this.voiceAudio.ended;this.voiceAudio?.pause();}
 resume(){if(this.enabled&&this.track)this.play(this.track,this.title);if(this.enabled&&this.voiceAudio&&this.voicePausedForPause&&!this.voiceAudio.ended)this.playVoice(this.voiceAudio);this.voicePausedForPause=false;}
 cue(type){if(!this.enabled||!this.ctx)return;const notes=type==='pulse'?[70,105,210]:type==='success'?[330,440,660]:[160,240];notes.forEach((f,i)=>{const o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type==='pulse'?'triangle':'sine';o.frequency.value=f;const t=this.ctx.currentTime+i*.05;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.05,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+.4);o.connect(g);g.connect(this.ctx.destination);o.start(t);o.stop(t+.42);});}
 diagnostics(){const a=this.audio.get(this.track);let energy=0;if(this.analyser){const d=new Uint8Array(this.analyser.fftSize);this.analyser.getByteTimeDomainData(d);energy=Math.sqrt(d.reduce((sum,x)=>sum+(x-128)**2,0)/d.length);}return{enabled:this.enabled,track:this.track,title:this.title,currentTime:a?.currentTime||0,duration:Number.isFinite(a?.duration)?a.duration:0,paused:a?.paused??true,readyState:a?.readyState||0,energy,voiceCaption:this.voiceCaption,voice:this.voiceAudio?{src:this.voiceAudio.currentSrc,currentTime:this.voiceAudio.currentTime,paused:this.voiceAudio.paused}:null,events:this.events.slice(-12)};}
}
