'use strict';

(() => {
  const i18n = window.TasksI18n;
  if (!i18n) return;

  // Interface copy only. Demo participants and messages live in demo-i18n.js.
  i18n.registerEnglish({
    'Без срока': 'No due date',
    'Выполнена': 'Completed',
    'Выполнена:': 'Completed:',
    'Открыть задачу:': 'Open task:',
    'Задача:': 'Task:',
    'Исполнитель:': 'Assignee:',
    'Срок:': 'Due date:',
    'В работе': 'In progress',
    'Сохранено': 'Saved',
    'Не назначен': 'Unassigned',
    'Поиск задач (⌘K)': 'Search tasks (⌘K)',
    'Поиск (⌘K)': 'Search (⌘K)',
    'Поиск задач': 'Search tasks',
    'Поиск чатов': 'Search chats',
    'Чаты не найдены': 'No chats found',
    'Нет новых сообщений': 'No new messages',
    'Задачи не найдены': 'No tasks found',
    'Завершённых задач пока нет': 'No completed tasks yet',
    'В этой выборке пока нет задач': 'No tasks in this view yet',
    'Задача выполнена': 'Task completed',
    'Задача создана': 'Task created',
    'Обсуждение задачи': 'Task discussion',
    'PDF · Демонстрационный документ': 'PDF · Demo document',
    'К сообщению в чате': 'Go to message in chat',
    'Действия с сообщением': 'Message actions',
    'Выберите задачу из списка слева.': 'Select a task from the list on the left.',
    'Поделиться': 'Share',
    'Название задачи': 'Task title',
    'Комментарий': 'Comment',
    'Добавить заметку к задаче': 'Add a note to this task',
    'Статус': 'Status',
    'Исполнитель': 'Assignee',
    'Срок': 'Due date',
    'Переписка по задаче': 'Task conversation',
    'Отправить в прототипе': 'Send in prototype',
    'Голосовое сообщение': 'Voice message',
    'В прототипе доступен текстовый ввод. Запись голоса здесь не подключена.': 'You can send text in this prototype. Voice recording is not connected.',
    'Информация': 'Info',
    'Написать сообщение': 'Send message',
    'Включить': 'Enable',
    'Выключить': 'Disable',
    'Включить уведомления': 'Enable notifications',
    'Выключить уведомления': 'Disable notifications',
    'Все имена, сообщения и истории в этом макете вымышлены.': 'All names, messages, and stories in this prototype are fictional.',
    'Контакты': 'Contacts',
    'Поделиться задачей': 'Share task',
    'По умолчанию выбран исполнитель задачи.': 'The task assignee is selected by default.',
    'Выберите получателя из участников исходного чата.': 'Choose a recipient from the original chat participants.',
    'Кому отправить': 'Send to',
    'Вы · Избранное': 'You · Saved Messages',
    'Исполнитель задачи': 'Task assignee',
    'Участник чата': 'Chat participant',
    'Предпросмотр сообщения': 'Message preview',
    'Сообщение получателю': 'Message to recipient',
    'Добавить сообщение (необязательно)': 'Add a message (optional)',
    'Демонстрационная отправка в макете.': 'Demo sharing within this prototype.',
    'Отмена': 'Cancel',
    'Отправить': 'Send',
    'Задача добавлена в Избранное в макете': 'Task added to Saved Messages · demo',
    'Анализировать задачи': 'Analyze tasks',
    'Новое': 'New',
    'Открыть чат': 'Open chat',
    'Открепить': 'Unpin',
    'Закрепить': 'Pin',
    'Ответить': 'Reply',
    'Открыть задачу': 'Open task',
    'Создать задачу': 'Create task',
    'Демоанализ завершён: новых задач нет': 'Demo analysis complete: no new tasks',
    'Введите название задачи': 'Enter a task title',
    'Задача создана. Исходное сообщение сохранено как основание.': 'Task created. The original message was saved as evidence.',
    'Прикрепить пример файла': 'Attach a sample file',
    'Новое сообщение': 'New message',
    'Настройки': 'Settings',
    'Демо-профиль': 'Demo profile',
    'Telegram · прототип': 'Telegram · prototype',
    'Истории над списком чатов': 'Stories above the chat list',
    'Компактный список чатов': 'Compact chat list',
    'Все данные вымышлены. Изменения действуют в этом окне и сбрасываются после перезагрузки.': 'All data is fictional. Changes apply in this window and reset when you reload.',
    'Настройки прокси': 'Proxy settings',
    'Прототип работает локально и не требует подключения.': 'The prototype works locally and does not require a connection.',
    'Звонок': 'Call',
    'Предпросмотр экрана звонка': 'Call screen preview',
    'Демонстрационный документ': 'Demo document',
    'Пример вложения к обсуждению проекта. Реального файла и личных данных здесь нет.': 'A sample attachment for the project discussion. There is no real file or personal data here.',
    'Демонстрационная история · Все данные вымышлены': 'Demo story · All data is fictional',
    'Пример документа.pdf': 'Sample document.pdf',
    'Добавлен демонстрационный файл': 'Demo file added',

    // Initial HTML and accessibility labels use the same translation registry.
    'Просмотр прототипа': 'Prototype preview',
    'Tasks — начало': 'Tasks — home',
    'Устройство': 'Device',
    'Что нового': "What’s new",
    'Прототип Telegram': 'Telegram prototype',
    'Чаты': 'Chats',
    'Истории': 'Stories',
    'Очистить поиск': 'Clear search',
    'Чаты и задачи': 'Chats and tasks',
    'Все чаты': 'All chats',
    'Новые': 'Unread',
    'Задачи': 'Tasks',
    'Статус задач': 'Task status',
    'Завершены': 'Completed',
    'Все': 'All',
    'Список чатов': 'Chat list',
    'Задачи из чатов': 'Tasks from chats',
    'Навигация Telegram': 'Telegram navigation',
    'Открытый чат': 'Open chat',
    'Назад к чатам': 'Back to chats',
    'Открыть профиль собеседника': 'Open contact profile',
    'Позвонить': 'Call',
    'Поиск в чате': 'Search chat',
    'Меню чата': 'Chat menu',
    'Поиск в этом чате': 'Search this chat',
    'Закрыть поиск': 'Close search',
    'Сообщения': 'Messages',
    'Ответ': 'Reply',
    'Отменить ответ': 'Cancel reply',
    'Прикрепить файл': 'Attach file',
    'Сообщение': 'Message',
    'Сообщение...': 'Message...',
    'Выбрать эмодзи': 'Choose emoji',
    'Карточка задачи': 'Task details',
    'Назад к списку задач': 'Back to task list',
    'Задача из чата': 'Task from chat',
    'Действия': 'Actions',
    'Закрыть': 'Close',
    'Закрыть обзор': 'Close tour',
    'Назад': 'Back',
    'Далее': 'Next',
  });

  i18n.registerTranslator((source, t) => {
    // Every recursive call receives a strictly smaller piece, never `source`.
    const prefixes = [
      ['История: ', 'Story: '],
      ['Действия с чатом ', 'Chat actions: '],
      ['Выполнена: ', 'Completed: '],
      ['Открыть задачу: ', 'Open task: '],
      ['Открыть профиль: ', 'Open profile: '],
      ['Задача: ', 'Task: '],
      ['Основание · ', 'Evidence · '],
      ['Задача · ', 'Task · '],
      ['Срок: ', 'Due date: '],
      ['Вставить ', 'Insert '],
    ];
    for (const [prefix, english] of prefixes) {
      if (source.startsWith(prefix) && source.length > prefix.length) {
        return english + t(source.slice(prefix.length));
      }
    }

    let match = /^(\d+) сообщ\.$/u.exec(source);
    if (match) return `${match[1]} ${Number(match[1]) === 1 ? 'message' : 'messages'}`;
    match = /^(\d+) найдено$/u.exec(source);
    if (match) return `${match[1]} found`;
    match = /^Исполнитель: (.+)$/u.exec(source);
    if (match) return `Assignee: ${match[1].split(' · ').map(piece => t(piece)).join(' · ')}`;
    match = /^Из чата «(.+)»$/u.exec(source);
    if (match) return `From chat “${t(match[1])}”`;
    match = /^(.+), (\d{1,2}:\d{2})$/u.exec(source);
    if (match) return `${t(match[1])}, ${match[2]}`;
    match = /^Задача отправлена: (.+) · в макете$/u.exec(source);
    if (match) return `Task sent to ${t(match[1])} · demo`;
    match = /^Демоанализ завершён: новых задач — (\d+)$/u.exec(source);
    if (match) return `Demo analysis complete: ${match[1]} new ${Number(match[1]) === 1 ? 'task' : 'tasks'}`;
    match = /^(.+) · (В работе|Выполнена|In progress|Completed) · (.+)$/u.exec(source);
    if (match) return `${t(match[1])} · ${t(match[2])} · ${t(match[3])}`;
    return null;
  });
})();
