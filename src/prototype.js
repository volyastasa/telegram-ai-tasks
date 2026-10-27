'use strict';

(() => {
  // Synthetic, in-memory prototype. No personal source assets are bundled.
  // No Telegram session, API, storage, model or network is connected here.
  const $ = id => document.getElementById(id);
  const i18n = window.TasksI18n;
  const t = source => i18n ? i18n.t(source) : String(source ?? '');
  const ui = markup => i18n ? i18n.html(markup) : markup;
  const locale = () => i18n?.locale || 'ru-RU';
  const icons = {
    search:'<circle cx="10.5" cy="10.5" r="7.5"/><path d="m16 16 6 6"/>',
    shield:'<path d="m12 2 9 4v7c0 5-9 9-9 9S3 18 3 13V6l9-4Z"/><path d="M12 6v6m-4-4a6 6 0 1 0 8 0"/>',
    compose:'<path d="M21 11v10H3V3h10m3 0 5 5M9 15l2-6 8-8 4 4-8 8-6 2Z"/>',
    task:'<rect x="3" y="3" width="18" height="18" rx="5"/><path d="m7 12 3 3 7-7"/>',
    spark:'<path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z"/>',
    chevron:'<path d="m9 5 7 7-7 7"/>', back:'<path d="m15 4-8 8 8 8"/>',
    phone:'<path d="M8 3 5 2C1 2 2 8 5 13s9 10 13 8l3-3-6-5-3 3c-3-2-5-4-6-7l3-2-1-4Z"/>',
    more:'<circle cx="4" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="20" cy="12" r="1.5" fill="currentColor"/>',
    person:'<circle cx="12" cy="12" r="10" fill="currentColor" stroke="none"/><circle cx="12" cy="8" r="3" fill="#18232e" stroke="none"/><path d="M5.5 19c0-6.5 13-6.5 13 0" fill="#18232e" stroke="none"/>',
    chats:'<path d="M2 11a9 9 0 1 1 5 8l-6 3 2-6a9 9 0 0 1-1-5Z"/><path d="M16 4c9 3 9 12 5 15l2 4-6-2-4 1"/>',
    settings:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4.5"/><path d="M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2M7.5 1.5l1 3m7 15 1 3m-15-6 3-1m15-7 3-1m-21 0 3 1m15 7 3 1m-15 6 1-3m7-15 1-3"/>',
    clip:'<path d="m8 16 9-9a3 3 0 0 0-4-4L3 13a6 6 0 0 0 8 8L22 10M7 13l8-8"/>',
    smile:'<circle cx="12" cy="12" r="10"/><ellipse cx="8.5" cy="8" rx=".7" ry="1.5" fill="currentColor"/><ellipse cx="15.5" cy="8" rx=".7" ry="1.5" fill="currentColor"/><path d="M6 14c3 1 9 1 12 0-2 7-10 7-12 0Z"/>',
    mic:'<rect x="8" y="2" width="8" height="14" rx="4"/><path d="M4 10v2a8 8 0 0 0 16 0v-2m-8 10v3"/>',
    send:'<path d="m3 11 18-9-7 20-3-8-8-3Z" fill="currentColor"/><path d="m11 14 10-12" stroke="#28a5f5"/>',
    muted:'<path d="M8 18h9V9a5 5 0 0 0-8-4M5 17l-2 2M3 21 21 3M11 21h3"/>',
    pin:'<path d="m15 2 7 7-5 1-4 6-3-2-6 7 5-8-3-3 6-4 3-4Z"/>',
    reply:'<path d="m9 5-7 7 7 7m-7-7h12a7 7 0 0 1 7 7"/>',
    file:'<path d="M5 2h9l5 5v15H5V2Zm9 0v6h5"/>',
    share:'<path d="M12 16V2m-5 5 5-5 5 5M5 10H3v12h18V10h-2"/>',
  };
  const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.more}</svg>`;
  const esc = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const demo = JSON.parse(JSON.stringify(window.TelegramDemo));
  const chats = demo.chats, history = new Map(Object.entries(demo.histories)), tasks = demo.tasks, people = demo.people;
  const shell = document.querySelector('.telegram-window');
  let selected = 'project', folder = 'all', reply = null, toastTimer = null;
  let selectedTask = tasks[0]?.id || null, taskFilter = 'open', retainedTask = null;
  let menuContext = null, menuAnchor = null, createContext = null, shareContext = null, dialogSnapshot = null, messageSequence = 0, taskSequence = 0;
  const drafts = new Map(), replies = new Map();
  const userTaskFields = new Map();
  const taskText = (task, field) => userTaskFields.get(task.id)?.has(field) ? String(task[field] || '') : t(task[field] || '');
  const userField = (task, field) => userTaskFields.get(task.id)?.has(field) ? ' data-i18n-ignore' : '';
  const protectedText = (text, user = false) => user ? `<span data-i18n-ignore>${esc(text)}</span>` : esc(text);
  const searchable = (...values) => values.flatMap(value => [String(value || ''),t(value || '')]).join(' ').toLocaleLowerCase(locale());
  const chatById = id => chats.find(chat => chat.id === id);
  const taskById = id => tasks.find(task => task.id === id);
  const personById = id => people.find(person => person.id === id);
  const current = () => chatById(selected);
  const messageById = (chatId, id) => history.get(chatId)?.find(message => message.id === id && message.kind !== 'date');
  const taskForMessage = (chatId, messageId) => taskById(messageById(chatId,messageId)?.sharedTask?.id) || tasks.find(task => task.chatId === chatId && task.messageIds.includes(messageId));
  const sourceMessageId = task => task.sourceMessageId || task.messageIds[0];
  const avatar = person => {
    const initials = i18n?.language === 'en'
      ? person.id === 'self' ? 'Me' : t(person.name).split(/\s+/).slice(0,person.initials?.length || 1).map(word => word[0]).join('').toUpperCase()
      : person.initials || person.name.slice(0,1);
    return `<span class="avatar ${esc(person.color || '')}">${esc(initials)}</span>`;
  };
  const localTime = () => new Intl.DateTimeFormat(locale(),{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'Asia/Yekaterinburg'}).format(new Date());
  const shortDate = value => value ? new Intl.DateTimeFormat(locale(),{day:'numeric',month:'short',timeZone:'Asia/Yekaterinburg'}).format(new Date(`${value}T12:00:00+05:00`)) : t('Без срока');
  const statusLabel = task => t(task.status === 'done' ? 'Выполнена' : 'В работе');
  const authorOf = (message, chatId) => message.out ? 'Вы' : message.author || chatById(chatId).name;
  function toast(text) {
    clearTimeout(toastTimer); $('toast').dataset.source = text; $('toast').textContent = t(text); $('toast').hidden = false;
    toastTimer = setTimeout(() => { $('toast').hidden = true; }, 3600);
  }
  function paintIcons(root = document) { root.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = icon(el.dataset.icon); }); }
  function renderStories() {
    $('stories').innerHTML = ui(demo.stories.map((story,index) => `<button class="story" data-story="${index}" aria-label="История: ${esc(story.name)}">${avatar(story)}<span class="story-name">${esc(story.name)}</span></button>`).join(''));
  }
  function renderSidebar() {
    const isTasks = folder === 'tasks';
    shell.classList.toggle('tasks-mode', isTasks);
    $('chat-list').hidden = isTasks; $('task-list').hidden = !isTasks; $('task-filters').hidden = !isTasks;
    $('conversation').hidden = isTasks; $('task-panel').hidden = !isTasks;
    $('chat-search').placeholder = t(isTasks ? 'Поиск задач (⌘K)' : 'Поиск (⌘K)');
    $('chat-search').setAttribute('aria-label', t(isTasks ? 'Поиск задач' : 'Поиск чатов'));
    $('task-count').textContent = tasks.filter(task => task.status === 'in_progress').length;
    const query = $('chat-search').value.trim().toLocaleLowerCase(locale());
    $('clear-search').hidden = !query;
    document.querySelectorAll('[data-folder]').forEach(button => {
      button.setAttribute('aria-selected',String(button.dataset.folder === folder));
      button.tabIndex = button.dataset.folder === folder ? 0 : -1;
    });
    if (isTasks) { renderTaskList(query); return; }
    const visible = chats.filter(chat => (folder === 'all' || chat.unread) && (!query || searchable(chat.name,chat.preview,chat.author).includes(query))).sort((a,b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)));
    $('chat-list').innerHTML = ui(visible.map(chat => `<div class="chat-item"><button class="chat-row${selected === chat.id ? ' selected' : ''}" data-chat="${chat.id}" aria-pressed="${selected === chat.id}" aria-haspopup="menu">${avatar(chat)}<span class="chat-body"><span class="chat-line"><span class="chat-name">${esc(chat.name)}</span>${chat.muted ? `<span class="muted-icon">${icon('muted')}</span>` : ''}<span class="chat-time">${chat.read ? '<span class="read-check">✓✓</span> ' : ''}${esc(chat.time)}</span></span><span class="chat-preview">${chat.author ? `<span class="chat-author">${esc(chat.author)}</span>` : ''}${chat.sharedPreview ? `Задача: ${protectedText(chat.sharedPreview.title,chat.sharedPreview.userTitle)}` : protectedText(chat.preview,chat.previewUser)}</span></span>${chat.pinned ? `<span class="chat-pin">${icon('pin')}</span>` : chat.unread ? `<span class="unread-badge">${chat.unread}</span>` : ''}</button><button class="chat-menu-trigger icon-button" data-chat-menu="${chat.id}" aria-label="Действия с чатом ${esc(chat.name)}" aria-haspopup="menu">${icon('more')}</button></div>`).join(''));
    $('empty-list').hidden = Boolean(visible.length);
    $('empty-list').textContent = t(query ? 'Чаты не найдены' : 'Нет новых сообщений');
  }
  function matchesFilter(task) { return taskFilter === 'all' || task.status === (taskFilter === 'completed' ? 'done' : 'in_progress'); }
  function renderTaskList(query = '') {
    document.querySelectorAll('[data-task-filter]').forEach(button => button.setAttribute('aria-pressed',String(button.dataset.taskFilter === taskFilter)));
    const visible = tasks.filter(task => (matchesFilter(task) || task.id === retainedTask) && (!query || searchable(task.title,chatById(task.chatId).name,task.assignee).includes(query)));
    $('task-list').innerHTML = ui(visible.map(task => `<div class="task-item"><label class="task-checkbox-hit"><input type="checkbox" class="task-checkbox" data-task-complete="${esc(task.id)}" aria-label="${esc(`${t('Выполнена:')} ${taskText(task,'title')}`)}"${task.status === 'done' ? ' checked' : ''}></label><button class="task-row${selectedTask === task.id ? ' selected' : ''}${!matchesFilter(task) ? ' retained' : ''}" data-task="${esc(task.id)}" aria-pressed="${selectedTask === task.id}"><span class="task-row-top"><span class="task-row-title"${userField(task,'title')}>${esc(task.title)}</span></span><span class="task-row-source">${esc(chatById(task.chatId).name)}</span><span class="task-row-meta"><span>${esc(task.assignee || 'Не назначен')}</span><time${task.due ? ` datetime="${esc(task.due)}"` : ''}>${task.status === 'done' ? 'Выполнена' : shortDate(task.due)}</time></span>${!matchesFilter(task) ? `<span class="task-retained-result">${statusLabel(task)}</span>` : ''}</button></div>`).join(''));
    $('empty-list').hidden = Boolean(visible.length);
    $('empty-list').textContent = t(query ? 'Задачи не найдены' : taskFilter === 'completed' ? 'Завершённых задач пока нет' : 'В этой выборке пока нет задач');
  }
  function taskBadge(task, primary = true) {
    return `<button class="message-task-link" data-open-task="${esc(task.id)}" aria-label="${esc(`${t('Открыть задачу:')} ${taskText(task,'title')}`)}">${icon('task')}<span><small>${task.status === 'done' ? 'Задача выполнена' : primary ? 'Задача создана' : 'Обсуждение задачи'}</small><span${userField(task,'title')}>${esc(task.title)}</span></span>${icon('chevron')}</button>`;
  }
  function sharedTaskMarkup(message) {
    const shared = message.sharedTask;
    return `${message.text ? `<p${message.userText ? ' data-i18n-ignore' : ''}>${esc(message.text)}</p>` : ''}<button class="shared-task-card" data-open-task="${esc(shared.id)}" aria-label="${esc(`${t('Открыть задачу:')} ${shared.userTitle ? shared.title : t(shared.title)}`)}"><span class="shared-task-icon">${icon('task')}</span><span><small>Задача · ${esc(shared.sourceTitle)}</small><strong${shared.userTitle ? ' data-i18n-ignore' : ''}>${esc(shared.title)}</strong><span>${esc(shared.assignee || 'Не назначен')} · ${statusLabel(shared)} · ${shortDate(shared.due)}</span></span>${icon('chevron')}</button>`;
  }
  function messageMarkup(message, chatId = selected, evidence = false, task = null) {
    if (message.kind === 'date') return `<div class="date">${esc(message.text)}</div>`;
    const linked = taskForMessage(chatId,message.id);
    const showBadge = linked && (sourceMessageId(linked) === message.id || linked.messageIds.at(-1) === message.id);
    const meta = `<span class="message-meta">${esc(message.time)}${message.out ? `<span class="checks">${message.read ? '✓✓' : '✓'}</span>` : ''}</span>`;
    const quote = message.quote ? `<div class="quote"><strong>${esc(message.quote.name)}</strong><p${message.quote.userText ? ' data-i18n-ignore' : ''}>${esc(message.quote.text)}</p></div>` : '';
    const file = message.kind === 'task-share' ? `${sharedTaskMarkup(message)}${meta}` : message.kind === 'file' ? `<button class="attachment-card" data-action="file"><span class="attachment-icon">${icon('file')}</span><span class="attachment-info"><strong>${esc(message.text)}</strong><small>PDF · Демонстрационный документ</small></span></button>` : `<p${message.userText ? ' data-i18n-ignore' : ''}>${esc(message.text)}${meta}</p>`;
    return `<article class="message${message.out ? ' outgoing' : ''}" data-message="${esc(message.id)}" data-message-chat="${esc(chatId)}" tabindex="0" aria-label="${esc(t(authorOf(message,chatId)))}, ${esc(message.time)}">${evidence ? `<span class="task-source-author">${esc(authorOf(message,chatId))}</span>` : !message.out && message.author ? `<span class="task-source-author">${esc(message.author)}</span>` : ''}${quote}${file}${message.kind === 'file' ? meta : ''}${!evidence && showBadge ? taskBadge(linked,sourceMessageId(linked) === message.id) : ''}${evidence ? `<button class="source-jump" data-source-chat="${esc(chatId)}" data-source-message="${esc(message.id)}">К сообщению в чате ${icon('chevron')}</button>` : `<button class="message-menu-trigger icon-button" data-message-menu="${esc(message.id)}" aria-label="Действия с сообщением" aria-haspopup="menu">${icon('more')}</button>`}</article>`;
  }
  function renderMessages(scroll = true) {
    const before = $('messages').scrollTop;
    $('messages').innerHTML = ui(history.get(selected).map(message => messageMarkup(message)).join(''));
    filterMessages();
    requestAnimationFrame(() => { $('messages').scrollTop = scroll ? $('messages').scrollHeight : before; });
  }
  function rememberDraft() { drafts.set(selected,$('message-input').value); replies.set(selected,reply); }
  function selectChat(id, { reveal = true, resetFolder = false } = {}) {
    if (!chatById(id)) return;
    rememberDraft(); selected = id; reply = replies.get(id) || null;
    if (folder === 'tasks' || resetFolder) { folder = 'all'; $('chat-search').value = ''; }
    const chat = current(); chat.unread = 0;
    $('chat-title').textContent = t(chat.name); $('chat-status').textContent = t(chat.status);
    $('header-avatar').innerHTML = ui(avatar(chat)); $('profile-button').setAttribute('aria-label',t(`Открыть профиль: ${chat.name}`));
    $('message-input').value = drafts.get(id) || '';
    $('message-search-form').hidden = true; $('message-search').value = '';
    shell.classList.toggle('chat-open',reveal);
    hideMenus(); updateComposer(); renderReply(); renderSidebar(); renderMessages();
  }
  function changeFolder(next) {
    hideMenus(); rememberDraft(); folder = next; retainedTask = null; $('chat-search').value = '';
    shell.classList.remove('chat-open'); renderSidebar();
    if (folder === 'tasks') { if (!selectedTask && tasks.length) selectedTask = tasks[0].id; renderTaskDetail(); }
  }
  function openTask(id, { fromMessage = false, focus = true } = {}) {
    const task = taskById(id); if (!task) return;
    rememberDraft(); hideMenus(); folder = 'tasks'; selectedTask = id;
    if (fromMessage) { $('chat-search').value = ''; retainedTask = null; taskFilter = task.status === 'done' ? 'completed' : 'open'; }
    renderSidebar(); renderTaskDetail(); shell.classList.add('chat-open');
    $('task-detail').scrollTop = 0; if (focus) $('task-title')?.focus({preventScroll:true});
  }
  function assigneeOptions(value, personId = null) {
    const known = personById(personId);
    const options = [{id:'',name:'',label:'Не назначен'},...people];
    if (value && !known && !people.some(person => person.name === value)) options.push({id:'',name:value});
    return options.map(person => `<option value="${esc(person.name)}" data-person-id="${esc(person.id)}"${known ? person.id === known.id ? ' selected' : '' : person.name === value ? ' selected' : ''}>${esc(person.label || person.name)}</option>`).join('');
  }
  function renderTaskDetail() {
    const task = taskById(selectedTask); $('open-task-chat').hidden = !task;
    if (!task) { $('task-detail').innerHTML = ui('<p class="empty-list">Выберите задачу из списка слева.</p>'); return; }
    const messages = [], thread = [], messageIds = new Set(task.messageIds);
    let latestDate = null, shownDate = null;
    for (const message of history.get(task.chatId)) {
      if (message.kind === 'date') { latestDate = message; continue; }
      if (!messageIds.has(message.id)) continue;
      if (latestDate && latestDate !== shownDate) { thread.push(latestDate); shownDate = latestDate; }
      messages.push(message); thread.push(message);
    }
    $('task-detail').innerHTML = ui(`<div class="task-detail-heading"><div class="task-heading-meta"><span class="task-origin">${icon('task')} ${esc(chatById(task.chatId).name)}</span><button type="button" class="task-share-button" id="share-task">${icon('share')} Поделиться</button></div><h1 class="task-title" id="task-title" contenteditable="true" role="textbox" aria-label="${esc(t('Название задачи'))}" aria-multiline="true" spellcheck="false"${userField(task,'title')}>${esc(task.title)}</h1></div><label class="task-comment" for="task-comment">Комментарий<textarea id="task-comment" rows="4" maxlength="2000" placeholder="${esc(t('Добавить заметку к задаче'))}"${userField(task,'comment')}>${esc(task.comment || '')}</textarea></label><div class="task-fields"><label>Статус<select id="task-status"><option value="in_progress"${task.status === 'in_progress' ? ' selected' : ''}>В работе</option><option value="done"${task.status === 'done' ? ' selected' : ''}>Выполнена</option></select></label><label>Исполнитель<select id="task-assignee">${assigneeOptions(task.assignee,task.assigneePersonId)}</select></label><label>Срок<input type="date" id="task-due" value="${esc(task.due || '')}"></label></div><p class="task-save-state" id="task-save-state" role="status" hidden></p><div class="task-thread-header"><h2>Переписка по задаче</h2><span>${messages.length} сообщ.</span></div><div class="task-thread">${thread.map(message => messageMarkup(message,task.chatId,true,task)).join('')}</div>`);
    for (const id of ['task-title','task-comment']) {
      const field = $(id); field.dataset.renderedValue = id === 'task-title' ? field.textContent : field.value;
    }
    $('task-panel').setAttribute('aria-label',`${t('Задача:')} ${taskText(task,'title')}`);
  }
  function updateTask(field, value, taskId = selectedTask, assigneePersonId = null) {
    const task = taskById(taskId); if (!task) return;
    const editor = field === 'title' ? $('task-title') : field === 'comment' ? $('task-comment') : null;
    if (editor && editor.dataset.renderedValue === value) return;
    if (field === 'title') { value = value.trim().slice(0,300); if (!value) { $('task-title').textContent = taskText(task,'title'); return; } $('task-title').textContent = value; }
    if (field === 'status' && !['in_progress','done'].includes(value)) return;
    if (field === 'due' && value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) return;
    if (!editor && task[field] === value && (field !== 'assignee' || task.assigneePersonId === assigneePersonId)) return;
    task[field] = value;
    if (editor) {
      if (!userTaskFields.has(taskId)) userTaskFields.set(taskId,new Set());
      userTaskFields.get(taskId).add(field); editor.setAttribute('data-i18n-ignore',''); editor.dataset.renderedValue = value;
    }
    if (field === 'assignee') task.assigneePersonId = assigneePersonId;
    retainedTask = matchesFilter(task) ? null : task.id;
    // Preserve every row node: blur must not remove the next pointer target.
    const row = [...$('task-list').querySelectorAll('[data-task]')].find(element => element.dataset.task === task.id);
    if (row) {
      const title = row.querySelector('.task-row-title'); title.textContent = taskText(task,'title'); title.toggleAttribute('data-i18n-ignore',Boolean(userTaskFields.get(task.id)?.has('title')));
      const checkbox = row.parentElement.querySelector('[data-task-complete]');
      checkbox.checked = task.status === 'done'; checkbox.setAttribute('aria-label',`${t('Выполнена:')} ${taskText(task,'title')}`);
      row.querySelector('.task-row-meta>span').textContent = t(task.assignee || 'Не назначен');
      const due = row.querySelector('time'); due.textContent = task.status === 'done' ? t('Выполнена') : shortDate(task.due);
      if (task.due) due.setAttribute('datetime',task.due); else due.removeAttribute('datetime');
      row.classList.toggle('retained',!matchesFilter(task));
      row.querySelector('.task-retained-result')?.remove();
      if (!matchesFilter(task)) { const result = document.createElement('span'); result.className = 'task-retained-result'; result.textContent = statusLabel(task); row.append(result); }
    }
    $('task-count').textContent = tasks.filter(value => value.status === 'in_progress').length;
    renderMessages(false);
    if (task.id === selectedTask) {
      if (field === 'status' && $('task-status')) $('task-status').value = task.status;
      if ($('task-save-state')) { $('task-save-state').textContent = t('Сохранено'); $('task-save-state').hidden = false; }
      $('task-panel').setAttribute('aria-label',`${t('Задача:')} ${taskText(task,'title')}`);
    }
  }
  function revealSource(chatId, messageId) {
    selectChat(chatId,{resetFolder:true});
    requestAnimationFrame(() => {
      const element = [...$('messages').querySelectorAll('[data-message]')].find(node => node.dataset.message === messageId);
      if (!element) return; element.classList.add('source-highlight'); element.scrollIntoView({block:'center'}); element.focus({preventScroll:true});
      setTimeout(() => element.classList.remove('source-highlight'),2500);
    });
  }
  function updateComposer() {
    const input = $('message-input'), ready = Boolean(input.value.trim());
    input.style.height = '33px'; input.style.height = `${Math.min(130,Math.max(33,input.scrollHeight))}px`;
    $('send-button').innerHTML = ui(icon(ready ? 'send' : 'mic')); $('send-button').classList.toggle('ready',ready);
    $('send-button').setAttribute('aria-label',t(ready ? 'Отправить в прототипе' : 'Голосовое сообщение'));
  }
  function renderReply() { $('reply-bar').hidden = !reply; $('reply-text').toggleAttribute('data-i18n-ignore',Boolean(reply?.userText)); $('reply-text').textContent = reply ? reply.userText ? reply.text : t(reply.text) : ''; }
  function refreshLanguage() {
    const active = document.activeElement;
    const focus = active?.id ? {id:active.id,start:active.selectionStart,end:active.selectionEnd} : null;
    const scrolls = [$('messages'),$('task-detail'),document.querySelector('.chats-scroll')].map(element => [element,element.scrollTop]);
    const saved = Boolean($('task-save-state') && !$('task-save-state').hidden);
    const context = menuContext && {...menuContext}, anchor = menuAnchor;
    const popoverType = !$('popover').hidden ? $('popover').dataset.type : null;
    const task = taskById(selectedTask);
    if (task && $('task-title')) {
      updateTask('title',$('task-title').textContent);
      updateTask('comment',$('task-comment').value);
    }
    rememberDraft();
    const dialogOpen = $('detail-dialog').open;
    const oldShare = shareContext;
    const formValues = dialogOpen ? [...$('dialog-content').querySelectorAll('input,textarea,select')].map(field => ({
      id:field.id,name:field.name,value:field.value,checked:field.checked,
      pristineTitle:field.id === 'create-title' && !createContext?.userTitle && field.value === createContext?.renderedTitle,
    })) : [];
    $('chat-title').textContent = t(current().name); $('chat-status').textContent = t(current().status);
    $('header-avatar').innerHTML = ui(avatar(current())); $('profile-button').setAttribute('aria-label',t(`Открыть профиль: ${current().name}`));
    renderStories(); renderSidebar(); renderMessages(false); renderReply(); updateComposer();
    if (task) {
      renderTaskDetail();
      if (saved) { $('task-save-state').hidden = false; $('task-save-state').textContent = t('Сохранено'); }
    }
    if (dialogOpen && dialogSnapshot) {
      if (oldShare) showTaskShare(oldShare.taskId,oldShare);
      else {
        $('dialog-title').textContent = t(dialogSnapshot.title);
        $('dialog-content').innerHTML = ui(dialogSnapshot.html);
        if (createContext && $('create-title')) createContext.renderedTitle = $('create-title').value;
      }
      for (const value of formValues) {
        const field = value.id ? $(value.id) : [...$('dialog-content').querySelectorAll('input')].find(element => element.name === value.name && element.value === value.value);
        if (!field || value.pristineTitle) continue;
        field.value = value.value;
        if ('checked' in field) field.checked = value.checked;
      }
    } else if (context) {
      const selector = context.type === 'chat' ? anchor?.hasAttribute('data-chat-menu') ? '[data-chat-menu]' : anchor?.id === 'more-button' ? '#more-button' : '[data-chat]' : anchor?.hasAttribute('data-message-menu') ? '[data-message-menu]' : '[data-message]';
      const newAnchor = [...document.querySelectorAll(selector)].find(element => element.id === 'more-button' || (element.dataset.chatMenu || element.dataset.chat) === context.chatId || (element.dataset.messageMenu || element.dataset.message) === context.messageId);
      if (newAnchor) openContext(context,newAnchor);
    } else if (popoverType) {
      $('popover').hidden = true; showPopover(popoverType);
    }
    if (!$('toast').hidden) $('toast').textContent = t($('toast').dataset.source || '');
    if (focus && $(focus.id)) {
      const field = $(focus.id); field.focus({preventScroll:true});
      if (typeof focus.start === 'number' && typeof field.setSelectionRange === 'function' && field.type !== 'date') field.setSelectionRange(focus.start,focus.end);
    }
    const restoreScroll = () => { for (const [element,top] of scrolls) element.scrollTop = top; };
    restoreScroll(); requestAnimationFrame(restoreScroll);
  }
  function appendMessage(text, extra = {}, chatId = selected) {
    const time = localTime(), message = {id:`local-message-${++messageSequence}`,text,time,out:true,authorId:'self',userText:true,...extra};
    const messages = history.get(chatId);
    if (messages.filter(value => value.kind === 'date').at(-1)?.text !== 'Сегодня') messages.push({id:`local-date-${messageSequence}`,kind:'date',text:'Сегодня'});
    messages.push(message); Object.assign(chatById(chatId),{preview:message.sharedTask ? `Задача: ${message.sharedTask.title}` : text,previewUser:message.userText,sharedPreview:message.sharedTask || null,time,author:'Вы',read:false});
    if (message.quote?.messageId) {
      tasks.filter(task => task.chatId === chatId && task.messageIds.includes(message.quote.messageId)).forEach(task => task.messageIds.push(message.id));
    }
    renderSidebar(); renderMessages(); return message;
  }
  function sendMessage(event) {
    event.preventDefault(); const text = $('message-input').value.trim();
    if (!text) { showDialog('Голосовое сообщение','<p>В прототипе доступен текстовый ввод. Запись голоса здесь не подключена.</p>'); return; }
    appendMessage(text,{quote:reply ? {...reply} : null}); $('message-input').value = ''; drafts.delete(selected); replies.delete(selected); reply = null;
    updateComposer(); renderReply(); $('message-input').focus();
  }
  function showDialog(title, html) {
    shareContext = null; dialogSnapshot = {title,html}; hideMenus(); $('dialog-title').textContent = t(title); $('dialog-content').innerHTML = ui(html);
    if (!$('detail-dialog').open) $('detail-dialog').showModal();
  }
  function showProfile() {
    const chat = current();
    showDialog('Информация',`<div class="profile-large">${avatar(chat)}<h3>${esc(chat.name)}</h3><p>${esc(chat.status)}</p></div><button class="dialog-action" data-dialog-action="message">Написать сообщение</button><button class="dialog-action dialog-secondary" data-dialog-action="notifications">${chat.muted ? 'Включить' : 'Выключить'} уведомления</button><p class="demo-note">Все имена, сообщения и истории в этом макете вымышлены.</p>`);
  }
  function showContacts(title = 'Контакты') {
    showDialog(title,chats.map(chat => `<button class="contact-option" data-contact="${chat.id}">${avatar(chat)}<span>${esc(chat.name)}<small>${esc(chat.status)}</small></span></button>`).join(''));
  }
  function showTaskShare(taskId, previous = null) {
    const task = taskById(taskId); if (!task) return;
    const source = chatById(task.chatId);
    const recipients = people.filter(person => source.participantIds.includes(person.id));
    const defaultId = previous ? previous.defaultId : recipients.some(person => person.id === task.assigneePersonId) ? task.assigneePersonId : null;
    recipients.sort((a,b) => Number(b.id === defaultId) - Number(a.id === defaultId));
    const sharedTask = previous?.sharedTask || {id:task.id,title:task.title,assignee:task.assignee,status:task.status,due:task.due,sourceTitle:source.name,userTitle:Boolean(userTaskFields.get(task.id)?.has('title'))};
    showDialog('Поделиться задачей',`<form class="task-share-form" id="task-share-form"><p class="task-share-intro">${defaultId ? 'По умолчанию выбран исполнитель задачи.' : 'Выберите получателя из участников исходного чата.'}</p><h3 id="share-recipient-label">Кому отправить</h3><div class="task-share-recipients" role="radiogroup" aria-labelledby="share-recipient-label">${recipients.map(person => `<label class="share-recipient${person.id === defaultId ? ' is-default' : ''}"><input type="radio" name="recipient" value="${esc(person.id)}" required${person.id === defaultId ? ' checked' : ''}>${avatar(person)}<span class="share-recipient-text"><strong>${esc(person.id === 'self' ? 'Вы · Избранное' : person.name)}</strong><small>${person.id === defaultId ? 'Исполнитель задачи' : 'Участник чата'}</small></span></label>`).join('')}</div><div class="task-share-preview"><small>Предпросмотр сообщения</small><strong class="task-share-title"${sharedTask.userTitle ? ' data-i18n-ignore' : ''}>${esc(sharedTask.title)}</strong><p class="task-share-summary">Исполнитель: ${esc(sharedTask.assignee || 'Не назначен')} · ${statusLabel(sharedTask)}<br>Срок: ${shortDate(sharedTask.due)}</p><span class="task-share-source">Из чата «${esc(source.name)}»</span></div><label class="task-share-comment" for="share-comment">Сообщение получателю<textarea id="share-comment" rows="2" maxlength="1000" placeholder="Добавить сообщение (необязательно)"></textarea></label><p class="task-share-note">Демонстрационная отправка в макете.</p><div class="dialog-form-actions"><button type="button" class="dialog-action dialog-secondary" data-dialog-action="close">Отмена</button><button class="dialog-action" type="submit">${icon('send')} Отправить</button></div></form>`);
    // Capture the source, recipient IDs and visible task fields at opening.
    shareContext = {taskId,sourceChatId:source.id,recipientIds:recipients.map(person => person.id),sharedTask,defaultId};
  }
  function directChatFor(person) {
    const existing = chatById(person.directChatId);
    if (existing) return existing;
    const id = `dm-${person.id}`;
    let chat = chatById(id);
    if (!chat) {
      chat = {id,name:person.name,initials:person.initials,color:person.color,participantIds:['self',person.id],status:'был недавно',preview:'',time:''};
      chats.push(chat); history.set(id,[{id:`${id}-date`,kind:'date',text:'Сегодня'}]);
    }
    person.directChatId = id; return chat;
  }
  function submitTaskShare(event) {
    if (event.target.id !== 'task-share-form') return; event.preventDefault();
    const context = shareContext; if (!context) return;
    const recipientId = event.target.querySelector('input[name="recipient"]:checked')?.value;
    const person = personById(recipientId);
    if (!person || !context.recipientIds.includes(recipientId) || !chatById(context.sourceChatId)?.participantIds.includes(recipientId)) {
      event.target.reportValidity(); return;
    }
    const note = $('share-comment').value.trim().slice(0,1000);
    shareContext = null; event.target.querySelector('[type="submit"]').disabled = true;
    const recipientChat = directChatFor(person);
    appendMessage(note,{kind:'task-share',sharedTask:context.sharedTask},recipientChat.id);
    $('detail-dialog').close(); selectChat(recipientChat.id,{resetFolder:true});
    toast(person.id === 'self' ? 'Задача добавлена в Избранное в макете' : `Задача отправлена: ${person.name} · в макете`);
  }
  function hideMenus({restoreFocus = false} = {}) {
    const anchor = menuAnchor; $('popover').hidden = true; $('context-menu').hidden = true; $('more-button').setAttribute('aria-expanded','false'); menuContext = null; menuAnchor = null;
    if (restoreFocus && anchor?.isConnected) anchor.focus();
  }
  function positionMenu(event, anchor) {
    const menu = $('context-menu'), rect = anchor.getBoundingClientRect();
    const pointer = event && event.type === 'contextmenu' && (event.clientX || event.clientY);
    const screen = document.body.classList.contains('preview-phone') ? $('device-screen')?.getBoundingClientRect() : null;
    const edge = screen ? {left:Math.max(8,screen.left+5),right:Math.min(window.innerWidth-8,screen.right-5),top:Math.max(8,screen.top+45),bottom:Math.min(window.innerHeight-8,screen.bottom-20)} : {left:8,right:window.innerWidth-8,top:8,bottom:window.innerHeight-8};
    menu.style.maxWidth = `${Math.max(180,edge.right-edge.left)}px`;
    menu.style.left = '0px'; menu.style.top = '0px';
    const bounds = menu.getBoundingClientRect();
    menu.style.left = `${Math.max(edge.left,Math.min(pointer ? event.clientX : rect.right-bounds.width,edge.right-bounds.width))}px`;
    menu.style.top = `${Math.max(edge.top,Math.min(pointer ? event.clientY : rect.bottom+4,edge.bottom-bounds.height))}px`;
  }
  function openContext(context, anchor, event) {
    hideMenus(); menuContext = context; menuAnchor = anchor;
    const menu = $('context-menu');
    if (context.type === 'chat') {
      const chat = chatById(context.chatId);
      menu.innerHTML = ui(`<button role="menuitem" class="task-command" data-context="analyze">${icon('spark')}<span>Анализировать задачи</span><span class="new-badge">Новое</span></button><button role="menuitem" data-context="open-chat">${icon('chats')} Открыть чат</button><button role="menuitem" data-context="pin">${icon('pin')} ${chat.pinned ? 'Открепить' : 'Закрепить'}</button><button role="menuitem" data-context="mute">${icon('muted')} ${chat.muted ? 'Включить' : 'Выключить'} уведомления</button>`);
    } else {
      const linked = taskForMessage(context.chatId,context.messageId);
      menu.innerHTML = ui(`<button role="menuitem" data-context="reply">${icon('reply')} Ответить</button><button role="menuitem" class="task-command" data-context="${linked ? 'open-task' : 'create-task'}">${icon('task')}<span>${linked ? 'Открыть задачу' : 'Создать задачу'}</span>${linked ? '' : '<span class="new-badge">Новое</span>'}</button>`);
    }
    menu.hidden = false; positionMenu(event,anchor); menu.querySelector('button').focus();
  }
  function analyzeChat(chatId) {
    const additions = [], existingMatches = [];
    for (const candidate of demo.analysisCandidates.filter(value => value.chatId === chatId)) {
      const existing = taskById(candidate.id) || tasks.find(task => task.chatId === chatId && candidate.messageIds.some(id => task.messageIds.includes(id)));
      if (existing) {
        existing.sourceMessageId = sourceMessageId(existing);
        existing.messageIds = [...new Set([...existing.messageIds,...candidate.messageIds])];
        existingMatches.push(existing);
      } else {
        const task = JSON.parse(JSON.stringify(candidate)); tasks.push(task); additions.push(task);
      }
    }
    const target = additions[0] || existingMatches[0] || tasks.find(task => task.chatId === chatId);
    if (target) openTask(target.id,{fromMessage:true}); else { changeFolder('tasks'); renderTaskDetail(); }
    toast(additions.length ? `Демоанализ завершён: новых задач — ${additions.length}` : 'Демоанализ завершён: новых задач нет');
  }
  function relatedMessages(chatId, messageId) {
    const ids = new Set([messageId]); let changed = true;
    while (changed) { changed = false; history.get(chatId).forEach(message => { if (message.quote?.messageId && ids.has(message.quote.messageId) && !ids.has(message.id)) { ids.add(message.id); changed = true; } }); }
    return [...ids];
  }
  function showCreateTask(chatId, messageId) {
    const message = messageById(chatId,messageId); if (!message) return;
    const linked = taskForMessage(chatId,messageId); if (linked) { openTask(linked.id,{fromMessage:true}); return; }
    createContext = {chatId,messageId,defaultTitle:message.text.slice(0,300),userTitle:Boolean(message.userText)};
    showDialog('Создать задачу',`<form class="task-create-form" id="task-create-form"><label>Название задачи<textarea id="create-title" required maxlength="300" rows="3"${message.userText ? ' data-i18n-ignore' : ''}>${esc(message.text.slice(0,300))}</textarea></label><label>Исполнитель<select id="create-assignee">${assigneeOptions(message.out ? 'Вы' : '',message.out ? 'self' : null)}</select></label><label>Срок<input type="date" id="create-due"></label><div class="task-create-evidence"><span>Основание · ${esc(chatById(chatId).name)}</span><blockquote${message.userText ? ' data-i18n-ignore' : ''}>${esc(message.text)}</blockquote></div><div class="dialog-form-actions"><button type="button" class="dialog-action dialog-secondary" data-dialog-action="close">Отмена</button><button class="dialog-action" type="submit">Создать задачу</button></div></form>`);
    createContext.renderedTitle = $('create-title').value;
    $('create-title').focus(); $('create-title').select();
  }
  function submitTask(event) {
    if (event.target.id !== 'task-create-form') return; event.preventDefault();
    if (!createContext) return;
    const {chatId,messageId} = createContext;
    let title = $('create-title').value.trim();
    if (!title) { $('create-title').setCustomValidity(t('Введите название задачи')); $('create-title').reportValidity(); return; }
    const existing = taskForMessage(chatId,messageId);
    if (existing) { $('detail-dialog').close(); openTask(existing.id,{fromMessage:true}); return; }
    const userTitle = createContext.userTitle || title !== createContext.renderedTitle;
    if (!userTitle) title = createContext.defaultTitle;
    const task = {id:`manual-task-${++taskSequence}`,chatId,title:title.slice(0,300),assignee:$('create-assignee').value,assigneePersonId:$('create-assignee').selectedOptions[0]?.dataset.personId || null,due:$('create-due').value,status:'in_progress',comment:'',messageIds:relatedMessages(chatId,messageId),origin:'manual'};
    if (userTitle) userTaskFields.set(task.id,new Set(['title']));
    tasks.push(task); createContext = null; $('detail-dialog').close(); renderMessages(false); openTask(task.id,{fromMessage:true}); toast('Задача создана. Исходное сообщение сохранено как основание.');
  }
  function showPopover(type) {
    if (!$('popover').hidden && $('popover').dataset.type === type) { hideMenus(); return; }
    hideMenus(); const popover = $('popover'); popover.dataset.type = type;
    popover.className = `popover ${type === 'emoji' ? 'emoji-popover' : 'attachment-popover'}`;
    popover.setAttribute('role',type === 'emoji' ? 'group' : 'menu');
    popover.innerHTML = ui(type === 'emoji' ? ['😀','😊','😂','❤️','👍','🔥','👋','🎉','🤔','👌','🙏','🚀','💙','👏','😎','✅','✨','🙂'].map(emoji => `<button type="button" data-emoji="${emoji}" aria-label="Вставить ${emoji}">${emoji}</button>`).join('') : '<button role="menuitem" data-pop="demo-file">Прикрепить пример файла</button>');
    popover.hidden = false; popover.querySelector('button')?.focus();
  }
  function filterMessages() {
    const query = $('message-search').value.trim().toLocaleLowerCase(locale()); let count = 0;
    $('messages').querySelectorAll('.message').forEach(element => { const match = Boolean(query && searchable(element.textContent,messageById(selected,element.dataset.message)?.text,messageById(selected,element.dataset.message)?.quote?.text).includes(query)); element.classList.toggle('match',match); element.classList.toggle('search-dim',Boolean(query && !match)); if (match) count++; });
    $('search-count').textContent = query ? t(`${count} найдено`) : '';
  }
  function openSearch() { hideMenus(); $('message-search-form').hidden = false; $('message-search').focus(); }
  function action(name, element) {
    if (name === 'all-chats') changeFolder('all');
    else if (name === 'back') { hideMenus(); shell.classList.remove('chat-open'); }
    else if (name === 'compose' || name === 'contacts') showContacts(name === 'compose' ? 'Новое сообщение' : 'Контакты');
    else if (name === 'settings') showDialog('Настройки',`<div class="profile-large"><span class="avatar">Я</span><h3>Демо-профиль</h3><p>Telegram · прототип</p></div><label class="settings-row">Истории над списком чатов<input type="checkbox" id="setting-stories" ${$('stories').hidden ? '' : 'checked'}></label><label class="settings-row">Компактный список чатов<input type="checkbox" id="setting-compact" ${document.body.classList.contains('compact') ? 'checked' : ''}></label><p class="demo-note">Все данные вымышлены. Изменения действуют в этом окне и сбрасываются после перезагрузки.</p>`);
    else if (name === 'proxy') showDialog('Настройки прокси','<p>Прототип работает локально и не требует подключения.</p>');
    else if (name === 'call') showDialog('Звонок',`<div class="profile-large">${avatar(current())}<h3>${esc(current().name)}</h3><p>Предпросмотр экрана звонка</p></div>`);
    else if (name === 'search-messages') openSearch();
    else if (name === 'close-search') { $('message-search-form').hidden = true; $('message-search').value = ''; filterMessages(); $('message-input').focus(); }
    else if (name === 'more') { openContext({type:'chat',chatId:selected},element); $('more-button').setAttribute('aria-expanded','true'); }
    else if (name === 'emoji' || name === 'attach') showPopover(name);
    else if (name === 'cancel-reply') { reply = null; replies.delete(selected); renderReply(); }
    else if (name === 'file') showDialog('Демонстрационный документ','<p>Пример вложения к обсуждению проекта. Реального файла и личных данных здесь нет.</p>');
  }
  document.addEventListener('click',event => {
    if (event.target.closest('#context-menu')) return;
    const linked = event.target.closest('[data-open-task]'); if (linked) { openTask(linked.dataset.openTask,{fromMessage:true}); return; }
    const control = event.target.closest('[data-action]'); if (control) action(control.dataset.action,control);
    else if (!event.target.closest('#popover,[data-chat-menu],[data-message-menu]')) hideMenus();
  });
  $('stories').addEventListener('click',event => { const button = event.target.closest('[data-story]'); if (button) { const story = demo.stories[Number(button.dataset.story)]; showDialog(story.name,`<div class="story-preview">${avatar(story)}</div><p>Демонстрационная история · Все данные вымышлены</p>`); } });
  $('chat-list').addEventListener('click',event => {
    const menu = event.target.closest('[data-chat-menu]'); if (menu) { openContext({type:'chat',chatId:menu.dataset.chatMenu},menu); return; }
    const row = event.target.closest('[data-chat]'); if (row) selectChat(row.dataset.chat);
  });
  $('chat-list').addEventListener('contextmenu',event => { const row = event.target.closest('[data-chat]'); if (row) { event.preventDefault(); openContext({type:'chat',chatId:row.dataset.chat},row,event); } });
  $('chat-list').addEventListener('keydown',event => { const row = event.target.closest('[data-chat]'); if (row && (event.key === 'ContextMenu' || event.shiftKey && event.key === 'F10')) { event.preventDefault(); openContext({type:'chat',chatId:row.dataset.chat},row); } });
  $('task-list').addEventListener('click',event => { const button = event.target.closest('[data-task]'); if (button) openTask(button.dataset.task); });
  $('task-list').addEventListener('change',event => {
    const checkbox = event.target.closest('[data-task-complete]'); if (!checkbox) return;
    updateTask('status',checkbox.checked ? 'done' : 'in_progress',checkbox.dataset.taskComplete);
  });
  $('profile-button').addEventListener('click',showProfile);
  $('chat-search').addEventListener('input',() => { retainedTask = null; renderSidebar(); });
  $('clear-search').addEventListener('click',() => { $('chat-search').value = ''; renderSidebar(); $('chat-search').focus(); });
  document.querySelectorAll('[data-folder]').forEach(button => button.addEventListener('click',() => changeFolder(button.dataset.folder)));
  document.querySelector('.folders').addEventListener('keydown',event => {
    if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
    const buttons = [...document.querySelectorAll('[data-folder]')], index = buttons.indexOf(document.activeElement); if (index < 0) return;
    event.preventDefault(); const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length-1 : (index+(event.key === 'ArrowRight' ? 1 : -1)+buttons.length)%buttons.length; buttons[next].click(); buttons[next].focus();
  });
  document.querySelectorAll('[data-task-filter]').forEach(button => button.addEventListener('click',() => { taskFilter = button.dataset.taskFilter; retainedTask = null; renderSidebar(); }));
  $('open-task-chat').addEventListener('click',() => { const task = taskById(selectedTask); if (task) revealSource(task.chatId,sourceMessageId(task)); });
  $('task-detail').addEventListener('click',event => { if (event.target.closest('#share-task')) { showTaskShare(selectedTask); return; } const source = event.target.closest('[data-source-message]'); if (source) revealSource(source.dataset.sourceChat,source.dataset.sourceMessage); });
  $('task-detail').addEventListener('change',event => { const field = {'task-status':'status','task-assignee':'assignee','task-due':'due'}[event.target.id]; if (field) updateTask(field,event.target.value,selectedTask,field === 'assignee' ? event.target.selectedOptions[0]?.dataset.personId || null : null); });
  $('task-detail').addEventListener('focusout',event => { if (event.target.id === 'task-title') updateTask('title',event.target.textContent); if (event.target.id === 'task-comment') updateTask('comment',event.target.value); });
  $('task-detail').addEventListener('paste',event => { if (event.target.id !== 'task-title') return; event.preventDefault(); const selection = window.getSelection(); if (!selection?.rangeCount) return; const range = selection.getRangeAt(0); range.deleteContents(); const text = document.createTextNode(event.clipboardData.getData('text/plain')); range.insertNode(text); range.setStartAfter(text); range.collapse(true); selection.removeAllRanges(); selection.addRange(range); });
  $('composer').addEventListener('submit',sendMessage);
  $('message-input').addEventListener('input',updateComposer);
  $('message-input').addEventListener('keydown',event => { if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) sendMessage(event); });
  $('message-search-form').addEventListener('submit',event => { event.preventDefault(); $('messages').querySelector('.match')?.scrollIntoView({block:'center'}); });
  $('message-search').addEventListener('input',filterMessages);
  $('close-dialog').addEventListener('click',() => $('detail-dialog').close());
  $('detail-dialog').addEventListener('close',() => { createContext = null; shareContext = null; });
  $('detail-dialog').addEventListener('submit',submitTask);
  $('detail-dialog').addEventListener('submit',submitTaskShare);
  $('detail-dialog').addEventListener('input',event => { if (event.target.id === 'create-title') event.target.setCustomValidity(''); });
  $('detail-dialog').addEventListener('click',event => {
    if (event.target === $('detail-dialog')) { const rect = $('detail-dialog').getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) $('detail-dialog').close(); }
    const contact = event.target.closest('[data-contact]'); if (contact) { $('detail-dialog').close(); selectChat(contact.dataset.contact,{resetFolder:true}); }
    const button = event.target.closest('[data-dialog-action]'); if (!button) return;
    if (button.dataset.dialogAction === 'notifications') { current().muted = !current().muted; renderSidebar(); showProfile(); }
    else { $('detail-dialog').close(); if (button.dataset.dialogAction === 'message') $('message-input').focus(); }
  });
  $('detail-dialog').addEventListener('change',event => { if (event.target.id === 'setting-stories') $('stories').hidden = !event.target.checked; if (event.target.id === 'setting-compact') document.body.classList.toggle('compact',event.target.checked); });
  $('popover').addEventListener('click',event => {
    const emoji = event.target.closest('[data-emoji]'); if (emoji) { const input = $('message-input'); input.setRangeText(emoji.dataset.emoji,input.selectionStart,input.selectionEnd,'end'); updateComposer(); hideMenus(); input.focus(); return; }
    if (event.target.closest('[data-pop="demo-file"]')) { hideMenus(); appendMessage('Пример документа.pdf',{kind:'file',userText:false}); toast('Добавлен демонстрационный файл'); }
  });
  $('context-menu').addEventListener('click',event => {
    const command = event.target.closest('[data-context]')?.dataset.context, context = menuContext;
    if (!command || !context) return; hideMenus();
    if (command === 'analyze') analyzeChat(context.chatId);
    if (command === 'open-chat') selectChat(context.chatId,{resetFolder:true});
    if (command === 'pin' || command === 'mute') { const chat = chatById(context.chatId), field = command === 'pin' ? 'pinned' : 'muted'; chat[field] = !chat[field]; renderSidebar(); }
    if (command === 'create-task') showCreateTask(context.chatId,context.messageId);
    if (command === 'open-task') { const task = taskForMessage(context.chatId,context.messageId); if (task) openTask(task.id,{fromMessage:true}); }
    if (command === 'reply') {
      const message = messageById(context.chatId,context.messageId); if (!message) return;
      if (selected !== context.chatId || folder === 'tasks') selectChat(context.chatId,{resetFolder:true});
      reply = {name:authorOf(message,context.chatId),text:message.text,userText:message.userText,messageId:message.id}; renderReply(); $('message-input').focus();
    }
  });
  function messageContext(event) {
    const element = event.target.closest('[data-message]'); if (!element) return;
    event.preventDefault(); openContext({type:'message',chatId:element.dataset.messageChat,messageId:element.dataset.message},element,event);
  }
  $('messages').addEventListener('contextmenu',messageContext);
  $('messages').addEventListener('keydown',event => { if (event.key === 'ContextMenu' || event.shiftKey && event.key === 'F10') messageContext(event); });
  $('messages').addEventListener('click',event => { const button = event.target.closest('[data-message-menu]'); if (button) { const element = button.closest('[data-message]'); openContext({type:'message',chatId:element.dataset.messageChat,messageId:element.dataset.message},button); } });
  for (const menu of [$('popover'),$('context-menu')]) menu.addEventListener('keydown',event => {
    const buttons = [...menu.querySelectorAll('button')], index = buttons.indexOf(document.activeElement);
    if (['ArrowDown','ArrowUp','Home','End'].includes(event.key)) { event.preventDefault(); buttons[event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length-1 : (index+(event.key === 'ArrowDown' ? 1 : -1)+buttons.length)%buttons.length]?.focus(); }
    if (event.key === 'Tab') hideMenus();
  });
  document.addEventListener('keydown',event => {
    if ($('detail-dialog').open) return;
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); shell.classList.remove('chat-open'); $('chat-search').focus(); }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'f') { event.preventDefault(); if (folder === 'tasks') { shell.classList.remove('chat-open'); $('chat-search').focus(); } else openSearch(); }
    if (event.key === 'Escape') {
      if (!$('popover').hidden || !$('context-menu').hidden) hideMenus({restoreFocus:true});
      else if (!$('message-search-form').hidden) action('close-search');
      else if (reply && folder !== 'tasks') action('cancel-reply');
      else if ($('chat-search').value) { $('chat-search').value = ''; renderSidebar(); }
      else shell.classList.remove('chat-open');
    }
  });
  window.addEventListener('resize',() => hideMenus());
  document.addEventListener('scroll',event => { if (!$('context-menu').contains(event.target)) hideMenus(); },true);
  if (new URLSearchParams(location.search).get('desktop') === '1') document.body.classList.add('desktop');
  paintIcons(); renderStories(); selectChat('project',{reveal:window.innerWidth >= 720});
  i18n?.onChange(refreshLanguage);
  const nextFrame = () => new Promise(resolve => requestAnimationFrame(resolve));
  function getTourEntry() {
    if (!$('context-menu').hidden && menuContext) {
      const {chatId,messageId} = menuContext;
      if (!chatById(chatId)) return null;
      if (menuContext.type === 'chat') return {target:3,context:{chatId}};
      if (menuContext.type === 'message' && messageById(chatId,messageId)) {
        const task = taskForMessage(chatId,messageId);
        return {target:task ? 5 : 4,context:{chatId,messageId,...(task ? {taskId:task.id} : {})}};
      }
    }
    if (folder === 'tasks') {
      const task = taskById(selectedTask);
      if (shell.classList.contains('chat-open') && task) return {target:2,context:{chatId:task.chatId,taskId:task.id}};
      const rows = [...$('task-list').querySelectorAll('[data-task]')];
      const row = rows.find(element => element.dataset.task === selectedTask) || rows[0];
      const listedTask = taskById(row?.dataset.task);
      return listedTask ? {target:1,context:{chatId:listedTask.chatId,taskId:listedTask.id}} : null;
    }
    const phone = document.body.classList.contains('preview-phone') || (!document.body.classList.contains('preview-desktop') && window.innerWidth < 720);
    if ((phone && !shell.classList.contains('chat-open')) || $('conversation').hidden) return null;
    const badges = [...$('messages').querySelectorAll('[data-open-task]')].filter(element => !element.closest('[hidden]') && taskById(element.dataset.openTask));
    const viewport = $('messages').getBoundingClientRect();
    const visible = badges.find(element => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && rect.right > Math.max(0,viewport.left) && rect.left < Math.min(window.innerWidth,viewport.right) && rect.bottom > Math.max(0,viewport.top) && rect.top < Math.min(window.innerHeight,viewport.bottom);
    });
    const badge = visible || badges[0], message = badge?.closest('[data-message]');
    return message ? {target:5,context:{chatId:message.dataset.messageChat,taskId:badge.dataset.openTask,messageId:message.dataset.message}} : null;
  }
  window.FollowUpPrototype = Object.freeze({
    getState: () => ({chatId:selected,folder,taskId:selectedTask,taskCount:tasks.length}),
    getTourEntry,
    resetTourStart() {
      if ($('task-detail').contains(document.activeElement)) document.activeElement.blur();
      if ($('detail-dialog').open) $('detail-dialog').close();
      hideMenus(); selectChat('project',{reveal:false,resetFolder:true});
    },
    setDeviceMode(mode) { hideMenus(); if (mode === 'phone') shell.classList.remove('chat-open'); },
    closeMenus: () => hideMenus(),
    async prepareTourStep(index, isCurrent = () => true, context = null) {
      if (!isCurrent()) return null;
      if ($('detail-dialog').open) $('detail-dialog').close();
      const task = context ? taskById(context.taskId || selectedTask) : taskById('task-presentation') || tasks[0];
      let target, afterScroll;
      if (index === 0) { changeFolder('all'); target = document.querySelector('[data-folder="tasks"]'); }
      if (index === 1 && task) {
        if (context && folder === 'tasks') {
          target = [...$('task-list').querySelectorAll('[data-task]')].find(element => element.dataset.task === task.id);
          if (target && selectedTask !== task.id) {
            selectedTask = task.id;
            $('task-list').querySelectorAll('[data-task]').forEach(element => {
              element.classList.toggle('selected',element.dataset.task === selectedTask);
              element.setAttribute('aria-pressed',String(element.dataset.task === selectedTask));
            });
            renderTaskDetail();
          }
        } else {
          changeFolder('tasks'); taskFilter = task.status === 'done' ? 'completed' : 'open'; selectedTask = task.id; renderSidebar(); renderTaskDetail();
          target = [...$('task-list').querySelectorAll('[data-task]')].find(element => element.dataset.task === task.id);
        }
      }
      if (index === 2 && task) {
        openTask(task.id,{fromMessage:true,focus:false});
        target = [...$('task-detail').querySelectorAll('[data-message]')].find(element => element.dataset.message === sourceMessageId(task));
      }
      if (index === 3) {
        const chatId = context?.chatId || 'project';
        if (chatById(chatId)) {
          selectChat(chatId,{reveal:false,resetFolder:true}); target = [...$('chat-list').querySelectorAll('[data-chat]')].find(element => element.dataset.chat === chatId);
          afterScroll = () => { openContext({type:'chat',chatId},target); return document.querySelector('#context-menu [data-context="analyze"]'); };
        }
      }
      if (index === 4) {
        let candidate;
        if (context) {
          const message = messageById(context.chatId,context.messageId);
          if (message && !taskForMessage(context.chatId,message.id)) candidate = {chatId:context.chatId,message};
        } else {
          for (const chat of chats) {
            const message = history.get(chat.id).find(value => !value.kind && !taskForMessage(chat.id,value.id));
            if (message) { candidate = {chatId:chat.id,message}; break; }
          }
        }
        if (candidate) {
          selectChat(candidate.chatId,{resetFolder:true});
          target = [...$('messages').querySelectorAll('[data-message]')].find(element => element.dataset.message === candidate.message.id);
          afterScroll = () => { openContext({type:'message',chatId:candidate.chatId,messageId:candidate.message.id},target); return document.querySelector('#context-menu [data-context="create-task"]'); };
        }
      }
      if (index === 5) {
        const chatId = context?.chatId || task?.chatId, taskId = context?.taskId || task?.id;
        if (chatById(chatId) && taskById(taskId)) {
          selectChat(chatId,{resetFolder:true});
          const badges = [...$('messages').querySelectorAll('[data-open-task]')].filter(element => element.dataset.openTask === taskId);
          const messageId = context?.messageId || sourceMessageId(taskById(taskId));
          target = badges.find(element => element.closest('[data-message]').dataset.message === messageId) || (context ? badges[0] : null);
        }
      }
      if (index === 6 && task) {
        openTask(task.id,{fromMessage:true,focus:false});
        target = $('share-task');
      }
      await nextFrame();
      if (!isCurrent()) return null;
      target?.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'});
      await nextFrame();
      if (!isCurrent()) return null;
      if (afterScroll) target = afterScroll();
      return target;
    },
  });
})();
