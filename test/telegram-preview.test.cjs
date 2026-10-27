'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM, VirtualConsole } = require('jsdom');

const prototypeDirectory = path.resolve(__dirname, '../src');
const read = name => fs.readFileSync(path.join(prototypeDirectory, name), 'utf8');
const seenKey = 'followup.feature-tour.v1';
const modeKey = 'followup.preview.device';

function preview(t, { width = 1280, height = 1000, seen = true, savedMode, stageWidth = 1100, stageHeight = 850, clock, device = {} } = {}) {
  const errors = [], scrolls = [], focusLog = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => errors.push(error));
  // Scripts are evaluated locally; the harness never fetches assets or services.
  const dom = new JSDOM(read('index.html'), {
    url: 'https://followup.example.test/', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole,
  });
  const { window } = dom, { document } = window;
  for (const [name, value] of Object.entries(device)) Object.defineProperty(window.navigator, name, { value, configurable: true });
  if (clock) {
    const NativeDate = window.Date;
    window.Date = class extends NativeDate {
      constructor(...args) { super(...(args.length ? args : [clock.now])); }
      static now() { return clock.now; }
    };
  }
  Object.defineProperties(window, {
    innerWidth: { value: width, configurable: true },
    innerHeight: { value: height, configurable: true },
  });
  const dimensions = { width: stageWidth, height: stageHeight };
  Object.defineProperties(document.getElementById('preview-stage'), {
    clientWidth: { get: () => dimensions.width }, clientHeight: { get: () => dimensions.height },
  });
  window.requestAnimationFrame = callback => window.setTimeout(() => callback(window.performance.now()), 0);
  window.cancelAnimationFrame = timer => window.clearTimeout(timer);
  const rect = (left, top, rectWidth, rectHeight) => ({ left, top, width: rectWidth, height: rectHeight, right: left + rectWidth, bottom: top + rectHeight, x: left, y: top, toJSON() {} });
  window.Element.prototype.getBoundingClientRect = function () {
    if (this.id === 'device-screen') return rect(430, 100, 390, 780);
    if (this.id === 'context-menu') return rect(parseFloat(this.style.left) || 0, parseFloat(this.style.top) || 0, 260, 180);
    if (this.id === 'tour-card') return rect(parseFloat(this.style.left) || 0, parseFloat(this.style.top) || 0, parseFloat(this.style.width) || 330, 250);
    if (this.closest('#context-menu')) {
      const menu = document.getElementById('context-menu').getBoundingClientRect();
      return rect(menu.left + 6, menu.top + 6, 248, 40);
    }
    return rect(450, 260, 240, 44);
  };
  window.Element.prototype.scrollIntoView = function (options) { scrolls.push({ element: this, options }); };
  const nativeFocus = window.HTMLElement.prototype.focus;
  window.HTMLElement.prototype.focus = function (options) { focusLog.push(this); return nativeFocus.call(this, options); };
  window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  window.HTMLDialogElement.prototype.close = function () { this.open = false; this.dispatchEvent(new window.Event('close')); };
  if (seen) window.localStorage.setItem(seenKey, 'seen');
  if (savedMode) window.localStorage.setItem(modeKey, savedMode);
  window.localStorage.setItem('tasks.language', 'ru');
  for (const name of ['i18n.js', 'demo-data.js', 'demo-i18n.js', 'interface-i18n.js', 'prototype.js', 'preview.js']) window.eval(read(name));
  t.after(() => { window.close(); assert.deepEqual(errors, [], 'preview executes without uncaught browser errors'); });
  const $ = selector => { const element = document.querySelector(selector); assert(element, `Missing preview element: ${selector}`); return element; };
  const all = selector => [...document.querySelectorAll(selector)];
  const click = selector => $(selector).click();
  const event = (selector, type, options = {}) => $(selector).dispatchEvent(new window.Event(type, { bubbles: true, cancelable: true, ...options }));
  const input = (selector, value, type = 'input') => { $(selector).value = value; event(selector, type); };
  const key = (value, options = {}) => { const event = new window.KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true, ...options }); document.activeElement.dispatchEvent(event); return event; };
  const frames = async (count = 6) => { for (let index = 0; index < count; index++) await new Promise(resolve => window.requestAnimationFrame(resolve)); };
  const state = () => ({ ...window.FollowUpPrototype.getState() });
  return { window, document, $, all, click, input, event, key, frames, state, scrolls, focusLog, dimensions, rect };
}

test('Phone and Desktop change device presentation while keeping the same app, task edits and conversation drafts', async t => {
  const page = preview(t), shell = page.$('.telegram-window');
  assert(page.document.body.classList.contains('preview-desktop'));
  assert.equal(page.$('#preview-desktop').getAttribute('aria-pressed'), 'true');
  assert.equal(page.$('#device-slot').style.getPropertyValue('--device-width'), '1140px');
  assert.equal(page.$('#device-slot').style.getPropertyValue('--device-height'), '810px');
  page.input('#message-input', 'Черновик команды');
  page.click('[data-folder="tasks"]');
  page.click('[data-task="task-header"]');
  page.input('#task-comment', 'Сохранить этот комментарий', 'focusout');
  page.input('#task-assignee', 'Вы', 'change');
  const initialState = page.state(), initialCount = page.$('#task-count').textContent;
  page.click('#preview-phone');
  assert.equal(page.$('.telegram-window'), shell, 'the live app is not replaced with a separate mobile copy');
  assert(page.document.body.classList.contains('preview-phone'));
  assert(!page.document.body.classList.contains('preview-desktop'));
  assert.equal(page.$('#preview-phone').getAttribute('aria-pressed'), 'true');
  assert.equal(page.$('#preview-desktop').getAttribute('aria-pressed'), 'false');
  assert.equal(page.$('#device-slot').style.getPropertyValue('--device-width'), '414px');
  assert.equal(page.$('#device-slot').style.getPropertyValue('--device-height'), '868px');
  assert.deepEqual(page.state(), initialState);
  assert.equal(page.$('#task-comment').value, 'Сохранить этот комментарий');
  assert.equal(page.$('#task-assignee').value, 'Вы');
  assert.equal(page.window.localStorage.getItem(modeKey), 'phone');
  page.click('#preview-desktop');
  assert.deepEqual(page.state(), initialState);
  assert.equal(page.$('#task-count').textContent, initialCount);
  page.click('[data-folder="all"]');
  assert.equal(page.$('#message-input').value, 'Черновик команды');
  page.click('[data-chat="design"]');
  page.input('#message-input', 'Черновик дизайна');
  page.click('#preview-phone');
  page.click('#preview-desktop');
  assert.equal(page.state().chatId, 'design');
  assert.equal(page.$('#message-input').value, 'Черновик дизайна');
  page.click('[data-chat="project"]');
  assert.equal(page.$('#message-input').value, 'Черновик команды');
  await page.frames();
  assert.equal(page.document.querySelector('iframe'), null);
});

test('Device preferences select the initial view and fit the selected device to the remaining stage', async t => {
  const narrow = preview(t, { width: 390, height: 844, stageWidth: 366, stageHeight: 730 });
  assert(narrow.document.body.classList.contains('preview-phone'));
  assert.equal(narrow.$('#preview-phone').getAttribute('aria-pressed'), 'true');
  const slot = narrow.$('#device-slot');
  assert.equal(Number(slot.style.getPropertyValue('--device-scale')), Math.min(1, 366 / 414, 730 / 868));
  narrow.dimensions.width = 300; narrow.dimensions.height = 600;
  narrow.window.dispatchEvent(new narrow.window.Event('resize'));
  await narrow.frames();
  assert.equal(Number(slot.style.getPropertyValue('--device-scale')), Math.min(1, 300 / 414, 600 / 868));
  assert.equal(narrow.document.body.style.getPropertyValue('--phone-screen-left'), '430px');
  assert.equal(narrow.document.body.style.getPropertyValue('--phone-screen-height'), '780px');
  const preferred = preview(t, { width: 390, savedMode: 'desktop' });
  assert(preferred.document.body.classList.contains('preview-desktop'), 'an explicit saved choice wins over browser width');
  const phone = preview(t, { savedMode: 'phone' });
  assert(phone.document.body.classList.contains('preview-phone'));
});

test('The page identifies actual mobile devices independently of Phone or Desktop preview and viewport width', async t => {
  const macDesktopAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15';
  const cases = [
    { name: 'narrow desktop in Phone preview', width: 390, savedMode: 'phone', mobile: false, device: { userAgent: macDesktopAgent, platform: 'MacIntel', maxTouchPoints: 0, userAgentData: { mobile: false } } },
    { name: 'iPhone in wide Desktop preview', width: 1440, savedMode: 'desktop', mobile: true, device: { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1', platform: 'iPhone', maxTouchPoints: 5 } },
    { name: 'Android mobile client hint', width: 1280, savedMode: 'desktop', mobile: true, device: { userAgent: 'Mozilla/5.0 AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36', platform: 'Linux aarch64', maxTouchPoints: 5, userAgentData: { mobile: true } } },
    { name: 'iPad with desktop user agent', width: 1280, savedMode: 'desktop', mobile: true, device: { userAgent: macDesktopAgent, platform: 'MacIntel', maxTouchPoints: 5, userAgentData: { mobile: false } } },
    { name: 'Windows touch laptop', width: 390, savedMode: 'phone', mobile: false, device: { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36', platform: 'Win32', maxTouchPoints: 10, userAgentData: { mobile: false } } },
  ];
  for (const deviceCase of cases) {
    const page = preview(t, deviceCase);
    const assertDevice = () => assert.equal(page.document.documentElement.classList.contains('mobile-device'), deviceCase.mobile, deviceCase.name);
    assertDevice();
    page.click('#preview-phone'); assertDevice();
    page.click('#preview-desktop'); assertDevice();
    Object.defineProperty(page.window, 'innerWidth', { value: deviceCase.width < 720 ? 1440 : 390, configurable: true });
    page.window.dispatchEvent(new page.window.Event('resize'));
    await page.frames(); assertDevice();
  }
});

test('The phone clock shows browser local time immediately and refreshes when the page becomes visible in a later minute', t => {
  const clock = { now: Date.parse('2026-10-26T11:58:45Z') };
  const page = preview(t, { savedMode: 'phone', clock });
  const localTime = () => new page.window.Intl.DateTimeFormat('ru-RU', {
    hour: 'numeric', minute: '2-digit', hourCycle: 'h23',
  }).format(new page.window.Date());
  const initialTime = localTime();
  assert.equal(page.$('#phone-clock').textContent, initialTime, 'time is current before the first animation frame');
  Object.defineProperty(page.document, 'visibilityState', { value: 'hidden', configurable: true });
  Object.defineProperty(page.document, 'hidden', { get: () => page.document.visibilityState !== 'visible', configurable: true });
  clock.now += 75000;
  page.document.dispatchEvent(new page.window.Event('visibilitychange'));
  assert.equal(page.$('#phone-clock').textContent, initialTime, 'a hidden-page event does not update the clock');
  Object.defineProperty(page.document, 'visibilityState', { value: 'visible', configurable: true });
  page.document.dispatchEvent(new page.window.Event('visibilitychange'));
  assert.notEqual(localTime(), initialTime);
  assert.equal(page.$('#phone-clock').textContent, localTime());
});

test('The intro and seven tour steps expose the actual task entry points and replay without creating, analyzing or sharing tasks', async t => {
  const page = preview(t), initialState = page.state(), initialCount = page.$('#task-count').textContent, initialScrollCount = page.scrolls.length;
  page.click('#start-tour');
  await page.frames();
  assert.equal(page.$('#feature-tour').hidden, false);
  assert.equal(page.$('#start-tour').getAttribute('aria-expanded'), 'true');
  assert.equal(page.$('#tour-back').disabled, true);
  assert.equal(page.$('#tour-back').hidden, true);
  assert.equal(page.$('#tour-step').textContent, '1 из 8');
  assert.equal(page.$('#tour-next').classList.contains('tour-replay'), false);
  assert.equal(page.$('#tour-title').textContent, 'Задачи - от слов к делу');
  assert.equal(page.$('.tour-eyebrow').textContent, 'Задачи');
  assert.match(page.$('#tour-description').textContent, /автоматически/i);
  assert.match(page.$('#tour-description').textContent, /задач/i);
  assert.match(page.$('#tour-description').textContent, /чат/i);
  assert.equal(page.$('#tour-spotlight').hidden, true);
  assert.equal(page.$('#tour-arrow').hasAttribute('hidden'), true);
  assert.equal(page.$('#context-menu').hidden, true);
  assert.equal(page.scrolls.length, initialScrollCount, 'the intro does not target or scroll an app control');
  assert.equal(page.document.activeElement, page.$('#tour-card'));
  assert.equal(page.$('#tour-card').getAttribute('aria-busy'), 'false');

  page.click('#tour-next'); await page.frames();
  assert.equal(page.$('#tour-step').textContent, '2 из 8');
  assert.equal(page.$('#tour-back').disabled, false);
  assert.equal(page.$('#tour-back').hidden, false);
  assert.equal(page.$('#tour-title').textContent, 'Анализировать задачи');
  assert.match(page.$('#tour-description').textContent, /Вы сами выбираете, какие чаты анализировать в задачи/);
  assert.equal(page.state().folder, 'all');
  assert.equal(page.$('#context-menu').hidden, false);
  assert.match(page.$('[data-context="analyze"]').textContent, /Анализировать задачи/);
  assert.equal(page.$('#tour-arrow').hasAttribute('hidden'), false);
  assert(page.$('#tour-arrow-path').getAttribute('d'), 'feature steps draw an arrow to their target');
  assert.equal(page.scrolls.at(-1).element.dataset.chat, 'project');
  assert.equal(page.document.activeElement, page.$('#tour-card'));
  assert.equal(page.$('#tour-card').getAttribute('aria-busy'), 'false');

  page.click('#tour-next'); await page.frames();
  assert.equal(page.$('#tour-step').textContent, '3 из 8');
  assert.equal(page.scrolls.at(-1).element.dataset.folder, 'tasks');
  assert.equal(page.$('#context-menu').hidden, true);

  page.click('#tour-next'); await page.frames();
  assert.equal(page.$('#tour-step').textContent, '4 из 8');
  assert.equal(page.state().folder, 'tasks');
  assert.equal(page.scrolls.at(-1).element.dataset.task, 'task-presentation');
  assert.equal(page.$('#task-panel').hidden, false);

  page.click('#tour-next'); await page.frames();
  assert.equal(page.$('#tour-step').textContent, '5 из 8');
  assert(page.$('.telegram-window').classList.contains('chat-open'));
  assert.equal(page.scrolls.at(-1).element.dataset.message, 'project-3');
  const presentationThread = page.all('#task-detail .task-thread [data-message]').map(element => element.dataset.message);
  assert.equal(presentationThread.length, 6);

  page.click('#tour-next'); await page.frames();
  assert.equal(page.$('#tour-step').textContent, '6 из 8');
  assert.equal(page.$('#context-menu').hidden, false);
  assert.match(page.$('[data-context="create-task"]').textContent, /Создать задачу/);
  assert.equal(page.document.querySelector('[data-context="open-task"]'), null, 'the guide chooses an unlinked source message');
  assert.equal(page.$('#detail-dialog').open, false, 'the guide only demonstrates the menu');
  assert.equal(page.document.activeElement, page.$('#tour-card'), 'opening a highlighted menu returns keyboard focus to the guide');

  page.click('#tour-next'); await page.frames();
  assert.equal(page.$('#tour-step').textContent, '7 из 8');
  assert.equal(page.$('#context-menu').hidden, true);
  assert.equal(page.scrolls.at(-1).element.dataset.openTask, 'task-presentation');
  assert.match(page.scrolls.at(-1).element.textContent, /Задача создана/);
  assert.equal(page.$('#tour-next').textContent, 'Далее');

  page.click('#tour-next'); await page.frames();
  assert.equal(page.$('#tour-step').textContent, '8 из 8');
  assert.equal(page.$('#tour-title').textContent, 'Поделиться');
  assert.match(page.$('#tour-description').textContent, /Исполнитель из исходного чата уже выбран получателем/);
  assert.equal(page.scrolls.at(-1).element, page.$('#share-task'));
  assert.equal(page.state().taskId, 'task-presentation', 'sharing continues with the presentation shown by earlier steps');
  assert.deepEqual(page.all('#task-detail .task-thread [data-message]').map(element => element.dataset.message), presentationThread);
  assert.equal(page.$('#task-panel').hidden, false);
  assert.equal(page.$('#detail-dialog').open, false, 'the guide highlights sharing without opening the send dialog');
  assert.equal(page.$('#tour-next').textContent, 'Еще раз');
  assert.equal(page.$('#tour-next').classList.contains('tour-replay'), true);
  assert.equal(page.state().taskCount, initialState.taskCount);
  assert.equal(page.$('#task-count').textContent, initialCount);
  assert(!page.focusLog.some(element => element.id === 'task-title'), 'tour navigation does not focus an editable title or open a phone keyboard');
  page.click('#tour-next');
  assert.equal(page.$('#tour-arrow').hasAttribute('hidden'), true, 'replay hides the SVG arrow before the next animation frame');
  assert.equal(page.$('#tour-arrow-path').getAttribute('d') || '', '', 'replay immediately clears the previous arrow path');
  await page.frames();
  assert.equal(page.$('#feature-tour').hidden, false, 'the final action replays the tour instead of dismissing it');
  assert.equal(page.$('#tour-step').textContent, '1 из 8');
  assert.equal(page.$('#tour-next').classList.contains('tour-replay'), false, 'replaying restores the normal navigation button');
  assert.equal(page.$('#tour-title').textContent, 'Задачи - от слов к делу');
  assert.equal(page.$('#tour-back').disabled, true);
  assert.equal(page.$('#tour-back').hidden, true);
  assert.equal(page.$('#tour-spotlight').hidden, true);
  assert.equal(page.$('#tour-arrow').hasAttribute('hidden'), true);
  assert.equal(page.$('#context-menu').hidden, true);
  assert.equal(page.state().chatId, 'project');
  assert.equal(page.state().folder, 'all');
  assert.equal(page.$('#chat-list [data-chat].selected').dataset.chat, 'project');
  assert(!page.$('.telegram-window').classList.contains('chat-open'), 'replay restores the initial chat list');
  assert.equal(page.document.activeElement, page.$('#tour-card'));
  page.click('#tour-close');
  assert.equal(page.$('#feature-tour').hidden, true);
  assert.equal(page.document.activeElement, page.$('#start-tour'));
});

test('Changing Phone and Desktop during the tour preserves its step and reveals the corresponding mobile screen', async t => {
  const page = preview(t);
  page.click('#start-tour'); await page.frames();
  page.click('#preview-phone'); await page.frames();
  assert.equal(page.$('#tour-step').textContent, '1 из 8');
  assert.equal(page.$('#tour-spotlight').hidden, true);
  assert.equal(page.$('#tour-arrow').hasAttribute('hidden'), true);
  assert.equal(page.$('#context-menu').hidden, true);
  page.click('#preview-desktop'); await page.frames();
  assert.equal(page.$('#tour-step').textContent, '1 из 8', 'changing the device keeps the intro visible');
  assert.equal(page.$('#tour-title').textContent, 'Задачи - от слов к делу');
  page.click('#preview-phone'); await page.frames();
  page.click('#tour-next'); await page.frames();
  assert.equal(page.$('#tour-step').textContent, '2 из 8');
  assert(!page.$('.telegram-window').classList.contains('chat-open'), 'the chat-menu step shows the chat list on phone');
  assert.equal(page.$('#context-menu').hidden, false);
  assert(page.$('[data-context="analyze"]'));
  page.click('#tour-next'); await page.frames();
  page.click('#tour-next'); await page.frames();
  assert.equal(page.$('#tour-step').textContent, '4 из 8');
  assert.equal(page.state().folder, 'tasks');
  assert(!page.$('.telegram-window').classList.contains('chat-open'), 'the list step keeps the phone on the task list');
  page.click('#tour-next'); await page.frames();
  assert.equal(page.$('#tour-step').textContent, '5 из 8');
  assert(page.$('.telegram-window').classList.contains('chat-open'), 'the evidence step opens the task screen');
  page.click('#preview-desktop'); await page.frames();
  assert.equal(page.$('#tour-step').textContent, '5 из 8');
  assert.equal(page.state().taskId, 'task-presentation');
  page.click('#tour-next'); await page.frames();
  page.click('#preview-phone'); await page.frames();
  assert.equal(page.$('#tour-step').textContent, '6 из 8');
  assert.equal(page.$('#context-menu').hidden, false);
  assert(page.$('.telegram-window').classList.contains('chat-open'), 'the message-menu step opens the conversation on phone');
  assert(page.$('[data-context="create-task"]'));
});

test('The guide supports keyboard navigation, traps focus in its controls and closes before app Escape handlers', async t => {
  const page = preview(t);
  page.click('#start-tour'); await page.frames();
  assert.equal(page.key('Tab').defaultPrevented, true);
  assert.equal(page.document.activeElement, page.$('#preview-phone'));
  page.key('Tab', { shiftKey: true });
  assert.equal(page.document.activeElement, page.$('#tour-next'));
  page.key('Tab');
  assert.equal(page.document.activeElement, page.$('#preview-phone'));
  page.$('#tour-close').focus(); page.key('Tab');
  assert.equal(page.document.activeElement, page.$('#tour-next'), 'hidden Back is omitted at the first step');
  page.key('ArrowRight'); await page.frames();
  assert.equal(page.$('#tour-step').textContent, '2 из 8');
  page.$('#tour-close').focus(); page.key('Tab');
  assert.equal(page.document.activeElement, page.$('#tour-back'));
  page.key('ArrowLeft'); await page.frames();
  assert.equal(page.$('#tour-step').textContent, '1 из 8');
  assert.equal(page.$('#context-menu').hidden, true);
  page.key('ArrowRight'); await page.frames();
  assert.equal(page.$('#context-menu').hidden, false);
  assert.equal(page.key('Escape').defaultPrevented, true);
  assert.equal(page.$('#feature-tour').hidden, true);
  assert.equal(page.$('#context-menu').hidden, true);
  assert.equal(page.$('#start-tour').getAttribute('aria-expanded'), 'false');
  assert.equal(page.document.activeElement, page.$('#start-tour'));
  page.click('#start-tour'); await page.frames();
  assert.equal(page.$('#feature-tour').hidden, false);
  assert.equal(page.$('#tour-step').textContent, '7 из 8', 'reopening the guide uses the task badge in the current conversation');
  page.click('#tour-close');
  assert.equal(page.$('#feature-tour').hidden, true);
  assert.equal(page.document.activeElement, page.$('#start-tour'));
});

test('Every page visit starts the guide automatically, including visits with a previous dismissal', async t => {
  const first = preview(t, { seen: false });
  assert.equal(first.window.localStorage.getItem(seenKey), null);
  await first.frames(8);
  assert.equal(first.$('#feature-tour').hidden, false);
  assert.equal(first.$('#tour-step').textContent, '1 из 8');
  assert.equal(first.$('#tour-title').textContent, 'Задачи - от слов к делу');
  first.click('#tour-close');
  await first.frames();
  assert.equal(first.$('#feature-tour').hidden, true, 'dismissal lasts for the current visit');
  const returning = preview(t, { seen: true });
  assert.equal(returning.window.localStorage.getItem(seenKey), 'seen', 'the legacy dismissal preference is present');
  await returning.frames(8);
  assert.equal(returning.$('#feature-tour').hidden, false);
  assert.equal(returning.$('#tour-step').textContent, '1 из 8');
});

test('Manual guide entry follows the selected task list or card and preserves that task through active clicks and layout changes', async t => {
  const page = preview(t, { savedMode: 'phone' });
  await page.frames(8); page.click('#tour-close');
  page.click('[data-folder="tasks"]');
  page.click('[data-task="task-header"]');
  page.input('#task-comment', 'Сохранённая правка шапки', 'focusout');
  page.click('#task-panel [data-action="back"]');
  page.click('#start-tour'); await page.frames();
  const assertList = () => {
    assert.equal(page.$('#tour-step').textContent, '4 из 8');
    assert.equal(page.state().taskId, 'task-header');
    assert.equal(page.scrolls.at(-1).element.dataset.task, 'task-header');
    assert(!page.$('.telegram-window').classList.contains('chat-open'));
  };
  assertList();
  page.click('#start-tour'); await page.frames(); assertList();
  page.window.dispatchEvent(new page.window.Event('resize')); await page.frames(); assertList();
  page.click('#preview-desktop'); await page.frames(); assertList();
  page.click('#tour-close');
  page.click('[data-task="task-header"]');
  page.click('#start-tour'); await page.frames();
  const assertCard = () => {
    assert.equal(page.$('#tour-step').textContent, '5 из 8');
    assert.equal(page.state().taskId, 'task-header');
    assert.equal(page.scrolls.at(-1).element.dataset.message, 'design-4');
    assert.equal(page.scrolls.at(-1).element.dataset.messageChat, 'design');
    assert.equal(page.$('#task-comment').value, 'Сохранённая правка шапки');
    assert(page.$('.telegram-window').classList.contains('chat-open'));
  };
  assertCard();
  page.click('#start-tour'); await page.frames(); assertCard();
  page.click('#preview-phone'); await page.frames(); assertCard();
  page.window.dispatchEvent(new page.window.Event('resize')); await page.frames(); assertCard();
});

test('Manual guide entry keeps the exact chat and unlinked message when their context menus are already open', async t => {
  const page = preview(t), taskCount = page.state().taskCount;
  await page.frames(8); page.click('#tour-close');
  page.click('[data-chat="design"]');
  page.click('[data-chat-menu="design"]');
  page.click('#start-tour'); await page.frames();
  const assertChatMenu = () => {
    assert.equal(page.$('#tour-step').textContent, '2 из 8');
    assert.equal(page.state().chatId, 'design');
    assert.equal(page.scrolls.at(-1).element.dataset.chat, 'design');
    assert.equal(page.$('#context-menu').hidden, false);
    assert(page.$('[data-context="analyze"]'));
  };
  assertChatMenu();
  page.window.dispatchEvent(new page.window.Event('resize')); await page.frames(); assertChatMenu();
  page.click('#preview-phone'); await page.frames(); assertChatMenu();
  page.click('#tour-close');
  page.click('[data-chat="design"]');
  page.click('[data-message-menu="design-7"]');
  page.click('#start-tour'); await page.frames();
  const assertMessageMenu = () => {
    assert.equal(page.$('#tour-step').textContent, '6 из 8');
    assert.equal(page.state().chatId, 'design');
    assert.equal(page.scrolls.at(-1).element.dataset.message, 'design-7');
    assert.equal(page.scrolls.at(-1).element.dataset.messageChat, 'design');
    assert.equal(page.$('#context-menu').hidden, false);
    assert(page.$('[data-context="create-task"]'));
    assert.equal(page.$('#detail-dialog').open, false);
  };
  assertMessageMenu();
  page.click('#start-tour'); await page.frames(); assertMessageMenu();
  page.click('#preview-desktop'); await page.frames(); assertMessageMenu();
  page.window.dispatchEvent(new page.window.Event('resize')); await page.frames(); assertMessageMenu();
  assert.equal(page.state().taskCount, taskCount, 'contextual entry only demonstrates the available actions');
});

test('Manual task guide entry keeps the visible filtered result and still recognizes an open card with no search results', async t => {
  const page = preview(t);
  await page.frames(8); page.click('#tour-close');
  page.click('[data-folder="tasks"]');
  page.click('[data-task-filter="completed"]');
  page.input('#chat-search', 'палитр');
  assert.equal(page.all('#task-list [data-task]').length, 1);
  page.click('#start-tour'); await page.frames();
  const assertFilteredList = () => {
    assert.equal(page.$('#tour-step').textContent, '4 из 8');
    assert.equal(page.scrolls.at(-1).element.dataset.task, 'task-palette');
    assert.equal(page.$('#chat-search').value, 'палитр');
    assert.equal(page.$('[data-task-filter="completed"]').getAttribute('aria-pressed'), 'true');
    assert.equal(page.all('#task-list [data-task]').length, 1);
  };
  assertFilteredList();
  page.window.dispatchEvent(new page.window.Event('resize')); await page.frames(); assertFilteredList();
  page.click('#tour-close');
  page.click('#clear-search');
  page.click('[data-task-filter="open"]');
  page.click('[data-task="task-header"]');
  page.input('#chat-search', 'несуществующая задача');
  assert.equal(page.all('#task-list [data-task]').length, 0);
  assert.equal(page.$('#task-panel').hidden, false);
  page.click('#start-tour'); await page.frames();
  assert.equal(page.$('#tour-step').textContent, '5 из 8');
  assert.equal(page.state().taskId, 'task-header');
  assert.equal(page.scrolls.at(-1).element.dataset.message, 'design-4');
});

test('Manual guide entry on a conversation task badge targets its own task and source message', async t => {
  const page = preview(t);
  await page.frames(8); page.click('#tour-close');
  page.click('[data-chat="research"]');
  page.click('#start-tour'); await page.frames();
  const assertBadge = () => {
    assert.equal(page.$('#tour-step').textContent, '7 из 8');
    assert.equal(page.state().chatId, 'research');
    const badge = page.scrolls.at(-1).element;
    assert.equal(badge.dataset.openTask, 'task-interviews');
    assert.equal(badge.closest('[data-message]').dataset.message, 'research-1');
    assert.equal(badge.closest('[data-message]').dataset.messageChat, 'research');
  };
  assertBadge();
  page.click('#start-tour'); await page.frames(); assertBadge();
  page.click('#preview-phone'); await page.frames(); assertBadge();
  page.window.dispatchEvent(new page.window.Event('resize')); await page.frames(); assertBadge();
});

test('Manual entry without a matching feature resets the intro chat list while preserving drafts and task edits', async t => {
  const page = preview(t);
  await page.frames(8); page.click('#tour-close');
  page.click('[data-folder="tasks"]');
  page.click('[data-task="task-header"]');
  page.input('#task-comment', 'Не потерять комментарий', 'focusout');
  page.click('[data-folder="all"]');
  page.click('[data-chat="irina"]');
  page.input('#message-input', 'Неотправленный черновик Ирины');
  const taskCount = page.state().taskCount;
  page.click('#start-tour');
  assert.equal(page.$('#tour-arrow').hasAttribute('hidden'), true);
  assert.equal(page.$('#tour-arrow-path').getAttribute('d') || '', '');
  await page.frames();
  const assertIntro = () => {
    assert.equal(page.$('#tour-step').textContent, '1 из 8');
    assert.equal(page.state().chatId, 'project');
    assert.equal(page.state().folder, 'all');
    assert.equal(page.$('#chat-list [data-chat].selected').dataset.chat, 'project');
    assert(!page.$('.telegram-window').classList.contains('chat-open'));
    assert.equal(page.$('#tour-spotlight').hidden, true);
    assert.equal(page.$('#tour-arrow').hasAttribute('hidden'), true);
    assert.equal(page.state().taskCount, taskCount);
  };
  assertIntro();
  page.click('#tour-close');
  page.click('[data-chat="irina"]');
  assert.equal(page.$('#message-input').value, 'Неотправленный черновик Ирины');
  page.click('[data-folder="tasks"]');
  page.click('[data-task="task-header"]');
  assert.equal(page.$('#task-comment').value, 'Не потерять комментарий');
  page.click('#preview-phone');
  page.click('[data-folder="all"]');
  page.click('[data-chat="irina"]');
  page.click('#conversation [data-action="back"]');
  page.click('#start-tour'); await page.frames();
  assertIntro();
  page.click('#tour-close');
  page.click('[data-chat="irina"]');
  assert.equal(page.$('#message-input').value, 'Неотправленный черновик Ирины');
});

test('Context menus stay within the visible phone screen even when opened near the viewport edge', t => {
  const page = preview(t, { savedMode: 'phone' });
  page.$('[data-chat="project"]').dispatchEvent(new page.window.MouseEvent('contextmenu', {
    bubbles: true, cancelable: true, clientX: 1250, clientY: 980,
  }));
  const menu = page.$('#context-menu'), bounds = menu.getBoundingClientRect();
  const screen = page.$('#device-screen').getBoundingClientRect();
  assert.equal(menu.hidden, false);
  assert(bounds.left >= screen.left + 5);
  assert(bounds.right <= screen.right - 5);
  assert(bounds.top >= screen.top + 45);
  assert(bounds.bottom <= screen.bottom - 20);
  assert.equal(menu.style.maxWidth, `${screen.width - 10}px`);
});
