/* Loaded in the same page as the existing authenticated Supabase client. */
let pushServerConfig=null,pushBusy=false;
const pushOwnerKey=()=>API+':'+(user?.id||'');
const pushEnabledHere=()=>LS.g('w_push_owner','')===pushOwnerKey();
function pushPublicKey(value){const padded=value+'='.repeat((4-value.length%4)%4);return Uint8Array.from(atob(padded.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0))}
async function pushCall(action,data){const response=await sbFetch('/functions/v1/w-push?action='+action,{method:data?'POST':'GET',headers:data?JH:{},body:data?JSON.stringify(data):undefined});if(!response.ok)throw new Error(response.status===404?'Сервер push ещё не подключён.':response.status===503?'Сервер push ещё не настроен.':'Не удалось подключить уведомления. Попробуйте позже.');return response.json()}
window.pushSettings=async()=>{
 if(!user)return;
 const supported='serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window&&isSecureContext;
 const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
 const installed=matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
 modal(`<h2>Push-уведомления</h2><div class="push-settings"><div class="mut">Сообщения группы, новые песни и программы — даже когда приложение закрыто.</div><div id="push-status" role="status">Проверяем подключение…</div><div id="push-actions"></div><div class="mut">${ios&&!installed?'На iPhone сначала выберите в Safari «Поделиться → На экран Домой», затем откройте W с иконки.':''}</div></div>`);
 const status=document.getElementById('push-status');if(!supported){status.textContent=ios&&!installed?'Добавьте приложение на экран «Домой», чтобы включить push.':'Этот браузер не поддерживает push-уведомления.';return}
 if(ios&&!installed){status.textContent='Для push откройте установленное приложение с домашнего экрана.';return}
 try{
  pushServerConfig=await pushCall('config');const reg=await navigator.serviceWorker.ready,subscription=await reg.pushManager.getSubscription();
  const mine=!!subscription&&pushEnabledHere();status.textContent=mine?'Уведомления включены на этом устройстве.':'Уведомления выключены на этом устройстве.';
  if(Notification.permission==='denied')status.textContent='Уведомления запрещены. Разрешите их в настройках браузера или приложения.';
  const actions=document.getElementById('push-actions');if(!actions)return;
  actions.innerHTML=mine?'<button class="b g" id="push-disable">Выключить на этом устройстве</button>':'<button class="b" id="push-enable">Включить уведомления</button>';
  if(mine)document.getElementById('push-disable').onclick=disablePush;else{const button=document.getElementById('push-enable');button.disabled=Notification.permission==='denied';button.onclick=enablePush}
 }catch(e){if(status.isConnected)status.textContent=e.message}
};
window.enablePush=async()=>{
 if(pushBusy||!pushServerConfig||!user)return;pushBusy=true;
 // The OS permission request starts directly inside the user's click (required on iOS).
 const permissionPromise=Notification.permission==='granted'?Promise.resolve('granted'):Notification.requestPermission();
 try{if(await permissionPromise!=='granted')throw new Error('Разрешение на уведомления не получено.');
  const reg=await navigator.serviceWorker.ready;let subscription=await reg.pushManager.getSubscription();
  if(!subscription)subscription=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:pushPublicKey(pushServerConfig.publicKey)});
  await pushCall('subscribe',{subscription:subscription.toJSON()});LS.s('w_push_owner',pushOwnerKey());await pushSettings();
 }catch(e){const status=document.getElementById('push-status');if(status)status.textContent=e.message;else toast(e.message)}finally{pushBusy=false}
};
window.disablePush=async()=>{
 if(pushBusy)return;pushBusy=true;
 try{const reg=await navigator.serviceWorker.ready,subscription=await reg.pushManager.getSubscription();
  if(subscription){await pushCall('unsubscribe',{endpoint:subscription.endpoint});await subscription.unsubscribe()}
  LS.s('w_push_owner','');await pushSettings();
 }catch(e){toast(e.message)}finally{pushBusy=false}
};
async function releasePushAccount(){
 if(!pushEnabledHere()||!('serviceWorker' in navigator))return;
 const reg=await navigator.serviceWorker.getRegistration(),subscription=reg&&await reg.pushManager.getSubscription();
 if(subscription){await pushCall('unsubscribe',{endpoint:subscription.endpoint});await subscription.unsubscribe()}LS.s('w_push_owner','');
}
navigator.serviceWorker?.addEventListener('message',event=>{if(event.data?.type==='W_PUSH')kick()});
function maybeOfferPush(){
 if(st!=='app'||!user||pushEnabledHere()||document.getElementById('push-invite'))return;
 const last=LS.g('w_push_invite_later_'+user.id,0);if(Date.now()-last<7*86400000)return;
 const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
 const supported='Notification' in window&&'PushManager' in window&&'serviceWorker' in navigator;
 if(!supported&&!ios)return;
 const invite=document.createElement('aside');invite.id='push-invite';invite.className='push-invite';invite.setAttribute('aria-label','Предложение включить уведомления');
 invite.innerHTML='<div><strong>Будем на связи</strong><p>Включите уведомления о сообщениях группы и служениях.</p></div><div class="row"><button class="b" id="push-invite-enable">Включить</button><button class="b g" id="push-invite-later">Позже</button></div>';
 document.getElementById('app').before(invite);
 document.getElementById('push-invite-enable').onclick=()=>{invite.remove();pushSettings()};
 document.getElementById('push-invite-later').onclick=()=>{LS.s('w_push_invite_later_'+user.id,Date.now());invite.remove()};
}
// Wait for authentication and the welcome screen; no OS prompt occurs without a click.
const pushInvitationTimer=setInterval(()=>{if(st==='app'&&user&&!document.getElementById('splash')){clearInterval(pushInvitationTimer);maybeOfferPush()}},1000);
