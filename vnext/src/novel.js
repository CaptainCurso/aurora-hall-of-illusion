import {saveBrowserState} from './persistence.js?v=0.13.4';
import {restoreFocus} from './focus.js?v=0.13.4';
import {bufferFilm} from './media.js?v=0.13.4';
const STORE='aurora7.encore.v1';
const own=(object,key)=>Object.prototype.hasOwnProperty.call(object,key);
const element=(tag,className,text)=>{const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el;};
const scalar=value=>value===null||['string','number','boolean'].includes(typeof value);

export function validateNovel(story){
 const errors=[];
 if(story?.schema!==1||!Array.isArray(story.chapters)||!story.characters||!story.assets)return ['Expected schema1, chapters, characters and assets.'];
 const ids=new Set();
 for(const chapter of story.chapters){
  if(!chapter.id||ids.has(chapter.id))errors.push('Duplicate/missing chapter ID.');ids.add(chapter.id);
  if(!chapter.nodes?.[chapter.entry])errors.push(chapter.id+': missing entry.');
  for(const [id,node] of Object.entries(chapter.nodes||{})){
   if(typeof node.text!=='string'&&!node.branch)errors.push(chapter.id+'/'+id+': missing text.');
   if(node.speaker&&node.speaker!=='narrator'&&!story.characters[node.speaker])errors.push(id+': unknown speaker.');
   if(node.branch&&!node.next)errors.push(id+': branch requires fallback next.');
   if(node.choices?.length&&node.choices.every(c=>c.when)&&!node.next)errors.push(id+': conditional choices require fallback next.');
   for(const condition of [...(node.branch||[]),...(node.choices||[])].map(c=>c.when).filter(Boolean))if(typeof condition.flag!=='string'||!scalar(condition.equals))errors.push(id+': invalid condition.');
   const targets=[node.next,...(node.choices||[]).map(c=>c.next),...(node.branch||[]).map(c=>c.next)].filter(Boolean);
   for(const target of targets)if(!chapter.nodes[target])errors.push(id+': unknown target '+target);
   for(const actor of node.cast||[]){if(!story.characters[actor.character])errors.push(id+': unknown actor.');if(!story.assets.images?.[actor.expression])errors.push(id+': missing expression mapping '+actor.expression);}
   for(const [field,type] of [['background','images'],['film','videos'],['music','music']])if(node[field]&&!story.assets[type]?.[node[field]])errors.push(id+': missing '+field+' mapping '+node[field]);
   for(const values of [node.set,...(node.choices||[]).map(c=>c.set)].filter(Boolean))for(const [key,value]of Object.entries(values))if(!scalar(value)||key.startsWith('base.'))errors.push(id+': invalid flag '+key);
   if(!node.end&&!node.next&&!node.choices?.length&&!node.branch?.length)errors.push(id+': no continuation/end.');
  }
 }
 for(const chapter of story.chapters)for(const required of chapter.requires||[])if(!ids.has(required))errors.push(chapter.id+': missing prerequisite '+required);
 for(const entries of Object.values(story.assets))for(const value of Object.values(entries||{})){const path=typeof value==='string'?value:value?.file;if(path&&(!path.startsWith('assets/')||path.split('/').includes('..')))errors.push('Unsafe media path.');}
 return errors;
}

export class VisualNovel{
 constructor({director,getSettings,getBase,onOpen,onClose,onPause,onSound,onHistory}){
  Object.assign(this,{director,getSettings,getBase,onOpen,onClose,onPause,onSound,onHistory});
  this.story=null;this.isOpen=false;this.chapter=null;this.node=null;this.revealed=0;this.historyOpen=false;this.video=null;this.errors=[];this.mediaFailures=new Map();this.cues={background:null,cast:[],film:null,music:null,shot:'stage'};
  this.save={schema:1,flags:{},progress:{},completed:[],history:[]};
  try{const old=JSON.parse(localStorage.getItem(STORE));if(old?.schema===1&&old.flags&&old.progress&&Array.isArray(old.completed)&&Array.isArray(old.history))this.save=old;}catch{}
  this.buildUI();
 }
 async load(path='assets/encore/story.json'){
  try{const response=await fetch(path);if(!response.ok)throw Error('Chapter data unavailable.');const data=await response.json(),errors=validateNovel(data);if(errors.length)throw Error(errors.join(' '));this.story=data;return true;}
  catch(error){this.loadError=error.message;return false;}
 }
 persist(){saveBrowserState(STORE,this.save,'Encore progress');}
 buildUI(){
  this.root=element('section','vn');this.root.id='novel';this.root.hidden=true;this.root.setAttribute('role','dialog');this.root.setAttribute('aria-modal','true');this.root.setAttribute('aria-label','The Unscheduled Encore visual novel');
  this.toolbar=element('div','vn-toolbar');const mark=element('div','vn-mark','A7 / THE UNSCHEDULED ENCORE');this.trackLabel=element('small','vn-track','');mark.append(this.trackLabel);this.toolbar.append(mark);
  const button=(text,fn,id)=>{const b=element('button','',text);if(id)b.id=id;b.onclick=fn;this.toolbar.append(b);return b;};
  button('Chapters',()=>this.library());button('History / H',()=>this.toggleHistory(),'vn-history-button');this.soundButton=button('Sound',()=>this.onSound?.(),'vn-sound');button('Pause / Esc',()=>this.onPause?.(),'vn-pause');button('Return to the hall',()=>this.close(),'vn-close');
  this.libraryView=element('div','vn-library');this.stage=element('div','vn-stage');
  this.background=element('img','vn-background');this.background.alt='';this.background.hidden=true;this.illustration=element('img','vn-illustration');this.illustration.alt='';this.illustration.hidden=true;this.cast=element('div','vn-cast');this.filmFrame=element('div','vn-film');this.stage.append(this.background,this.illustration,this.filmFrame,this.cast);
  this.stage.onclick=e=>{if(!e.target.closest('button'))this.advance();};
  this.caption=element('div','vn-caption');this.caption.setAttribute('role','status');
  this.dock=element('div','vn-dock');this.chapterLabel=element('div','vn-chapter-label');this.speaker=element('div','vn-speaker');
  this.text=element('div','vn-text');this.text.setAttribute('aria-hidden','true');this.accessible=element('p','vn-accessible');this.accessible.setAttribute('aria-live','polite');
  this.choices=element('div','vn-choices');this.next=element('button','vn-next','Continue / Enter →');this.next.id='vn-next';this.next.onclick=()=>this.advance();
  this.dock.append(this.chapterLabel,this.speaker,this.text,this.accessible,this.choices,this.next);
  this.backlog=element('section','vn-backlog');this.backlog.hidden=true;this.backlog.setAttribute('aria-label','Conversation history');const closeHistory=element('button','','Close history / H');closeHistory.onclick=()=>this.toggleHistory(false);this.historyList=element('ol','vn-history-list');this.backlog.append(closeHistory,this.historyList);
  this.root.append(this.stage,this.toolbar,this.libraryView,this.caption,this.dock,this.backlog);document.body.append(this.root);this.layoutObserver=new ResizeObserver(()=>this.fitArt());this.layoutObserver.observe(this.dock);this.layoutObserver.observe(this.toolbar);
 }
 open(preferred){
  if(!this.isOpen){this.isOpen=true;this.root.hidden=false;this.returnFocus=document.activeElement;this.onOpen?.();}
  this.library(preferred);
 }
 library(preferred){
  this.toggleHistory(false);this.stopVideo();this.chapter=null;this.node=null;this.nodeId=null;this.root.dataset.mode='library';this.libraryView.replaceChildren();
  this.libraryView.append(element('div','edition','AFTER THE EXHIBITIONS'),element('h2','','The Unscheduled Encore'),element('p','host-margin','I gave them a stage. They developed opinions about the casting. — Aurora–7'));
  this.root.querySelector('#vn-history-button').disabled=!this.save.history.length;
  if(!this.story){this.libraryView.append(element('p','vn-warning',this.loadError||'Chapters are still being assembled.'));return;}
  const cards=element('div','vn-chapter-cards');
  for(const chapter of this.story.chapters){
   const card=element('article','vn-chapter-card');card.dataset.chapter=chapter.id;if(chapter.id===preferred)card.classList.add('preferred');
   const coverId=chapter.id==='coda'?'cg-coda':'cg-'+chapter.id,cover=element('img','vn-cover');cover.src=this.story.assets.images?.[coverId]||this.story.assets.images?.['cg-faces']||'';cover.alt=chapter.title+' / chapter illustration';
   const coverStatus=element('span','vn-cover-status','');cover.onerror=()=>{cover.classList.add('vn-missing');coverStatus.textContent='Chapter illustration unavailable';};const art=element('div','vn-programme-art');art.append(cover,coverStatus);card.append(art);
   const content=element('div','vn-programme-copy');card.append(content);
   const locked=(chapter.requires||[]).filter(id=>!this.save.completed.includes(id)),progress=this.save.progress[chapter.id],completed=this.save.completed.includes(chapter.id);
   const status=locked.length?'Locked':completed&&progress&&!progress.finished?'Replay in progress':completed?'Complete':progress?'In progress':'Not begun';
   content.append(element('small','',chapter.id==='coda'?'Afterpiece · '+status:status),element('h3','',chapter.title),element('p','',chapter.description||''));
   const actions=element('div','vn-programme-actions');content.append(actions);
   const resume=element('button','',progress&&!progress.finished?'Resume scene →':completed?'Resume scene →':'Begin scene →');resume.disabled=!!locked.length;resume.onclick=()=>this.start(chapter.id,false);actions.append(resume);
   if(progress){const replay=element('button','',progress.finished?'Replay from the beginning':'Restart this attempt');replay.onclick=()=>{
    const prompt=element('div','vn-restart-prompt');prompt.setAttribute('role','group');prompt.setAttribute('aria-label','Restart '+chapter.title);
    prompt.append(element('p','','Start “'+chapter.title+'” again? This resets only this chapter’s in-progress attempt. Your last completed choice remains in effect until you finish this replay. If your completed choice changes, the afterpiece starts afresh.'));
    const cancel=element('button','','Keep this attempt'),confirm=element('button','','Start again');cancel.onclick=()=>{prompt.remove();replay.hidden=false;replay.focus();};confirm.onclick=()=>this.start(chapter.id,true);prompt.append(cancel,confirm);replay.hidden=true;content.append(prompt);cancel.focus();
   };actions.append(replay);}
   if(completed&&progress&&!progress.finished)content.append(element('p','vn-replay-help','Your last completed choice remains in effect until you finish this replay. If your completed choice changes, the afterpiece starts afresh.'));
   if(locked.length)content.append(element('p','vn-lock','Finish '+locked.map(id=>this.story.chapters.find(c=>c.id===id)?.title||id).join(', ')+'.'));
   cards.append(card);
  }
  this.libraryView.append(cards);this.director.pause();this.libraryView.scrollTop=0;(cards.querySelector('.preferred button:not(:disabled)')||cards.querySelector('button:not(:disabled)'))?.focus({preventScroll:true});this.fitArt();
 }

 start(id,replay=false){
  const chapter=this.story?.chapters.find(c=>c.id===id);if(!chapter||(chapter.requires||[]).some(key=>!this.save.completed.includes(key)))return;
  this.root.querySelector('#vn-history-button').disabled=false;this.chapter=chapter;this.node=null;this.visualSignature=null;this.root.dataset.mode='scene';this.caption.textContent='';this.cues={background:null,cast:[],film:null,music:null,shot:'stage'};
  if(replay||!this.save.progress[id])this.save.progress[id]={node:chapter.entry,trail:[],draft:{...chapter.defaults},finished:false};
  const checkpoint=this.save.progress[id];checkpoint.draft||={...chapter.defaults};
  // Reconstruct visual cues from the actually visited trail without replaying effects/history.
  for(const nodeId of checkpoint.trail||[]){const node=chapter.nodes[nodeId];if(node)this.mergeCues(node);}
  this.go(chapter.nodes[checkpoint.node]?checkpoint.node:chapter.entry,false);
 }
 value(flag){if(flag.startsWith('base.'))return this.getBase?.()[flag.slice(5)];const draft=this.chapter&&this.save.progress[this.chapter.id]?.draft;return draft&&own(draft,flag)?draft[flag]:this.save.flags[flag];}
 matches(when){return !when||this.value(when.flag)===when.equals;}
 mergeCues(node){for(const key of ['background','cast','film','music','shot'])if(own(node,key))this.cues[key]=node[key];}
 go(id,record=true){
  const checkpoint=this.save.progress[this.chapter.id],newVisit=record||!checkpoint.trail.length,routers=[];
  let node=this.chapter.nodes[id],hops=0;
  while(node?.branch){if(++hops>32){this.caption.textContent='This scene encountered a branch loop. Return to Chapters to restart.';return;}Object.assign(checkpoint.draft,node.set||{});this.mergeCues(node);if(newVisit)routers.push(id);id=(node.branch.find(b=>this.matches(b.when))||{}).next||node.next;node=this.chapter.nodes[id];}
  if(!node){this.caption.textContent='This page is unavailable. Your checkpoint is safe; return to Chapters.';return;}
  checkpoint.node=id;
  if(newVisit)checkpoint.trail.push(...routers,id);
  Object.assign(this.save.progress[this.chapter.id].draft,node.set||{});this.node=node;this.nodeId=id;this.mergeCues(node);this.revealed=0;this.characters=Array.from(node.text||'');
  if(newVisit)this.save.history.push({chapter:this.chapter.id,node:id,speaker:this.story.characters[node.speaker]?.name||'THE HALL',text:node.text||''});
  this.save.history=this.save.history.slice(-500);this.persist();this.renderScene();
 }
 image(id,className,alt=''){
  const img=element('img',className);img.alt=alt;img.dataset.asset=id||'';if(!id){img.hidden=true;return img;}const path=this.story.assets.images?.[id];
  if(path)img.src=path;else this.mediaWarning('Artwork '+id,id);
  img.onerror=()=>{if(!img.isConnected)return;img.classList.add('vn-missing');this.mediaWarning('Artwork '+id,id);};img.onload=()=>{if(!img.isConnected)return;this.mediaFailures.delete(id);this.renderWarnings();};return img;
 }
 mediaWarning(message,id=message){if(!this.errors.includes(message))this.errors.push(message);this.mediaFailures.set(id,message);this.renderWarnings();}
 renderWarnings(){
  if(!this.chapter){this.caption.textContent='';return;}
  const active=[this.cues.background,...(this.cues.cast||[]).map(actor=>actor.expression),this.cues.film,this.cues.music];
  const failed=[...new Set(active.filter(Boolean))].map(id=>this.mediaFailures.get(id)).filter(Boolean);
  this.caption.textContent=failed.length?'UNAVAILABLE: '+failed.join(' · ')+' / Text and choices remain available.':'';
 }
 musicFailure(file){if(this.story?.assets.music?.[this.cues.music]?.file===file)this.mediaWarning('Soundtrack '+this.cues.music,this.cues.music);}
 musicRecovered(file){if(this.story?.assets.music?.[this.cues.music]?.file===file){this.mediaFailures.delete(this.cues.music);this.renderWarnings();}}

 renderScene(){
  this.chapterLabel.textContent=this.chapter.title;this.speaker.textContent=this.story.characters[this.node.speaker]?.name||'THE HALL';this.speaker.style.color=this.story.characters[this.node.speaker]?.color||'#c5cfcd';this.accessible.textContent=this.node.text||'';
  if((this.background.dataset.asset||null)!==this.cues.background||this.background.classList.contains('vn-missing')){
   const bg=this.image(this.cues.background,'vn-background');this.background.replaceWith(bg);this.background=bg;
  }
  if((this.illustration.dataset.asset||null)!==this.cues.background||this.illustration.classList.contains('vn-missing')){const art=this.image(this.cues.background,'vn-illustration',this.chapter.title+' / scene illustration');this.illustration.replaceWith(art);this.illustration=art;}
  const castSignature=JSON.stringify(this.cues.cast||[]);
  this.cast.dataset.count=String((this.cues.cast||[]).length);
  if(this.cast.dataset.signature!==castSignature||this.cast.querySelector('.vn-missing')){
   this.cast.replaceChildren(...(this.cues.cast||[]).map(actor=>{const box=element('div','vn-actor vn-'+(actor.position||'center'));box.dataset.character=actor.character;box.dataset.expression=actor.expression;box.append(this.image(actor.expression,'',this.story.characters[actor.character]?.name+' / '+actor.expression),element('span','vn-actor-name',this.story.characters[actor.character]?.name));return box;}));
   this.cast.dataset.signature=castSignature;
  }
  let support=0,index=0;const hasSpeaker=[...this.cast.children].some(actor=>actor.dataset.character===this.node.speaker);for(const actor of this.cast.children){const speaking=actor.dataset.character===this.node.speaker,featured=speaking||!hasSpeaker&&index===0;actor.classList.toggle('speaking',speaking);actor.classList.toggle('featured',featured);actor.dataset.support=featured?'':String(support++);index++;}
  const visualSignature=JSON.stringify([this.cues.background,this.cues.film,this.cues.shot]);if(this.visualSignature!==visualSignature){this.stage.getAnimations().forEach(animation=>animation.cancel());if(!this.getSettings().reduced)this.stage.animate([{opacity:0},{opacity:1}],{duration:200,easing:'ease-out'});this.visualSignature=visualSignature;}
  this.stage.dataset.shot=this.cues.shot||'stage';this.stage.dataset.background=this.cues.background?'image':'empty';this.updateVideo();
  const music=this.story.assets.music?.[this.cues.music];if(music){if(this.director.track!==music.file||this.director.audio.get(music.file)?.paused)this.director.play(music.file,music.title||this.cues.music);}else{this.director.play(null,'THE UNSCHEDULED ENCORE / SILENCE');this.director.pause();}
  if(this.getSettings().reduced)this.revealed=this.characters.length;this.dock.scrollTop=0;this.renderWarnings();this.renderText();restoreFocus(null,this.root,this.choices.querySelector('button')||this.next);
 }
 stopVideo(){if(this.video){this.video.pause();this.video.removeAttribute('src');this.video.load();this.video.remove();this.video=null;}this.filmFrame.replaceChildren();this.filmFrame.classList.remove('failed');}
 updateVideo(){
  const id=this.cues.film,file=this.story.assets.videos?.[id];
  if(this.video?.dataset.asset===id&&!this.video.dataset.failed)return;
  this.stopVideo();if(!id)return;if(!file){this.mediaWarning('Film '+id,id);return;}
  const video=element('video','');video.dataset.asset=id;video.src=file;video.poster=this.story.assets.images?.[this.cues.background]||'';video.loop=true;video.muted=true;video.playsInline=true;video.preload='auto';video.setAttribute('aria-label','Cultural transmission: '+id);video.onerror=()=>{if(this.video!==video)return;video.dataset.failed='true';this.filmFrame.classList.add('failed');this.mediaWarning('Film '+id,id);};video.addEventListener('loadeddata',()=>{if(this.video!==video)return;this.mediaFailures.delete(id);this.renderWarnings();});bufferFilm(video,()=>this.video===video&&this.isOpen&&!this.paused&&!this.historyOpen&&!this.getSettings().reduced);this.filmFrame.append(video);this.video=video;
  video.auroraPlayback(!this.getSettings().reduced);
 }
 renderText(){
  const focusNext=document.activeElement===this.next,full=this.revealed>=this.characters.length;this.text.textContent=this.characters.slice(0,Math.floor(this.revealed)).join('');this.choices.replaceChildren();
  const choices=(this.node.choices||[]).filter(c=>this.matches(c.when));
  this.next.hidden=full&&choices.length>0;this.next.textContent=!full?'Reveal line / Enter →':this.node.end?'Finish chapter →':'Continue / Enter →';
  if(full)for(const [i,choice]of choices.entries()){const b=element('button','',String(i+1).padStart(2,'0')+' / '+choice.label);b.onclick=()=>this.choose(choice);this.choices.append(b);}
  if(focusNext&&this.next.hidden)restoreFocus(null,this.choices);this.fitArt();
 }
 fitArt(){
  if(!this.isOpen)return;
  const root=this.root.getBoundingClientRect(),top=Math.ceil(this.toolbar.getBoundingClientRect().bottom-root.top+12),bottom=Math.ceil(root.bottom-this.dock.getBoundingClientRect().top+18);
  this.libraryView.style.top=top+'px';this.caption.style.top=top+'px';if(!this.chapter)return;this.stage.style.setProperty('--vn-art-top',top+'px');this.stage.style.setProperty('--vn-art-bottom',bottom+'px');
 }
 advance(){
  if(!this.isOpen||!this.node||this.historyOpen||this.paused)return;
  if(this.revealed<this.characters.length){this.revealed=this.characters.length;this.renderText();return;}
  if((this.node.choices||[]).some(choice=>this.matches(choice.when)))return;
  if(this.node.end){
   const draft=this.save.progress[this.chapter.id].draft;this.save.progress[this.chapter.id].finished=true;
   const changed=Object.entries(draft).some(([key,value])=>this.save.flags[key]!==value);
   Object.assign(this.save.flags,draft);
   if(this.chapter.id!=='coda'&&changed){this.save.completed=this.save.completed.filter(id=>id!=='coda');delete this.save.progress.coda;}
   if(!this.save.completed.includes(this.chapter.id))this.save.completed.push(this.chapter.id);
   this.persist();this.library();return;
  }
  if(this.node.next)this.go(this.node.next);
 }
 choose(choice){if(this.paused||this.historyOpen||this.revealed<this.characters.length)return;Object.assign(this.save.progress[this.chapter.id].draft,choice.set||{});this.save.history.push({chapter:this.chapter.id,speaker:'YOU',text:choice.label});this.go(choice.next);}
 toggleHistory(value=!this.historyOpen){
  if(value&&(!this.isOpen||!this.chapter&&!this.save.history.length))return;
  const changed=this.historyOpen!==value;this.historyOpen=value;this.backlog.hidden=!value;for(const surface of [this.toolbar,this.dock,this.libraryView,this.stage])surface.inert=value;
  if(value){this.historyReturnFocus=document.activeElement;this.historyList.replaceChildren(...this.save.history.map(item=>{const li=element('li','');li.append(element('strong','',item.speaker),element('p','',item.text));return li;}));this.backlog.querySelector('button').focus();this.historyList.lastElementChild?.scrollIntoView({block:'end'});}
  else if(changed)restoreFocus(this.historyReturnFocus,this.root,this.choices.querySelector('button')||this.next);
  if(changed)this.onHistory?.(value);
 }
 handleKey(event){
  if(!this.isOpen)return false;
  if(event.code==='Tab'){
   const scope=this.historyOpen?this.backlog:this.root,items=[...scope.querySelectorAll('button,input')].filter(x=>!x.disabled&&!x.closest('[hidden]')&&x.offsetParent!==null),index=items.indexOf(document.activeElement);
   if(event.shiftKey&&index<=0){items.at(-1)?.focus();return true;}if(!event.shiftKey&&(index<0||index===items.length-1)){items[0]?.focus();return true;}return false;
  }
  if(event.repeat)return ['Space','Enter'].includes(event.code);
  if(event.code==='Escape'){if(this.historyOpen)this.toggleHistory(false);else this.onPause?.();return true;}
  if(this.paused)return false;
  if(event.code==='KeyH'){this.toggleHistory();return true;}if(this.historyOpen)return false;
  if((event.code==='Space'||event.code==='Enter')&&!event.target.closest('button')){this.advance();return true;}
  if(/^Digit[1-9]$/.test(event.code)){this.choices.querySelectorAll('button')[+event.code.slice(-1)-1]?.click();return true;}
  return false;
 }
 update(dt,{paused,reduced,sound}){
  if(!this.isOpen)return;this.paused=paused;this.root.classList.toggle('vn-reduced',reduced);this.soundButton.textContent='Sound '+(sound?'on':'off');this.trackLabel.textContent=this.chapter?this.director.title:'';
  if(this.node&&!paused&&!this.historyOpen&&this.revealed<this.characters.length){this.revealed=reduced?this.characters.length:Math.min(this.characters.length,this.revealed+dt*42);this.renderText();}
  if(this.video){this.video.auroraPlayback(!paused&&!this.historyOpen&&!reduced&&!this.video.dataset.failed);}
 }
 close(){if(!this.isOpen)return;this.persist();this.stopVideo();this.toggleHistory(false);this.isOpen=false;this.root.hidden=true;this.chapter=null;this.node=null;if(this.onClose)this.onClose(this.returnFocus);else restoreFocus(this.returnFocus,null,document.getElementById('world'));}
 diagnostics(){return{open:this.isOpen,chapter:this.chapter?.id,node:this.nodeId,flags:this.save.flags,draft:this.chapter?this.save.progress[this.chapter.id]?.draft:null,completed:this.save.completed,historyCount:this.save.history.length,historyOpen:this.historyOpen,revealed:Math.floor(this.revealed),textLength:this.characters?.length||0,cues:this.cues,errors:this.errors,video:this.video?{src:this.video.currentSrc,time:this.video.currentTime,paused:this.video.paused,ready:this.video.readyState}:null};}
}
