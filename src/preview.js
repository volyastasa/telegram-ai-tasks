'use strict';

(() => {
  if (document.body.classList.contains('desktop')) return;
  const $ = id => document.getElementById(id), app = window.FollowUpPrototype, i18n = window.TasksI18n;
  if (!app) return;
  const t = i18n.t;
  const mobileDevice = navigator.userAgentData?.mobile === true || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  document.documentElement.classList.toggle('mobile-device',mobileDevice);
  const steps = [
    {target:null,title:'Задачи - от слов к делу',text:'Позволяет автоматически создавать задачи из чатов. Договорённости, исполнитель, сроки и связанная переписка — в одном месте.'},
    {target:3,title:'Анализировать задачи',text:'Вы сами выбираете, какие чаты анализировать в задачи. Откройте меню нужного чата и нажмите «Анализировать задачи».'},
    {target:0,title:'Задачи рядом с чатами',text:'Новая вкладка собирает задачи из всех чатов.'},
    {target:1,title:'Все задачи в одном списке',text:'Выберите задачу, откроется её исполнитель, срок, статус и переписка.'},
    {target:2,title:'Вся переписка в задаче',text:'Не надо листать весь чат/группу с исполнителем, в задаче собрано только то, что относится к этой задаче'},
    {target:4,title:'Создать задачу',text:'Вы можете создать новую задачу из любого сообщения вручную.'},
    {target:5,title:'Вернуться к задаче',text:'Отметка «Задача создана» связывает сообщение с карточкой и всей перепиской по задаче. Можно открыть её одним нажатием.'},
    {target:6,title:'Поделиться',text:'Нажмите «Поделиться» в карточке задачи. Исполнитель из исходного чата уже выбран получателем. Перед отправкой можно выбрать другого участника и добавить сообщение.'},
  ];
  let mode, active = false, step = 0, revision = 0, layoutFrame = 0, currentTarget = null;
  let pendingStartup = true, contextualEntry = null;
  const modeKey = 'followup.preview.device';
  const readPreference = key => { try { return localStorage.getItem(key); } catch { return null; } };
  const writePreference = (key,value) => { try { localStorage.setItem(key,value); } catch { /* The prototype also works with unavailable storage. */ } };
  const clamp = (value,min,max) => Math.max(min,Math.min(value,Math.max(min,max)));
  const frame = () => new Promise(resolve => requestAnimationFrame(resolve));
  function fitDevice() {
    const stage = $('preview-stage'), slot = $('device-slot');
    const width = mode === 'phone' ? 414 : 1140, height = mode === 'phone' ? 868 : 810;
    const availableWidth = stage.clientWidth || Math.max(200,innerWidth-48);
    const availableHeight = stage.clientHeight || Math.max(240,innerHeight-112);
    const scale = Math.min(1,availableWidth/width,availableHeight/height);
    slot.style.setProperty('--device-width',`${width}px`); slot.style.setProperty('--device-height',`${height}px`);
    slot.style.setProperty('--device-scale',String(Math.max(.15,scale)));
    const screen = $('device-screen').getBoundingClientRect();
    document.body.style.setProperty('--phone-screen-width',`${screen.width}px`);
    document.body.style.setProperty('--phone-screen-height',`${screen.height}px`);
    document.body.style.setProperty('--phone-screen-left',`${screen.left}px`);
    document.body.style.setProperty('--phone-screen-top',`${screen.top}px`);
  }
  function setMode(next, {persist = true} = {}) {
    if (!['phone','desktop'].includes(next)) return;
    mode = next;
    document.body.classList.toggle('preview-phone',mode === 'phone');
    document.body.classList.toggle('preview-desktop',mode === 'desktop');
    $('preview-phone').setAttribute('aria-pressed',String(mode === 'phone'));
    $('preview-desktop').setAttribute('aria-pressed',String(mode === 'desktop'));
    app.setDeviceMode(mode); if (persist) writePreference(modeKey,mode);
    fitDevice(); if (active) renderStep();
  }
  function targetRect(element) {
    if (!element?.isConnected || element.closest('[hidden]')) return null;
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 ? rect : null;
  }
  function clearTourTarget() {
    currentTarget = null;
    $('tour-spotlight').hidden = true;
    // SVG does not reflect the HTML hidden property; use an attribute and clear its path.
    $('tour-arrow').setAttribute('hidden','');
    $('tour-arrow-path').removeAttribute('d');
  }
  function placeTour() {
    if (!active) return;
    const card = $('tour-card'), spotlight = $('tour-spotlight');
    const margin = 16, cardWidth = Math.min(innerWidth <= 640 ? 310 : 330,innerWidth-32);
    card.style.width = `${cardWidth}px`;
    const cardHeight = card.getBoundingClientRect().height || 260;
    let target = targetRect(currentTarget);
    if (!target) { clearTourTarget(); card.style.left = `${(innerWidth-cardWidth)/2}px`; card.style.top = `${Math.max(80,(innerHeight-cardHeight)/2)}px`; return; }
    spotlight.hidden = false; $('tour-arrow').removeAttribute('hidden');
    let x, y;
    const gap = 38, right = innerWidth-target.right, left = target.left;
    if (innerWidth >= 950 && right >= cardWidth+gap+margin) {
      x = target.right+gap; y = clamp(target.top-25,90,innerHeight-cardHeight-margin);
    } else if (innerWidth >= 950 && left >= cardWidth+gap+margin) {
      x = target.left-cardWidth-gap; y = clamp(target.top-25,90,innerHeight-cardHeight-margin);
    } else {
      x = clamp((innerWidth-cardWidth)/2,margin,innerWidth-cardWidth-margin);
      y = innerHeight-cardHeight-margin;
      const menu = currentTarget.closest('#context-menu');
      if (menu && target.bottom > y-24) {
        const menuHeight = menu.getBoundingClientRect().height, phone = $('device-screen').getBoundingClientRect();
        menu.style.top = `${Math.max(78,mode === 'phone' ? phone.top+45 : 78,Math.min(target.top,y-menuHeight-26))}px`;
        target = targetRect(currentTarget) || target;
      } else if (target.bottom > y-24) {
        const scroll = currentTarget.closest('#messages,#task-detail,.chats-scroll');
        if (scroll) { scroll.scrollTop += target.bottom-(y-28); target = targetRect(currentTarget) || target; }
      }
      if (target.bottom > y-8 && target.top-cardHeight-gap >= 80) y = target.top-cardHeight-gap;
    }
    card.style.left = `${Math.round(x)}px`; card.style.top = `${Math.round(clamp(y,76,innerHeight-cardHeight-margin))}px`;
    const inset = 6;
    spotlight.style.left = `${Math.max(2,target.left-inset)}px`; spotlight.style.top = `${Math.max(2,target.top-inset)}px`;
    spotlight.style.width = `${target.width+inset*2}px`; spotlight.style.height = `${target.height+inset*2}px`;
    const cardRect = card.getBoundingClientRect();
    const targetX = target.left+target.width/2, targetY = target.top+target.height/2;
    let fromX = cardRect.left+cardRect.width/2, fromY = cardRect.top;
    let toX = targetX, toY = target.bottom+11;
    if (cardRect.left > target.right) { fromX = cardRect.left-5; fromY = cardRect.top+48; toX = target.right+11; toY = targetY; }
    else if (cardRect.right < target.left) { fromX = cardRect.right+5; fromY = cardRect.top+48; toX = target.left-11; toY = targetY; }
    else if (cardRect.bottom < target.top) { fromY = cardRect.bottom+4; toY = target.top-11; }
    $('tour-arrow-path').setAttribute('d',`M ${fromX} ${fromY} L ${toX} ${toY}`);
  }
  async function renderStep() {
    const token = ++revision;
    clearTourTarget();
    const detail = steps[step];
    $('tour-title').textContent = t(detail.title); $('tour-description').textContent = t(detail.text);
    $('tour-step').textContent = `${step+1} ${i18n.language === 'en' ? 'of' : 'из'} ${steps.length}`;
    $('tour-back').textContent = t('Назад');
    document.querySelector('.tour-eyebrow').textContent = t('Задачи');
    $('tour-back').hidden = step === 0;
    $('tour-back').disabled = step === 0; $('tour-next').textContent = t(step === steps.length-1 ? 'Еще раз' : 'Далее');
    $('tour-next').classList.toggle('tour-replay',step === steps.length-1);
    $('tour-progress').innerHTML = steps.map((_,index) => `<span${index === step ? ' class="active"' : ''}></span>`).join('');
    $('tour-card').setAttribute('aria-busy','true');
    let element = null;
    if (detail.target === null) app.closeMenus();
    else element = await app.prepareTourStep(detail.target,() => active && token === revision,contextualEntry?.step === step ? contextualEntry.context : null);
    if (!active || token !== revision) return;
    currentTarget = element;
    await frame(); if (!active || token !== revision) return;
    placeTour(); $('tour-card').setAttribute('aria-busy','false'); $('tour-card').focus({preventScroll:true});
  }
  function startTour({fromStart = false} = {}) {
    if (active && !fromStart) { renderStep(); return; }
    const entry = fromStart || pendingStartup ? null : app.getTourEntry();
    pendingStartup = false;
    const matchingStep = entry ? steps.findIndex(detail => detail.target === entry.target) : -1;
    step = matchingStep > 0 ? matchingStep : 0;
    contextualEntry = step > 0 ? {step,context:entry.context} : null;
    if (step === 0) app.resetTourStart();
    active = true; $('feature-tour').hidden = false; $('start-tour').setAttribute('aria-expanded','true');
    renderStep();
  }
  function closeTour() {
    if (!active) return;
    active = false; revision++; contextualEntry = null; clearTourTarget(); $('feature-tour').hidden = true;
    $('start-tour').setAttribute('aria-expanded','false'); app.closeMenus();
    $('start-tour').focus({preventScroll:true});
  }
  $('preview-phone').addEventListener('click',event => { event.stopPropagation(); setMode('phone'); });
  $('preview-desktop').addEventListener('click',event => { event.stopPropagation(); setMode('desktop'); });
  $('start-tour').setAttribute('aria-controls','feature-tour'); $('start-tour').setAttribute('aria-expanded','false');
  $('start-tour').addEventListener('click',event => { event.stopPropagation(); startTour(); });
  function updateLanguageControls() {
    $('language-en').setAttribute('aria-pressed',String(i18n.language === 'en'));
    $('language-ru').setAttribute('aria-pressed',String(i18n.language === 'ru'));
  }
  for (const button of document.querySelectorAll('[data-language]')) button.addEventListener('click',event => { event.stopPropagation(); i18n.setLanguage(button.dataset.language); });
  updateLanguageControls();
  $('feature-tour').addEventListener('click',event => event.stopPropagation());
  $('tour-next').addEventListener('click',() => { if (step === steps.length-1) startTour({fromStart:true}); else { step++; renderStep(); } });
  $('tour-back').addEventListener('click',() => { if (step > 0) { step--; renderStep(); } });
  $('tour-close').addEventListener('click',closeTour);
  window.addEventListener('keydown',event => {
    if (!active) return;
    if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); closeTour(); return; }
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault(); event.stopImmediatePropagation();
      if (event.key === 'ArrowRight') $('tour-next').click(); else $('tour-back').click(); return;
    }
    if (event.key === 'Tab') {
      const buttons = [$('preview-phone'),$('preview-desktop'),$('language-en'),$('language-ru'),$('tour-close'),$('tour-back'),$('tour-next')].filter(button => !button.disabled && !button.hidden);
      const index = buttons.indexOf(document.activeElement), next = event.shiftKey ? (index < 0 ? buttons.length-1 : (index-1+buttons.length)%buttons.length) : (index+1)%buttons.length;
      event.preventDefault(); event.stopImmediatePropagation(); buttons[next].focus({preventScroll:true});
    }
  },true);
  const scheduleLayout = () => {
    cancelAnimationFrame(layoutFrame);
    layoutFrame = requestAnimationFrame(() => { fitDevice(); if (active) renderStep(); });
  };
  window.addEventListener('resize',scheduleLayout);
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(scheduleLayout).observe($('preview-stage'));
  const storedMode = readPreference(modeKey);
  let clockTimer;
  function clockFormatter() {
    try { return new Intl.DateTimeFormat(i18n.locale,{hour:'numeric',minute:'2-digit',hourCycle:'h23'}); }
    catch { return new Intl.DateTimeFormat(i18n.locale,{hour:'numeric',minute:'2-digit',hour12:false,timeZone:'Europe/Moscow'}); }
  }
  function updatePhoneClock() {
    clearTimeout(clockTimer);
    const now = new Date();
    $('phone-clock').textContent = clockFormatter().format(now);
    $('phone-clock').dateTime = now.toISOString();
    clockTimer = setTimeout(updatePhoneClock,60000-now.getSeconds()*1000-now.getMilliseconds());
  }
  updatePhoneClock();
  document.addEventListener('visibilitychange',() => { if (!document.hidden) updatePhoneClock(); });
  window.addEventListener('pageshow',updatePhoneClock);
  i18n.onChange(() => { updateLanguageControls(); updatePhoneClock(); fitDevice(); if (active) renderStep(); });
  // Keep the presentation scale controlled by the selected device and stage.
  window.addEventListener('wheel',event => { if (event.ctrlKey) event.preventDefault(); },{passive:false});
  for (const type of ['gesturestart','gesturechange','gestureend']) window.addEventListener(type,event => event.preventDefault(),{passive:false});
  for (const type of ['touchstart','touchmove']) window.addEventListener(type,event => { if (event.touches.length > 1) event.preventDefault(); },{passive:false});
  window.addEventListener('keydown',event => {
    if ((event.ctrlKey || event.metaKey) && (['+','=','-','_','0'].includes(event.key) || ['NumpadAdd','NumpadSubtract'].includes(event.code))) {
      event.preventDefault(); event.stopImmediatePropagation();
    }
  },true);
  setMode(storedMode === 'phone' || storedMode === 'desktop' ? storedMode : innerWidth < 720 ? 'phone' : 'desktop',{persist:false});
  requestAnimationFrame(() => { if (pendingStartup) startTour({fromStart:true}); });
})();
