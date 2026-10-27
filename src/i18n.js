'use strict';

(() => {
  const storageKey = 'tasks.language';
  let language = 'en';
  try { if (localStorage.getItem(storageKey) === 'ru') language = 'ru'; } catch { /* Preferences are optional. */ }
  const english = new Map(), translators = [], listeners = new Set(), bindings = [];
  const translatedAttributes = ['aria-label','title','placeholder'];
  const hasRussian = value => /[А-Яа-яЁё]/.test(value);
  function t(source) {
    const value = String(source ?? '');
    if (language === 'ru') return value;
    const trimmed = value.trim();
    let translated = english.get(trimmed);
    if (translated === undefined) {
      for (const translator of translators) {
        translated = translator(trimmed,t);
        if (translated !== null && translated !== undefined) break;
      }
    }
    if (translated === null || translated === undefined) return value;
    return `${value.slice(0,value.length-value.trimStart().length)}${translated}${value.slice(value.trimEnd().length)}`;
  }
  function translateTree(root) {
    const visit = node => {
      if (node.nodeType === 1) {
        if (node.matches('[data-i18n-ignore],script,style')) return;
        for (const name of translatedAttributes) if (node.hasAttribute(name)) node.setAttribute(name,t(node.getAttribute(name)));
      } else if (node.nodeType === 3) {
        node.textContent = t(node.textContent);
      }
      for (const child of [...node.childNodes]) visit(child);
    };
    visit(root);
  }
  function html(markup) {
    const template = document.createElement('template');
    template.innerHTML = markup;
    translateTree(template.content);
    return template.innerHTML;
  }
  function refreshStatic() {
    for (const binding of bindings) {
      if (!binding.node.isConnected) continue;
      if (binding.attribute) binding.node.setAttribute(binding.attribute,t(binding.source));
      else binding.node.textContent = t(binding.source);
    }
    const description = document.querySelector('meta[name="description"]');
    if (description) description.content = t('Tasks - от слов к делу. Интерактивный прототип задач из переписки. Все данные демонстрационные.');
  }
  function bindStatic(root = document) {
    const visit = node => {
      if (node.nodeType === 1) {
        if (node.matches('[data-i18n-ignore],script,style')) return;
        for (const attribute of translatedAttributes) {
          const source = node.getAttribute(attribute);
          if (source && hasRussian(source)) bindings.push({node,attribute,source});
        }
      } else if (node.nodeType === 3 && hasRussian(node.textContent)) {
        bindings.push({node,source:node.textContent});
      }
      for (const child of [...node.childNodes]) visit(child);
    };
    visit(root); refreshStatic();
  }
  function setLanguage(next) {
    if (!['en','ru'].includes(next) || next === language) return false;
    const previousLanguage = language;
    language = next;
    try { localStorage.setItem(storageKey,next); } catch { /* Keep the in-memory selection. */ }
    document.documentElement.lang = language;
    refreshStatic();
    for (const listener of listeners) listener({language,previousLanguage});
    return true;
  }
  window.TasksI18n = Object.freeze({
    get language() { return language; },
    get locale() { return language === 'en' ? 'en-GB' : 'ru-RU'; },
    t,html,bindStatic,setLanguage,
    registerEnglish(dictionary) { for (const [source,value] of Object.entries(dictionary)) english.set(source,value); refreshStatic(); },
    registerTranslator(translator) { translators.push(translator); },
    onChange(listener) { listeners.add(listener); return () => listeners.delete(listener); },
  });
  window.TasksI18n.registerEnglish({
    'Tasks - от слов к делу':'Tasks - From words to action',
    'Tasks - от слов к делу. Интерактивный прототип задач из переписки. Все данные демонстрационные.':'Tasks - From words to action. An interactive prototype for tasks from chats. All data is fictional.',
    'Tasks — начало':'Tasks — home',
    'Просмотр прототипа':'Prototype preview',
    'Устройство':'Device',
    'Язык интерфейса':'Interface language',
    'Что нового':"What's new",
    'Прототип Telegram':'Telegram prototype',
    'Чаты':'Chats',
    'Настройки прокси':'Proxy settings',
    'Новое сообщение':'New message',
    'Истории':'Stories',
    'Поиск (⌘K)':'Search (⌘K)',
    'Поиск чатов':'Search chats',
    'Очистить поиск':'Clear search',
    'Чаты и задачи':'Chats and tasks',
    'Все чаты':'All chats',
    'Новые':'Unread',
    'Задачи':'Tasks',
    'Статус задач':'Task status',
    'В работе':'In progress',
    'Завершены':'Completed',
    'Все':'All',
    'Список чатов':'Chat list',
    'Задачи из чатов':'Tasks from chats',
    'Чаты не найдены':'No chats found',
    'Навигация Telegram':'Telegram navigation',
    'Контакты':'Contacts',
    'Настройки':'Settings',
    'Открытый чат':'Open chat',
    'Назад к чатам':'Back to chats',
    'Открыть профиль собеседника':'Open contact profile',
    'Позвонить':'Call',
    'Поиск в чате':'Search chat',
    'Меню чата':'Chat menu',
    'Поиск в этом чате':'Search this chat',
    'Закрыть поиск':'Close search',
    'Сообщения':'Messages',
    'Ответ':'Reply',
    'Отменить ответ':'Cancel reply',
    'Прикрепить файл':'Attach file',
    'Сообщение':'Message',
    'Сообщение...':'Message...',
    'Выбрать эмодзи':'Choose emoji',
    'Голосовое сообщение':'Voice message',
    'Карточка задачи':'Task details',
    'Назад к списку задач':'Back to tasks',
    'Задача из чата':'Task from chat',
    'Открыть чат':'Open chat',
    'Действия':'Actions',
    'Закрыть':'Close',
    'Закрыть обзор':'Close tour',
    'Назад':'Back',
    'Далее':'Next',
    'Еще раз':'Replay',
    'Задачи - от слов к делу':'Tasks - From words to action',
    'Позволяет автоматически создавать задачи из чатов. Договорённости, исполнитель, сроки и связанная переписка — в одном месте.':'Automatically turn chats into tasks. Keep commitments, the assignee, deadlines and related messages in one place.',
    'Анализировать задачи':'Analyze tasks',
    'Вы сами выбираете, какие чаты анализировать в задачи. Откройте меню нужного чата и нажмите «Анализировать задачи».':'You choose which chats to analyze for tasks. Open a chat’s menu and select “Analyze tasks”.',
    'Задачи рядом с чатами':'Tasks alongside your chats',
    'Новая вкладка собирает задачи из всех чатов.':'The new tab brings together tasks from all your chats.',
    'Все задачи в одном списке':'All tasks in one list',
    'Выберите задачу, откроется её исполнитель, срок, статус и переписка.':'Select a task to see its assignee, deadline, status and related messages.',
    'Вся переписка в задаче':'Related messages in the task',
    'Не надо листать весь чат/группу с исполнителем, в задаче собрано только то, что относится к этой задаче':'No need to scroll through the entire chat or group. Each task collects only the messages related to it.',
    'Создать задачу':'Create task',
    'Вы можете создать новую задачу из любого сообщения вручную.':'You can manually create a new task from any message.',
    'Вернуться к задаче':'Return to a task',
    'Отметка «Задача создана» связывает сообщение с карточкой и всей перепиской по задаче. Можно открыть её одним нажатием.':'The “Task created” label links a message to the task and its related conversation. Open it with one click.',
    'Поделиться':'Share',
    'Нажмите «Поделиться» в карточке задачи. Исполнитель из исходного чата уже выбран получателем. Перед отправкой можно выбрать другого участника и добавить сообщение.':'Select “Share” in the task details. The assignee from the original chat is already selected. You can choose another participant and add a message before sending.',
  });
  document.documentElement.lang = language;
  bindStatic();
})();
