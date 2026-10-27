'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM, VirtualConsole } = require('jsdom');

const prototypeDirectory = path.resolve(__dirname, '../src');
const read = name => fs.readFileSync(path.join(prototypeDirectory, name), 'utf8');

function prototype(t, { width = 1280 } = {}) {
  const errors = [], scrolls = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => errors.push(error));
  // Outside-only deliberately avoids fetching scripts, assets or remote resources.
  const dom = new JSDOM(read('index.html'), {
    url: 'https://tasks.example.test/',
    runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole,
  });
  const { window } = dom;
  Object.defineProperty(window, 'innerWidth', { value: width, configurable: true });
  window.Element.prototype.scrollIntoView = function () { scrolls.push(this); };
  window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  window.HTMLDialogElement.prototype.close = function () {
    this.open = false;
    this.dispatchEvent(new window.Event('close'));
  };
  window.localStorage.setItem('tasks.language', 'ru');
  for (const name of ['i18n.js', 'demo-data.js', 'demo-i18n.js', 'interface-i18n.js', 'prototype.js']) window.eval(read(name));
  t.after(() => { dom.window.close(); assert.deepEqual(errors, [], 'browser execution has no uncaught errors'); });
  const document = window.document;
  const $ = selector => {
    const element = document.querySelector(selector);
    assert(element, `Missing interface element: ${selector}`);
    return element;
  };
  const all = selector => [...document.querySelectorAll(selector)];
  const event = (selector, type, options = {}) => $(selector).dispatchEvent(new window.Event(type, { bubbles: true, cancelable: true, ...options }));
  const click = selector => $(selector).click();
  const input = (selector, value, type = 'input') => { $(selector).value = value; event(selector, type); };
  const rightClick = selector => $(selector).dispatchEvent(new window.MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 180, clientY: 300 }));
  const rows = () => all('#task-list [data-task]');
  const frame = () => new Promise(resolve => window.requestAnimationFrame(resolve));
  return { window, document, $, all, click, input, event, rightClick, rows, scrolls, frame };
}

test('Telegram prototype uses synthetic text avatars, conversations and stories without the old archive or image assets', t => {
  const page = prototype(t);
  assert.equal(page.document.querySelector('#archive-toggle'), null);
  assert.doesNotMatch(page.document.body.textContent, /Архив чатов/);
  assert.equal(page.all('.chat-row').length, 8);
  assert.deepEqual(page.all('.chat-name').map(element => element.textContent), [
    'Команда проекта', 'Дизайн', 'Исследования', 'Выпуск продукта', 'Поддержка', 'Ирина', 'Никита', 'Избранное',
  ]);
  assert.deepEqual(page.all('.story-name').map(element => element.textContent), ['Ирина', 'Никита', 'София', 'Марк', 'Команда']);
  assert.equal(page.all('video, audio, iframe, img:not(.iphone-frame):not(.preview-brand-icon)').length, 0);
  assert.equal(page.$('img.iphone-frame').getAttribute('src'), 'assets/iphone-frame.svg');
  assert.equal(page.$('img.iphone-frame').getAttribute('aria-hidden'), 'true');
  assert(page.all('.avatar').every(element => /^[А-Я]{1,2}$/.test(element.textContent)));
  for (const filename of ['index.html', 'prototype.js', 'prototype.css', 'demo-data.js']) {
    assert.doesNotMatch(read(filename).replaceAll('assets/iphone-frame.svg','').replaceAll('assets/tasks-icon.svg',''), /(?:["'(])(?:\.\/)?assets\//, `${filename} must not use source screenshots or photos`);
  }
  page.click('[data-story="0"]');
  assert.equal(page.$('#detail-dialog').open, true);
  assert.match(page.$('#dialog-content').textContent, /Все данные вымышлены/);
  assert.equal(page.all('#dialog-content img').length, 0);
});

test('The Tasks tab lists tasks from conversations and switching a task changes the right card and its evidence', async t => {
  const page = prototype(t);
  page.click('[data-folder="tasks"]');
  assert.equal(page.$('#chat-list').hidden, true);
  assert.equal(page.$('#task-list').hidden, false);
  assert.equal(page.$('#task-panel').hidden, false);
  assert.equal(page.$('#conversation').hidden, true);
  assert.equal(page.rows().length, 3);
  assert.equal(page.$('#task-count').textContent, '3');
  assert.deepEqual(page.all('.task-row-source').map(element => element.textContent), ['Команда проекта', 'Дизайн', 'Исследования']);
  page.click('[data-task="task-header"]');
  assert.equal(page.$('#task-title').textContent, 'Обновить шапку экрана');
  assert.deepEqual(page.all('.task-thread [data-message]').map(element => element.dataset.message), ['design-4', 'design-5', 'design-6']);
  assert(page.all('.task-thread [data-message]').every(element => element.dataset.messageChat === 'design'));
  page.click('.task-thread [data-source-message="design-5"]');
  await page.frame();
  assert.equal(page.$('#chat-title').textContent, 'Дизайн');
  assert.equal(page.$('#conversation').hidden, false);
  assert.equal(page.$('#task-panel').hidden, true);
  assert(page.$('#messages [data-message="design-5"]').classList.contains('source-highlight'));
  assert.equal(page.scrolls.at(-1).dataset.message, 'design-5');
});

test('A task marker on an outgoing promise opens its card with the original promise and follow-up discussion', t => {
  const page = prototype(t);
  const outgoing = page.$('#messages [data-message="project-3"]');
  assert(outgoing.classList.contains('outgoing'));
  assert.match(outgoing.textContent, /Задача создана/);
  page.click('#messages [data-message="project-3"] [data-open-task]');
  assert.equal(page.$('[data-folder="tasks"]').getAttribute('aria-selected'), 'true');
  assert.equal(page.$('#task-title').textContent, 'Подготовить презентацию проекта');
  assert.equal(page.$('[data-task="task-presentation"]').getAttribute('aria-pressed'), 'true');
  assert(page.$('#task-panel').classList.contains('task-panel'));
  assert.match(page.$('.task-thread [data-message="project-3"]').textContent, /Подготовлю презентацию к 28 октября/);
  assert.match(page.$('.task-thread [data-message="project-5"]').textContent, /Структура готова/);
  assert.match(page.$('.task-thread [data-message="project-9"]').textContent, /структуру презентации согласовали/);
  assert.deepEqual(page.all('.task-thread .date').map(element => element.textContent), ['23 октября', 'Сегодня']);
  assert(page.all('.task-thread .date').every(element => element.nextElementSibling?.matches('.message')), 'date separators precede actual messages without consecutive dates');
  assert.equal(page.all('.task-thread .message').length, 6);
  assert.equal(page.$('.task-thread-header > span').textContent, '6 сообщ.', 'date separators do not inflate the message count');
  assert.equal(page.$('#task-save-state').hidden, true, 'opening a task shows no autosave instruction');
  assert.equal(page.$('#task-save-state').textContent, '');
});

test('Creating a task from a message keeps its source and exact text, escapes the title, and prevents duplicate creation', async t => {
  const page = prototype(t);
  page.click('[data-chat="support"]');
  const source = page.$('#messages [data-message="support-2"] > p').textContent;
  page.rightClick('#messages [data-message="support-2"]');
  assert.equal(page.$('#context-menu').hidden, false);
  page.click('[data-context="create-task"]');
  assert.equal(page.$('#detail-dialog').open, true);
  assert.match(page.$('.task-create-evidence').textContent, /Поддержка/);
  const originalText = page.$('.task-create-evidence blockquote').textContent;
  page.input('#create-title', '   ');
  page.event('#task-create-form', 'submit');
  assert.equal(page.$('#detail-dialog').open, true, 'blank title does not create a task');
  assert.equal(page.$('#task-count').textContent, '3');
  const title = 'Подготовить <img src=x onerror=alert(1)> инструкцию';
  page.input('#create-title', title);
  page.input('#create-assignee', 'Марк', 'change');
  page.input('#create-due', '2026-10-29', 'change');
  page.event('#task-create-form', 'submit');
  assert.equal(page.$('#detail-dialog').open, false);
  assert.equal(page.$('#task-count').textContent, '4');
  assert.equal(page.$('#task-title').textContent, title);
  assert.equal(page.document.querySelector('#task-title img'), null);
  assert.equal(page.$('#task-assignee').value, 'Марк');
  assert.equal(page.$('#task-due').value, '2026-10-29');
  assert.deepEqual(page.all('.task-thread [data-message]').map(element => element.dataset.message), ['support-2', 'support-3']);
  assert.match(page.$('.task-origin').textContent, /Поддержка/);
  assert.equal(page.$('.task-thread [data-message="support-2"] > p').textContent, source);
  assert(page.$('.task-thread').textContent.includes(originalText));
  const createdId = page.$('.task-row.selected').dataset.task;
  page.click('#open-task-chat');
  await page.frame();
  assert.equal(page.$('#chat-title').textContent, 'Поддержка');
  assert.equal(page.$('#messages [data-message="support-2"] > p').textContent, source);
  page.rightClick('#messages [data-message="support-2"]');
  assert.equal(page.document.querySelector('[data-context="create-task"]'), null);
  page.click('[data-context="open-task"]');
  assert.equal(page.$('.task-row.selected').dataset.task, createdId);
  assert.equal(page.$('#task-count').textContent, '4');
});

test('Cancelling a manual task leaves no task, badge or stale create form', t => {
  const page = prototype(t);
  page.click('[data-chat="support"]');
  page.click('[data-message-menu="support-2"]');
  page.click('[data-context="create-task"]');
  page.input('#create-title', 'Несохранённая задача');
  page.click('[data-dialog-action="close"]');
  assert.equal(page.$('#detail-dialog').open, false);
  assert.equal(page.$('#task-count').textContent, '3');
  assert.equal(page.document.querySelector('#messages [data-message="support-2"] [data-open-task]'), null);
  page.click('[data-message-menu="support-2"]');
  page.click('[data-context="create-task"]');
  assert.notEqual(page.$('#create-title').value, 'Несохранённая задача');
});

test('Analyze Tasks acts on the context-menu conversation rather than the open chat and repeated analysis is idempotent', t => {
  const page = prototype(t);
  assert.equal(page.$('#chat-title').textContent, 'Команда проекта');
  page.rightClick('[data-chat="design"]');
  const command = page.$('[data-context="analyze"]');
  assert.match(command.textContent, /Анализировать задачи/);
  assert.match(command.textContent, /Новое/);
  assert(command.classList.contains('task-command'));
  command.click();
  assert.equal(page.$('#task-title').textContent, 'Подготовить единый набор иконок');
  assert.match(page.$('.task-origin').textContent, /Дизайн/);
  assert(page.all('.task-thread [data-message]').every(element => element.dataset.messageChat === 'design'));
  assert.equal(page.$('#task-count').textContent, '4');
  assert.match(page.$('#toast').textContent, /новых задач — 1/);
  page.click('[data-folder="all"]');
  assert.equal(page.$('#chat-title').textContent, 'Команда проекта');
  page.click('[data-chat-menu="design"]');
  page.click('[data-context="analyze"]');
  assert.equal(page.$('#task-count').textContent, '4');
  assert.equal(page.all('[data-task="task-icons"]').length, 1);
  assert.match(page.$('#toast').textContent, /новых задач нет/);
});

test('Analysis does not duplicate a task already created manually from the same promised action', t => {
  const page = prototype(t);
  page.click('[data-chat="design"]');
  page.rightClick('#messages [data-message="design-8"]');
  page.click('[data-context="create-task"]');
  page.input('#create-title', 'Подготовить единый набор иконок');
  page.event('#task-create-form', 'submit');
  assert.equal(page.$('#task-count').textContent, '4');
  page.click('[data-folder="all"]');
  page.click('[data-chat-menu="design"]');
  page.click('[data-context="analyze"]');
  assert.equal(page.$('#task-count').textContent, '4', 'the same promise must not become two tasks after analysis');
  assert.equal(page.all('.task-row-title').filter(element => element.textContent === 'Подготовить единый набор иконок').length, 1);
});

test('Drafts and selected reply survive navigation through tasks and other chats independently', t => {
  const page = prototype(t);
  page.rightClick('#messages [data-message="project-3"]');
  page.click('[data-context="reply"]');
  page.input('#message-input', 'Черновик для команды');
  page.click('[data-folder="tasks"]');
  page.click('[data-task="task-header"]');
  page.click('[data-folder="all"]');
  page.click('[data-chat="design"]');
  assert.equal(page.$('#message-input').value, '');
  assert.equal(page.$('#reply-bar').hidden, true);
  page.input('#message-input', 'Черновик для дизайна');
  page.click('[data-folder="tasks"]');
  page.click('[data-task="task-interviews"]');
  page.click('[data-folder="all"]');
  page.click('[data-chat="project"]');
  assert.equal(page.$('#message-input').value, 'Черновик для команды');
  assert.equal(page.$('#reply-bar').hidden, false);
  assert.match(page.$('#reply-text').textContent, /Подготовлю презентацию/);
  page.click('[data-chat="design"]');
  assert.equal(page.$('#message-input').value, 'Черновик для дизайна');
  assert.equal(page.$('#reply-bar').hidden, true);
});

test('Replying to a task source adds the sent reply to that task discussion and leaves unrelated messages out', async t => {
  const page = prototype(t);
  page.click('[data-folder="tasks"]');
  page.click('[data-task="task-presentation"]');
  page.click('.task-thread [data-source-message="project-3"]');
  await page.frame();
  page.rightClick('#messages [data-message="project-3"]');
  page.click('[data-context="reply"]');
  const text = 'Первый вариант готов. Добавил <b>три шага</b> в конец.';
  page.input('#message-input', text);
  page.event('#composer', 'submit');
  assert.equal(page.$('#message-input').value, '');
  assert.equal(page.$('#reply-bar').hidden, true);
  const reply = page.all('#messages .message').at(-1);
  assert(reply.textContent.includes(text));
  assert.equal(reply.querySelector('b'), null);
  assert.match(reply.querySelector('.quote').textContent, /Подготовлю презентацию/);
  assert(reply.querySelector('[data-open-task="task-presentation"]'));
  page.input('#message-input', 'Отдельное сообщение о времени встречи.');
  page.event('#composer', 'submit');
  page.click('[data-folder="tasks"]');
  page.click('[data-task="task-presentation"]');
  assert(page.$('.task-thread').textContent.includes(text));
  assert(!page.$('.task-thread').textContent.includes('Отдельное сообщение о времени встречи.'));
  assert.equal(page.all('.task-thread .message').length, 7);
});

test('New replies to an older task appear under Today while the original conversation date is preserved', async t => {
  const page = prototype(t);
  page.click('[data-chat="nikita"]');
  page.rightClick('#messages [data-message="nikita-1"]');
  page.click('[data-context="create-task"]');
  page.input('#create-title', 'Обсудить фон карточек');
  page.event('#task-create-form', 'submit');
  const taskId = page.$('.task-row.selected').dataset.task;
  assert.deepEqual(page.all('.task-thread .date').map(element => element.textContent), ['23 октября']);
  page.click('#open-task-chat');
  await page.frame();
  for (const text of ['Проверил первый вариант.', 'Добавил второй вариант.']) {
    page.rightClick('#messages [data-message="nikita-1"]');
    page.click('[data-context="reply"]');
    page.input('#message-input', text);
    page.event('#composer', 'submit');
  }
  assert.deepEqual(page.all('#messages .date').map(element => element.textContent), ['23 октября', 'Сегодня']);
  page.click('[data-folder="tasks"]');
  page.click(`[data-task="${taskId}"]`);
  assert.deepEqual(page.all('.task-thread .date').map(element => element.textContent), ['23 октября', 'Сегодня']);
  const latestDate = page.all('.task-thread .date').at(-1);
  assert.match(latestDate.nextElementSibling.textContent, /Проверил первый вариант/);
  assert.equal(page.all('.task-thread .date').length, 2, 'multiple replies reuse the current-day separator');
  assert.equal(page.$('.task-thread-header > span').textContent, `${page.all('.task-thread .message').length} сообщ.`);
});

test('Task edits autosave, update open count and completion filters, and preserve the selected card', async t => {
  const page = prototype(t);
  page.click('[data-folder="tasks"]');
  page.click('[data-task="task-presentation"]');
  page.input('#task-comment', 'Согласовать итог\nДобавить примеры', 'focusout');
  page.input('#task-assignee', 'Ирина', 'change');
  page.input('#task-due', '2026-10-30', 'change');
  page.$('#task-title').textContent = 'Финальная презентация проекта';
  page.event('#task-title', 'focusout');
  page.input('#task-status', 'done', 'change');
  await page.frame();
  assert.equal(page.$('#task-count').textContent, '2');
  assert.equal(page.$('#task-save-state').textContent, 'Сохранено');
  assert.equal(page.$('#task-save-state').hidden, false);
  assert.equal(page.$('#task-title').textContent, 'Финальная презентация проекта');
  assert(page.$('[data-task="task-presentation"]').classList.contains('retained'));
  page.click('[data-task-filter="open"]');
  assert.equal(page.rows().length, 2);
  assert.equal(page.document.querySelector('[data-task="task-presentation"]'), null);
  assert.equal(page.$('#task-title').textContent, 'Финальная презентация проекта', 'the card stays open when its row leaves the filter');
  page.click('[data-task-filter="completed"]');
  assert.equal(page.rows().length, 3);
  page.click('[data-task="task-palette"]');
  page.click('[data-task="task-presentation"]');
  assert.equal(page.$('#task-status').value, 'done');
  assert.equal(page.$('#task-assignee').value, 'Ирина');
  assert.equal(page.$('#task-due').value, '2026-10-30');
  assert.equal(page.$('#task-comment').value, 'Согласовать итог\nДобавить примеры');
  page.click('[data-folder="all"]');
  assert.match(page.$('#messages [data-message="project-3"] .message-task-link').textContent, /Задача выполнена/);
  assert.match(page.$('#messages [data-message="project-3"] .message-task-link').textContent, /Финальная презентация проекта/);
});

test('List checkboxes complete and reopen the exact task without selecting another card, and stay in sync with the status field', t => {
  const page = prototype(t);
  page.click('[data-folder="tasks"]');
  const title = page.$('#task-title').textContent;
  page.click('[data-task-complete="task-header"]');
  assert.equal(page.$('[data-task-complete="task-header"]').checked, true);
  assert.equal(page.$('#task-count').textContent, '2');
  assert.equal(page.$('#task-title').textContent, title, 'completion does not change the open card');
  assert.equal(page.$('#task-status').value, 'in_progress', 'another task was completed');
  assert.match(page.$('[data-task="task-header"]').textContent, /Выполнена/);
  assert.equal(page.$('[data-task-complete="task-header"]').closest('button'), null, 'checkbox is independent of the row button');
  page.click('[data-task-filter="completed"]');
  assert.equal(page.$('[data-task-complete="task-header"]').checked, true);
  page.click('[data-task="task-header"]');
  assert.equal(page.$('#task-status').value, 'done');
  page.click('[data-task-complete="task-header"]');
  assert.equal(page.$('#task-status').value, 'in_progress');
  assert.equal(page.$('#task-count').textContent, '3');
  page.input('#task-status', 'done', 'change');
  assert.equal(page.$('[data-task-complete="task-header"]').checked, true, 'the status field updates the same checkbox');
  page.click('[data-task-filter="open"]');
  assert.equal(page.document.querySelector('[data-task="task-header"]'), null, 'completed task leaves the open filter on explicit filter change');
});

test('Task search filters across titles, sources and assignees and clearing it restores the list', t => {
  const page = prototype(t);
  page.click('[data-folder="tasks"]');
  page.input('#chat-search', 'Дизайн');
  assert.deepEqual(page.rows().map(element => element.dataset.task), ['task-header']);
  page.input('#chat-search', 'София');
  assert.deepEqual(page.rows().map(element => element.dataset.task), ['task-interviews']);
  page.input('#chat-search', 'Такой задачи не существует');
  assert.equal(page.rows().length, 0);
  assert.equal(page.$('#empty-list').hidden, false);
  assert.equal(page.$('#empty-list').textContent, 'Задачи не найдены');
  page.click('#clear-search');
  assert.equal(page.rows().length, 3);
});

test('Narrow startup shows the list until a chat or task is selected, while wide startup opens the project chat', t => {
  const narrow = prototype(t, { width: 532 });
  assert(!narrow.$('.telegram-window').classList.contains('chat-open'));
  narrow.click('[data-chat="project"]');
  assert(narrow.$('.telegram-window').classList.contains('chat-open'));
  narrow.click('#conversation [data-action="back"]');
  assert(!narrow.$('.telegram-window').classList.contains('chat-open'));
  narrow.click('[data-folder="tasks"]');
  assert(!narrow.$('.telegram-window').classList.contains('chat-open'));
  narrow.click('[data-task="task-header"]');
  assert(narrow.$('.telegram-window').classList.contains('chat-open'));
  assert.equal(narrow.$('#task-title').textContent, 'Обновить шапку экрана');
  const backButton = narrow.$('#task-panel .task-back-button');
  assert.equal(narrow.$('#task-panel .task-panel-caption').closest('button'), backButton);
  assert.equal(backButton.querySelector('button'), null, 'the caption and arrow belong to one button');
  narrow.click('#task-panel .task-back-button .task-panel-caption');
  assert(!narrow.$('.telegram-window').classList.contains('chat-open'));
  assert.equal(narrow.$('[data-folder="tasks"]').getAttribute('aria-selected'), 'true');
  narrow.click('[data-task="task-header"]');
  backButton.click();
  assert(!narrow.$('.telegram-window').classList.contains('chat-open'), 'the full header button returns to the task list');
  const wide = prototype(t, { width: 1280 });
  assert(wide.$('.telegram-window').classList.contains('chat-open'));
  assert.equal(wide.$('#chat-title').textContent, 'Команда проекта');
});
