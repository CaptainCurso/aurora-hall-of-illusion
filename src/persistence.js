// Keep native browser stores independent; report only writes that actually failed.
const failures=new Map();
let notice;
export function saveBrowserState(key,value,label){
 try{localStorage.setItem(key,JSON.stringify(value));failures.delete(key);if(!failures.size&&notice)notice.hidden=true;return true;}
 catch{
  if(failures.has(key))return false;
  failures.set(key,label);
  if(!notice){notice=document.createElement('aside');notice.id='save-notice';const message=document.createElement('p');message.setAttribute('role','status');message.setAttribute('aria-live','polite');const close=document.createElement('button');close.textContent='Dismiss';close.onclick=()=>notice.hidden=true;notice.append(message,close);document.body.append(notice);}
  notice.querySelector('p').textContent='This browser could not save your '+[...failures.values()].join(' or ')+'. You can keep playing, but this session may be lost when you close or reload the page.';
  notice.hidden=false;return false;
 }
}
