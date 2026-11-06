(function(){
 'use strict';
 const cfg=window.WMigrationConfig;if(!cfg?.enabled)return;
 let oldURL,newURL;try{oldURL=new URL(cfg.oldOrigin);newURL=new URL(cfg.newOrigin);if(oldURL.protocol!=='https:'||newURL.protocol!=='https:'||oldURL.origin===newURL.origin)return}catch{return}
 newURL.pathname=newURL.pathname.replace(/\/?$/,'/');newURL.search='';newURL.hash='';
 const isNew=location.origin===newURL.origin&&location.pathname.startsWith(newURL.pathname),isOld=[oldURL.origin,...(cfg.oldOrigins||[])].includes(location.origin)&&!isNew;if(!isOld&&!isNew)return;
 const logged=()=>typeof user!=='undefined'&&user&&st==='app';
 function download(){
  if(!logged())return toast('Сначала войдите в свой аккаунт.');
  const payload=WMigrationData.collect(localStorage,user.id,location.origin),blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='W-настройки-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
  const status=document.getElementById('migration-status');if(status)status.textContent='Сохраните файл в «Файлы» или «Загрузки». Он понадобится в новой установленной версии.';
 }
 function open(){
  const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  modal(`<h2>${isOld?'Переходим в новый W':'Добро пожаловать в новый W'}</h2><p class="mut">Песни, программы, общалка и личные тексты остаются в нашей общей базе. Используйте прежний аккаунт для входа.</p><ol class="migration-steps"><li><b>Сохраните личные настройки</b><p>В старом приложении сохраните файл. В нём — ваша транспозиция, вид песен, шрифты и команды. Паролей и ключей входа в нём нет.</p><button class="b g" id="migration-export">Сохранить настройки этого W</button></li><li><b>Установите новую версию</b><p>${ios?'Откройте новый адрес в Safari → «Поделиться» → «На экран Домой». Затем запустите W с новой иконки.':'Откройте новый адрес в Chrome → меню → «Установить приложение» или «Добавить на главный экран». Затем откройте новую иконку.'}</p><a class="b" href="${newURL.href}?migration=1" target="_blank" rel="noopener">Открыть новый W ↗</a></li><li><b>Войдите и загрузите настройки</b><p>Уже в новой установленной версии войдите в прежний аккаунт и выберите сохранённый JSON-файл. Текущие настройки из файла будут заменены после вашего подтверждения.</p>${isNew?'<label class="b g migration-file">Выбрать файл настроек<input id="migration-file" type="file" accept="application/json,.json"></label>':`<a class="b g" href="${newURL.href}?migration=1" target="_blank" rel="noopener">Перейти к переносу ↗</a>`}</li><li><b>Проверьте песни и уведомления</b><p>Откройте песню, проверьте тональность и включите уведомления на новой иконке. Только после этого удалите старую иконку вручную через меню телефона.</p></li></ol><p id="migration-status" role="status"></p><div class="row"><button class="b g" id="migration-close">Пока остаться здесь</button>${isNew?'<button class="b" id="migration-push">Уведомления</button>':''}</div>`);
  document.getElementById('migration-export').onclick=download;document.getElementById('migration-close').onclick=()=>modal('');
  const push=document.getElementById('migration-push');if(push)push.onclick=()=>{if(logged())pushSettings();else toast('Войдите в свой аккаунт, затем включите уведомления.')};
  const input=document.getElementById('migration-file');if(input)input.onchange=async()=>{
   const status=document.getElementById('migration-status');try{
    if(!logged())throw new Error('Сначала войдите в прежний аккаунт и снова откройте перенос.');
    const file=input.files?.[0];if(!file)return;if(file.size>1000000)throw new Error('Файл больше 1 МБ. Выберите файл настроек W.');
    const payload=JSON.parse(await file.text()),entries=WMigrationData.validate(payload,user.id);
    if(!entries.length)throw new Error('В файле нет настроек для переноса.');
    status.textContent='Готово к переносу: '+entries.length+' настроек. Песни и сообщения не будут изменены.';
    let confirm=document.getElementById('migration-confirm');if(confirm)confirm.remove();confirm=document.createElement('button');confirm.id='migration-confirm';confirm.className='b';confirm.textContent='Применить настройки и перезагрузить';status.after(confirm);
    const owner=user.id;confirm.onclick=()=>{try{if(!logged()||user.id!==owner)throw new Error('Аккаунт изменился. Откройте перенос заново.');WMigrationData.apply(localStorage,payload,owner);if(entries.some(([key])=>key==='w_font'))localStorage.setItem('w_migration_font_pending_'+owner,'1');location.reload()}catch(e){status.textContent=e.message}};
   }catch(e){const confirm=document.getElementById('migration-confirm');if(confirm)confirm.remove();status.textContent=e instanceof SyntaxError?'Не удалось прочитать JSON-файл настроек.':e.message}
  };
 }
 window.openMigration=open;
 const timer=setInterval(()=>{
  if(typeof st==='undefined'||st==='load'||document.getElementById('splash')||!document.getElementById('app'))return;clearInterval(timer);
  if(isNew){const install=document.getElementById('inst');if(install)install.onclick=open;}
  if(isNew&&logged()&&localStorage.getItem('w_migration_completed_'+user.id))return;
  const banner=document.createElement('aside');banner.className='migration-banner';banner.setAttribute('aria-label','Перенос приложения');
  const title=document.createElement('strong');title.textContent=isOld?'Новая версия W готова':'Установите новый W';const p=document.createElement('p');p.textContent=isOld?'Перенесите личные настройки и установите приложение по новому адресу. Этот W продолжает работать.':'Войдите в прежний аккаунт. После установки перенесите настройки со старой иконки.';
  const button=document.createElement('button');button.className='b';button.textContent=isOld?'Перейти с настройками':'Установка и перенос';button.onclick=open;banner.append(title,p,button);document.getElementById('app').before(banner);
  if(new URL(location.href).searchParams.get('migration')==='1')open();
 },500);
})();
