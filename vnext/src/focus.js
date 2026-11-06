// Focus follows the active reading surface; stale/hidden controls never receive it.
export function available(element){
 if(!element?.isConnected||element.disabled||element.closest('[hidden],[inert]')||!element.getClientRects().length||getComputedStyle(element).visibility==='hidden')return false;
 // Chromium may report rectangles for unfocusable content inside closed details.
 // Only that disclosure's own summary (and its contents) remains available.
 for(let parent=element.parentElement;parent;parent=parent.parentElement){
  if(parent.localName==='details'&&!parent.open){const summary=[...parent.children].find(child=>child.localName==='summary');if(!summary?.contains(element))return false;}
 }
 return true;
}
export function controls(root){return [...(root?.querySelectorAll('button,input,a[href],summary,[tabindex="0"]')||[])].filter(available);}
export function restoreFocus(preferred,root,fallback){const target=available(preferred)&&(!root||root.contains(preferred))?preferred:available(fallback)?fallback:controls(root)[0];target?.focus({preventScroll:true});return target;}
export function trapTab(event,root){if(event.code!=='Tab')return false;const items=controls(root);if(!items.length)return false;const index=items.indexOf(document.activeElement);if(event.shiftKey&&index<=0){event.preventDefault();items.at(-1).focus();return true;}if(!event.shiftKey&&(index<0||index===items.length-1)){event.preventDefault();items[0].focus();return true;}return false;}
