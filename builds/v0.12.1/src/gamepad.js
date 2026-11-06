// Standard browser Gamepad API input. No dependency on controller hardware or a driver.
const DEADZONE=.22;
export function stick(x=0,y=0){const length=Math.hypot(x,y);if(length<=DEADZONE)return{x:0,y:0};const scale=Math.min(1,(length-DEADZONE)/(1-DEADZONE))/length;return{x:x*scale,y:y*scale};}
const down=b=>!!b&&(b.pressed||b.value>.5);
export class GamepadControls{
 constructor({enabled,context,action,navigate,status,disconnect}){Object.assign(this,{enabled,context,action,navigate,status,disconnect});this.index=null;this.previous=[];this.armed=false;this.mode=null;this.focused=true;this.direction='';this.repeat=0;this.lastStatus='';this.motion={x:0,y:0,lookX:0,lookY:0};this.state={connected:false,enabled:false,armed:false,mapping:null};window.addEventListener('blur',()=>{this.focused=false;this.reset();});window.addEventListener('focus',()=>{this.focused=true;this.reset();});document.addEventListener('visibilitychange',()=>this.reset());}
 reset(){this.armed=false;this.direction='';this.repeat=0;this.motion={x:0,y:0,lookX:0,lookY:0};}
 message(value){if(value!==this.lastStatus){this.lastStatus=value;this.status?.(value);}}
 update(dt){
  let pads=[];if(typeof navigator.getGamepads!=='function'){this.reset();this.state={connected:false,enabled:!!this.enabled(),armed:false,apiUnavailable:true};this.message('Controller API unavailable here. Try current Chrome on HTTPS or localhost; keyboard and mouse work.');return this.motion;}try{pads=Array.from(navigator.getGamepads()).filter(p=>p?.connected);}catch{const lost=this.index!==null;this.index=null;this.reset();this.state={connected:false,enabled:!!this.enabled(),armed:false,apiBlocked:true};this.message('Browser blocked controller access. Try the HTTPS game or localhost; keyboard and mouse work.');if(lost&&this.enabled())this.disconnect?.();return this.motion;}
  const pad=pads.find(p=>p.index===this.index&&p.mapping==='standard')||pads.find(p=>p.mapping==='standard');
  const enabled=!!this.enabled(),mode=this.context();
  if(!pad){const lost=this.index!==null;this.index=null;this.reset();this.state={connected:false,enabled,armed:false,mapping:pads[0]?.mapping||null};this.message(pads.length?'Controller needs a standard browser mapping. Keyboard and mouse still work.':enabled?'Controller enabled — connect a controller and press a button.':'Controller optional — off.');if(lost&&enabled)this.disconnect?.();return this.motion;}
  const changed=pad.index!==this.index||mode!==this.mode||enabled!==this.state.enabled;
  this.index=pad.index;this.mode=mode;
  const buttons=pad.buttons.map(down),left=stick(pad.axes[0],pad.axes[1]),right=stick(pad.axes[2],pad.axes[3]);
  if(changed)this.reset();
  const neutral=!buttons.some(Boolean)&&!left.x&&!left.y&&!right.x&&!right.y;
  if(!enabled||!this.focused||document.hidden){this.reset();this.previous=buttons;}
  else if(!this.armed){if(neutral)this.armed=true;this.previous=buttons;}
  this.state={connected:true,enabled,armed:this.armed,index:pad.index,mapping:pad.mapping,id:pad.id};
  this.message(enabled?'Controller on · LS move · RS look · X / □ interact · A / × jump · Y / △ exhibitions · Start pause':'Controller connected — optional controls are off.');
  if(!enabled||!this.armed||!this.focused||document.hidden)return this.motion;
  const pressed=i=>buttons[i]&&!this.previous[i];
  const world=mode.startsWith('world:');
  if(world)this.motion={x:left.x,y:left.y,lookX:right.x,lookY:right.y};else this.motion={x:0,y:0,lookX:0,lookY:0};
  // One semantic action per frame. Release after a context change before acting again.
  if(pressed(9))this.action('pause');
  else if(pressed(1))this.action('back');
  else if(world){if(pressed(2))this.action('interact');else if(pressed(0)||pressed(7))this.action('pulse');else if(pressed(3))this.action('exhibitions');else if(pressed(8))this.action('help');}
  else{
   const direction=buttons[12]||left.y<-.55?'up':buttons[13]||left.y>.55?'down':buttons[14]||left.x<-.55?'left':buttons[15]||left.x>.55?'right':'';
   if(direction){this.repeat-=dt;if(direction!==this.direction||this.repeat<=0){this.navigate(direction);this.repeat=direction===this.direction ? .18 : .4;}}else this.repeat=0;
   this.direction=direction;
   if(pressed(0))this.action('confirm');else if(pressed(2))this.action('history');else if(pressed(3))this.action('chapters');
  }
  this.previous=buttons;return this.motion;
 }
 diagnostics(){return{...this.state,mode:this.mode,deadzone:DEADZONE};}
}
