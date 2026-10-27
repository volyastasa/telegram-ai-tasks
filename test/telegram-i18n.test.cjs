'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM, VirtualConsole } = require('jsdom');

const prototypeDirectory = path.resolve(__dirname, '../src');
const read = name => fs.readFileSync(path.join(prototypeDirectory, name), 'utf8');
const cyrillic = /[А-ЯЁа-яё]/u;

function localizedPrototype(t, { language, width = 1280 } = {}) {
  const errors = [], scrolls = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => errors.push(error));
  // Scripts execute locally; this harness never requests scripts, assets or services.
  const dom = new JSDOM(read('index.html'), {
    url: 'https://tasks.example.test/', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole,
  });
  const { window } = dom, { document } = window;
  Object.defineProperty(window, 'innerWidth', { value: width, configurable: true });
  window.fetch = () => assert.fail('Changing the prototype language must not make a network request');
  window.requestAnimationFrame = callback => window.setTimeout(() => callback(window.performance.now()), 0);
  window.cancelAnimationFrame = timer => window.clearTimeout(timer);
  const rect = (left, top, rectWidth, rectHeight) => ({ left, top, width: rectWidth, height: rectHeight, right: left + rectWidth, bottom: top + rectHeight, x: left, y: top, toJSON() {} });
  window.Element.prototype.getBoundingClientRect = function () {
    if (this.id === 'device-screen') return rect(430, 100, 390, 780);
    if (this.id === 'context-menu') return rect(parseFloat(this.style.left) || 0, parseFloat(this.style.top) || 0, 260, 180);
    if (this.id === 'tour-card') return rect(parseFloat(this.style.left) || 0, parseFloat(this.style.top) || 0, 330, 250);
    if (this.closest('#context-menu')) {
      const menu = document.getElementById('context-menu').getBoundingClientRect();
      return rect(menu.left + 6, menu.top + 6, 248, 40);
    }
    return rect(450, 260, 240, 44);
  };
  window.Element.prototype.scrollIntoView = function () { scrolls.push(this); };
  window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  window.HTMLDialogElement.prototype.close = function () { this.open = false; this.dispatchEvent(new window.Event('close')); };
  if (language !== undefined) window.localStorage.setItem('tasks.language', language);
  for (const name of ['i18n.js', 'demo-data.js', 'demo-i18n.js', 'interface-i18n.js', 'prototype.js', 'preview.js']) window.eval(read(name));
  t.after(() => { window.close(); assert.deepEqual(errors, [], 'localization executes without uncaught browser errors'); });
  const $ = selector => { const element = document.querySelector(selector); assert(element, `Missing localized element: ${selector}`); return element; };
  const all = selector => [...document.querySelectorAll(selector)];
  const click = selector => $(selector).click();
  const event = (selector, type) => $(selector).dispatchEvent(new window.Event(type, { bubbles: true, cancelable: true }));
  const input = (selector, value, type = 'input') => { $(selector).value = value; event(selector, type); };
  const frames = async (count = 6) => { for (let index = 0; index < count; index++) await new Promise(resolve => window.requestAnimationFrame(resolve)); };
  const dismissIntro = async () => { await frames(8); click('#tour-close'); };
  const setLanguage = async value => { window.TasksI18n.setLanguage(value); await frames(); };
  const openChat = id => { click('[data-folder="all"]'); click(`[data-chat="${id}"]`); };
  const openTask = id => { click('[data-folder="tasks"]'); click(`[data-task="${id}"]`); };
  const state = () => ({ ...window.FollowUpPrototype.getState() });
  const messageText = selector => { const copy = $(selector).cloneNode(true); copy.querySelectorAll('.message-meta').forEach(element => element.remove()); return copy.textContent; };
  return { window, document, $, all, click, event, input, frames, dismissIntro, setLanguage, openChat, openTask, state, scrolls, messageText };
}

test('English is the default for the interface, synthetic conversations and stories, with language controls beside the guide', async t => {
  const page = localizedPrototype(t);
  await page.frames(8);
  assert.equal(page.window.TasksI18n.language, 'en');
  assert.equal(page.document.documentElement.lang, 'en');
  assert.doesNotMatch(page.document.title, cyrillic);
  assert.match(page.document.title, /Tasks/);
  const actions = page.$('.preview-toolbar-actions');
  assert(actions.contains(page.$('#start-tour')));
  assert(actions.contains(page.$('#language-en')));
  assert(actions.contains(page.$('#language-ru')));
  assert(page.$('#start-tour').compareDocumentPosition(page.$('#language-en')) & page.window.Node.DOCUMENT_POSITION_FOLLOWING);
  assert.equal(page.$('#language-en').getAttribute('aria-pressed'), 'true');
  assert.equal(page.$('#language-ru').getAttribute('aria-pressed'), 'false');
  assert.equal(page.$('[data-chat="project"] .chat-name').textContent, 'Project Team');
  assert.equal(page.$('[data-chat="saved"] .chat-name').textContent, 'Saved Messages');
  assert.equal(page.$('.story-name').textContent, 'Irina');
  assert.doesNotMatch(page.$('#messages').textContent, cyrillic);
  assert.doesNotMatch(page.$('#chat-search').placeholder, cyrillic);
  assert.doesNotMatch(page.$('#message-input').getAttribute('aria-label'), cyrillic);
  assert.doesNotMatch(page.document.body.textContent, cyrillic, 'the untouched demo has no untranslated Russian text');
});

test('Language preference persists through buttons, supports saved Russian, and falls back to English for invalid values', async t => {
  const page = localizedPrototype(t);
  await page.frames(8);
  page.click('#language-ru'); await page.frames();
  assert.equal(page.window.TasksI18n.language, 'ru');
  assert.equal(page.window.localStorage.getItem('tasks.language'), 'ru');
  assert.equal(page.document.documentElement.lang, 'ru');
  assert.equal(page.$('#language-ru').getAttribute('aria-pressed'), 'true');
  assert.equal(page.$('[data-chat="project"] .chat-name').textContent, 'Команда проекта');
  const restored = localizedPrototype(t, { language: page.window.localStorage.getItem('tasks.language') });
  await restored.frames(8);
  assert.equal(restored.window.TasksI18n.language, 'ru');
  assert.equal(restored.$('#tour-title').textContent, 'Задачи - от слов к делу');
  const invalid = localizedPrototype(t, { language: 'unsupported-language' });
  await invalid.frames(8);
  assert.equal(invalid.window.TasksI18n.language, 'en');
  assert.equal(invalid.document.documentElement.lang, 'en');
  page.click('#language-en'); await page.frames();
  assert.equal(page.window.localStorage.getItem('tasks.language'), 'en');
});

test('All eight guide screens are English by default and changing language keeps the current step and target', async t => {
  const page = localizedPrototype(t), taskCount = page.state().taskCount;
  await page.frames(8);
  for (let step = 1; step <= 8; step++) {
    assert.equal(page.$('#tour-step').textContent, `${step} of 8`);
    assert.doesNotMatch(page.$('#tour-title').textContent, cyrillic);
    assert.doesNotMatch(page.$('#tour-description').textContent, cyrillic);
    if (step === 5) {
      const sourceId = page.scrolls.at(-1).dataset.message;
      await page.setLanguage('ru');
      assert.equal(page.$('#tour-step').textContent, '5 из 8');
      assert.equal(page.scrolls.at(-1).dataset.message, sourceId);
      await page.setLanguage('en');
      assert.equal(page.scrolls.at(-1).dataset.message, sourceId);
    }
    if (step < 8) { page.click('#tour-next'); await page.frames(); }
  }
  assert.equal(page.state().taskCount, taskCount);
  assert.doesNotMatch(page.$('#tour-next').textContent, cyrillic);
  page.click('#tour-next'); await page.frames();
  assert.equal(page.$('#tour-step').textContent, '1 of 8');
});

test('Switching language preserves the app, selected chat and independent unsent drafts exactly', async t => {
  const page = localizedPrototype(t);
  await page.dismissIntro();
  const app = page.$('.telegram-window'), count = page.state().taskCount;
  const projectDraft = 'Подготовить презентацию проекта', designDraft = 'Черновик: дизайн <b>без изменений</b>';
  page.openChat('project'); page.input('#message-input', projectDraft);
  page.openChat('design'); page.input('#message-input', designDraft);
  const selectedState = page.state();
  page.click('#language-ru'); await page.frames();
  assert.equal(page.$('.telegram-window'), app, 'language switching keeps the current app instance');
  assert.deepEqual(page.state(), selectedState);
  assert.equal(page.$('#message-input').value, designDraft);
  await page.setLanguage('en');
  assert.deepEqual(page.state(), selectedState);
  assert.equal(page.$('#message-input').value, designDraft);
  page.openChat('project');
  assert.equal(page.$('#message-input').value, projectDraft, 'a draft matching a demo dictionary key is still user text');
  assert.equal(page.state().taskCount, count);
});

test('Task language changes keep selected identity, filters, canonical select values and user edits', async t => {
  const page = localizedPrototype(t);
  await page.dismissIntro(); page.openTask('task-header');
  const taskTitle = 'Подготовить презентацию проекта', comment = 'Сравнить два варианта поиска. Сохранить подписи у основных действий.';
  page.$('#task-title').textContent = taskTitle; page.event('#task-title', 'focusout');
  page.input('#task-comment', comment, 'focusout');
  page.input('#task-assignee', 'София', 'change');
  page.input('#task-due', '2026-11-02', 'change');
  page.click('[data-task-filter="completed"]');
  const selectedState = page.state();
  for (const language of ['ru', 'en', 'ru', 'en']) {
    await page.setLanguage(language);
    assert.deepEqual(page.state(), selectedState);
    assert.equal(page.$('[data-task-filter="completed"]').getAttribute('aria-pressed'), 'true');
    assert.equal(page.$('#task-title').textContent, taskTitle);
    assert.equal(page.$('#task-comment').value, comment);
    assert.equal(page.$('#task-assignee').value, 'София');
    assert.equal(page.$('#task-due').value, '2026-11-02');
  }
  assert(page.all('#task-assignee option').some(option => option.value === 'Никита' && option.textContent === 'Nikita'));
});

test('English search finds translated chat names, tasks and message content without rewriting canonical demo data', async t => {
  const page = localizedPrototype(t);
  await page.dismissIntro();
  page.input('#chat-search', 'research');
  assert.deepEqual(page.all('#chat-list [data-chat]').map(element => element.dataset.chat), ['research']);
  page.click('[data-chat="research"]');
  page.click('[data-action="search-messages"]');
  page.input('#message-search', 'five interviews');
  assert(page.all('#messages .message.match').some(element => element.dataset.message === 'research-1'));
  page.click('[data-folder="tasks"]');
  page.input('#chat-search', 'header');
  assert.deepEqual(page.all('#task-list [data-task]').map(element => element.dataset.task), ['task-header']);
  page.click('[data-task="task-header"]');
  assert.equal(page.$('#task-title').textContent, 'Update the screen header');
  assert.doesNotMatch(page.$('#task-detail').textContent, cyrillic, 'the untouched task card, options and linked messages are English');
  assert.equal(page.window.TelegramDemo.chats.find(chat => chat.id === 'research').name, 'Исследования');
  assert.equal(page.window.TelegramDemo.tasks.find(task => task.id === 'task-header').title, 'Обновить шапку экрана');
  assert.equal(page.window.TelegramDemo.histories.research.find(message => message.id === 'research-1').authorId, 'irina');
});

test('A manually created Cyrillic task stays literal across languages while its source and participant identities remain linked', async t => {
  const page = localizedPrototype(t);
  await page.dismissIntro(); page.openChat('support');
  const before = page.state().taskCount, title = 'Подготовить презентацию проекта';
  page.click('[data-message-menu="support-2"]'); page.click('[data-context="create-task"]');
  assert.doesNotMatch(page.$('#dialog-title').textContent, cyrillic);
  page.input('#create-title', title); page.input('#create-assignee', 'Марк', 'change');
  page.input('#create-due', '2026-11-03', 'change'); page.event('#task-create-form', 'submit');
  const taskId = page.state().taskId;
  assert.match(taskId, /^manual-task-/);
  for (const language of ['ru', 'en']) {
    await page.setLanguage(language);
    assert.equal(page.state().taskId, taskId);
    assert.equal(page.state().taskCount, before + 1);
    assert.equal(page.$('#task-title').textContent, title);
    assert.equal(page.$('#task-assignee').value, 'Марк');
    assert.equal(page.$('#task-due').value, '2026-11-03');
    assert.deepEqual(page.all('.task-thread [data-message]').map(element => element.dataset.message), ['support-2', 'support-3']);
  }
  page.click('#open-task-chat'); await page.frames();
  assert(page.$('#messages [data-message="support-2"] [data-open-task]').dataset.openTask === taskId);
});

test('A sent Cyrillic reply remains exact across languages and stays in its task discussion', async t => {
  const page = localizedPrototype(t);
  await page.dismissIntro(); page.openChat('project');
  const text = 'Подготовить презентацию проекта';
  page.click('[data-message-menu="project-3"]'); page.click('[data-context="reply"]');
  page.input('#message-input', text); page.event('#composer', 'submit');
  const messageId = page.all('#messages .message').at(-1).dataset.message;
  for (const language of ['ru', 'en']) {
    await page.setLanguage(language);
    assert.equal(page.messageText(`#messages [data-message="${messageId}"] > p`), text);
  }
  page.openTask('task-presentation');
  assert.equal(page.messageText(`.task-thread [data-message="${messageId}"] > p`), text);
  assert.equal(page.all(`.task-thread [data-message="${messageId}"]`).length, 1);
  assert.equal(page.$('#task-count').textContent, '3');
});

test('Sharing in another language preserves the chosen recipient and literal note without duplicating a task', async t => {
  const page = localizedPrototype(t);
  await page.dismissIntro(); page.openTask('task-header'); page.click('#share-task');
  const note = 'Подготовить презентацию проекта', before = page.state().taskCount;
  assert.equal(page.$('#task-share-form input[name="recipient"]:checked').value, 'nikita');
  page.click('#task-share-form input[name="recipient"][value="irina"]'); page.input('#share-comment', note);
  await page.setLanguage('ru'); await page.setLanguage('en');
  assert.equal(page.$('#detail-dialog').open, true);
  assert.equal(page.$('#task-share-form input[name="recipient"]:checked').value, 'irina');
  assert.equal(page.$('#share-comment').value, note);
  page.event('#task-share-form', 'submit');
  assert.equal(page.state().chatId, 'irina');
  assert.equal(page.state().taskCount, before);
  const card = page.$('#messages .shared-task-card[data-open-task="task-header"]');
  assert.equal(card.closest('.message').querySelector('p').textContent, note);
  assert.match(card.textContent, /Update the screen header/);
  card.click();
  assert.equal(page.state().taskId, 'task-header');
  assert.equal(page.$('#task-assignee').value, 'Никита');
});
