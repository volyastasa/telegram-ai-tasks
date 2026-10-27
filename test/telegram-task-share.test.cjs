'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM, VirtualConsole } = require('jsdom');

const prototypeDirectory = path.resolve(__dirname, '../src');
const read = name => fs.readFileSync(path.join(prototypeDirectory, name), 'utf8');

function prototype(t, { mutateDemo } = {}) {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => errors.push(error));
  // Outside-only never loads scripts, images or other network resources.
  const dom = new JSDOM(read('index.html'), {
    url: 'https://tasks.example.test/',
    runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole,
  });
  const { window } = dom;
  Object.defineProperty(window, 'innerWidth', { value: 1280, configurable: true });
  window.Element.prototype.scrollIntoView = function () {};
  window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  window.HTMLDialogElement.prototype.close = function () {
    this.open = false;
    this.dispatchEvent(new window.Event('close'));
  };
  window.fetch = () => assert.fail('Sharing a prototype task must not make a network request');
  window.localStorage.setItem('tasks.language', 'ru');
  for (const name of ['i18n.js', 'demo-data.js']) window.eval(read(name));
  if (mutateDemo) mutateDemo(window.TelegramDemo);
  for (const name of ['demo-i18n.js', 'interface-i18n.js', 'prototype.js']) window.eval(read(name));
  t.after(() => {
    dom.window.close();
    assert.deepEqual(errors, [], 'browser execution has no uncaught errors');
  });
  const document = window.document;
  const $ = selector => {
    const element = document.querySelector(selector);
    assert(element, `Missing interface element: ${selector}`);
    return element;
  };
  const all = selector => [...document.querySelectorAll(selector)];
  const click = selector => $(selector).click();
  const event = (selector, type) => $(selector).dispatchEvent(new window.Event(type, { bubbles: true, cancelable: true }));
  const input = (selector, value, type = 'input') => { $(selector).value = value; event(selector, type); };
  const openTask = id => { click('[data-folder="tasks"]'); click(`[data-task="${id}"]`); };
  const openChat = id => { click('[data-folder="all"]'); click(`[data-chat="${id}"]`); };
  const share = id => { openTask(id); click('#share-task'); };
  const submit = () => event('#task-share-form', 'submit');
  const cards = () => all('#messages .shared-task-card');
  return { window, document, $, all, click, event, input, openTask, openChat, share, submit, cards };
}

test('Sharing defaults to the identified task assignee from the source chat and sends an openable card', t => {
  const page = prototype(t);
  page.share('task-header');
  assert.equal(page.$('#detail-dialog').open, true);
  assert.equal(page.$('#task-share-form input[name="recipient"]:checked').value, 'nikita');
  assert.deepEqual(page.all('#task-share-form input[name="recipient"]').map(input => input.value).sort(), ['irina', 'nikita', 'self']);
  assert.equal(page.$('#share-comment').value, '');
  page.submit();
  assert.equal(page.$('#detail-dialog').open, false);
  page.openChat('nikita');
  assert.equal(page.cards().length, 1);
  const card = page.$('#messages .shared-task-card[data-open-task="task-header"]');
  assert.match(card.textContent, /Обновить шапку экрана/);
  assert(card.closest('.message').classList.contains('outgoing'));
  assert.equal(page.$('#task-count').textContent, '3', 'sharing does not create another task');
  card.click();
  assert.equal(page.$('#task-title').textContent, 'Обновить шапку экрана');
  assert.deepEqual(page.all('.task-thread [data-message]').map(message => message.dataset.message), ['design-4', 'design-5', 'design-6']);
});

test('A task assigned to self defaults to self and is shared into Saved Messages', t => {
  const page = prototype(t);
  page.share('task-presentation');
  assert.equal(page.$('#task-share-form input[name="recipient"]:checked').value, 'self');
  page.submit();
  page.openChat('saved');
  assert.equal(page.cards().length, 1);
  assert.match(page.$('#messages .shared-task-card[data-open-task="task-presentation"]').textContent, /Подготовить презентацию проекта/);
  assert.equal(page.all('.chat-row').length, 8, 'Saved Messages is reused');
});

test('The context menu of a shared card opens its original task instead of creating a duplicate', t => {
  const page = prototype(t);
  page.share('task-header');
  page.submit();
  page.openChat('nikita');
  const message = page.$('#messages .shared-task-card[data-open-task="task-header"]').closest('.message');
  message.querySelector('[data-message-menu]').click();
  assert.equal(page.$('#context-menu').hidden, false);
  assert.equal(page.document.querySelector('[data-context="create-task"]'), null);
  page.click('[data-context="open-task"]');
  assert.equal(page.$('#task-title').textContent, 'Обновить шапку экрана');
  assert.equal(page.$('.task-row.selected').dataset.task, 'task-header');
  assert.equal(page.$('#task-count').textContent, '3');
  assert.deepEqual(page.all('.task-thread [data-message]').map(message => message.dataset.message), ['design-4', 'design-5', 'design-6']);
});

test('Cancelling sharing creates no personal chat, no shared card and leaves task data unchanged', t => {
  const page = prototype(t);
  page.share('task-interviews');
  page.input('#share-comment', 'Черновик без отправки');
  page.click('#close-dialog');
  assert.equal(page.$('#detail-dialog').open, false);
  assert.equal(page.document.querySelector('[data-chat="dm-sofia"]'), null);
  assert.equal(page.$('#task-title').textContent, 'Собрать выводы из интервью');
  assert.equal(page.$('#task-assignee').value, 'София');
  assert.equal(page.$('#task-count').textContent, '3');
  page.openChat('saved');
  assert.equal(page.cards().length, 0);
  page.share('task-interviews');
  assert.equal(page.$('#share-comment').value, '', 'a cancelled share note is not reused');
});

test('An unassigned task requires an explicit recipient before it can be shared', t => {
  const page = prototype(t, { mutateDemo(demo) {
    const task = demo.tasks.find(task => task.id === 'task-header');
    task.assignee = '';
    task.assigneePersonId = null;
  } });
  page.share('task-header');
  assert.equal(page.all('#task-share-form input[name="recipient"]:checked').length, 0);
  page.submit();
  assert.equal(page.$('#detail-dialog').open, true, 'a missing recipient must not silently send a card');
  page.click('#task-share-form input[name="recipient"][value="nikita"]');
  page.submit();
  assert.equal(page.$('#detail-dialog').open, false);
  page.openChat('nikita');
  assert.equal(page.cards().length, 1);
});

test('A matching display name or an assignee outside the source chat cannot choose the recipient automatically', t => {
  for (const assigneePersonId of [null, 'mark']) {
    const page = prototype(t, { mutateDemo(demo) {
      const task = demo.tasks.find(task => task.id === 'task-header');
      task.assignee = 'Никита';
      task.assigneePersonId = assigneePersonId;
    } });
    page.share('task-header');
    assert.equal(page.all('#task-share-form input[name="recipient"]:checked').length, 0);
    assert.equal(page.document.querySelector('#task-share-form input[name="recipient"][value="mark"]'), null);
    page.submit();
    assert.equal(page.$('#detail-dialog').open, true);
  }
});

test('An explicitly chosen source-chat participant overrides the default task assignee', t => {
  const page = prototype(t);
  page.share('task-header');
  page.click('#task-share-form input[name="recipient"][value="irina"]');
  assert.equal(page.$('#task-share-form input[name="recipient"]:checked').value, 'irina');
  page.submit();
  page.openChat('irina');
  assert.equal(page.cards().length, 1);
  assert(page.$('#messages .shared-task-card[data-open-task="task-header"]'));
  page.openChat('nikita');
  assert.equal(page.cards().length, 0, 'the default recipient does not also receive the card');
  page.openTask('task-header');
  assert.equal(page.$('#task-assignee').value, 'Никита', 'sharing does not reassign the task');
});

test('Sharing to a participant without a personal chat creates one chat and reuses it on subsequent shares', t => {
  const page = prototype(t);
  assert.equal(page.document.querySelector('[data-chat="dm-sofia"]'), null);
  for (let attempt = 0; attempt < 2; attempt++) {
    page.share('task-interviews');
    assert.equal(page.$('#task-share-form input[name="recipient"]:checked').value, 'sofia');
    page.submit();
    page.openChat('dm-sofia');
    assert.equal(page.cards().length, attempt + 1);
    assert.equal(page.all('[data-chat="dm-sofia"]').length, 1);
    assert.equal(page.all('.chat-row').length, 9);
    assert(page.cards().every(card => card.dataset.openTask === 'task-interviews'));
  }
  page.openChat('research');
  assert.equal(page.cards().length, 0, 'sharing does not add messages to the source group');
});

test('A shared task includes only the explicit share note and excludes private comments and source correspondence', t => {
  const privateComment = 'Личная заметка: не передавать внутреннюю оценку';
  let sourceTexts;
  const page = prototype(t, { mutateDemo(demo) {
    const task = demo.tasks.find(task => task.id === 'task-header');
    task.comment = privateComment;
    sourceTexts = demo.histories.design.filter(message => task.messageIds.includes(message.id)).map(message => message.text);
  } });
  page.share('task-header');
  assert(!page.$('#task-share-form').textContent.includes(privateComment));
  for (const text of sourceTexts) assert(!page.$('#task-share-form').textContent.includes(text));
  const note = 'Посмотри, пожалуйста, <b>новый вариант</b> до встречи.';
  page.input('#share-comment', note);
  page.submit();
  page.openChat('nikita');
  const message = page.$('#messages .shared-task-card').closest('.message');
  assert(message.textContent.includes(note));
  assert.equal(message.querySelector('b'), null, 'share notes are rendered as plain text');
  assert(!message.textContent.includes(privateComment));
  for (const text of sourceTexts) assert(!message.textContent.includes(text));
  assert.equal(message.querySelector('.quote'), null, 'the source thread is not forwarded');
  page.openTask('task-header');
  assert.equal(page.$('#task-comment').value, privateComment, 'the task keeps its private local note');
  assert.equal(page.all('.task-thread [data-message]').length, 3);
});

test('Changing the selected task while the dialog is open shares the original task snapshot', t => {
  const page = prototype(t);
  page.share('task-header');
  page.input('#share-comment', 'Именно эта задача');
  page.click('[data-task="task-interviews"]');
  assert.equal(page.$('#task-title').textContent, 'Собрать выводы из интервью');
  assert.equal(page.$('#detail-dialog').open, true);
  assert.equal(page.$('#task-share-form input[name="recipient"]:checked').value, 'nikita');
  page.submit();
  page.openChat('nikita');
  assert.equal(page.cards().length, 1);
  const card = page.$('#messages .shared-task-card[data-open-task="task-header"]');
  assert.match(card.textContent, /Обновить шапку экрана/);
  assert.doesNotMatch(card.textContent, /Собрать выводы из интервью/);
  assert.equal(page.document.querySelector('[data-chat="dm-sofia"]'), null);
});

test('Changing a task assignee preserves person identity alongside the display-name select value', t => {
  const page = prototype(t);
  page.openTask('task-header');
  const option = page.$('#task-assignee option[value="Ирина"]');
  assert.equal(option.dataset.personId, 'irina');
  page.input('#task-assignee', 'Ирина', 'change');
  page.openTask('task-presentation');
  page.openTask('task-header');
  assert.equal(page.$('#task-assignee').value, 'Ирина');
  assert.equal(page.$('#task-assignee option:checked').dataset.personId, 'irina');
  page.click('#share-task');
  assert.equal(page.$('#task-share-form input[name="recipient"]:checked').value, 'irina');
});
