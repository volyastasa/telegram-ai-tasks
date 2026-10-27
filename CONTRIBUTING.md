# Contributing to Telegram AI Tasks

Keep changes focused on discovering and managing tasks from conversations. Preserve the links between each task, its relevant discussion and its exact source messages.

## Local setup

Use Python 3 and Node.js 24 or later. From the repository root:

```sh
npm ci --ignore-scripts
python3 -m http.server 8000 --bind 127.0.0.1 --directory src
```

Open [localhost:8000](http://localhost:8000/). Check both desktop and iPhone layouts, and English and Russian when changing interface text.

## Before proposing a change

```sh
npm run check
npm test
```

- Use synthetic fixtures only. Keep personal conversations, credentials and private exports out of the repository.
- Add or adjust interaction tests when behaviour changes, especially task editing, source navigation and simulated sharing.
- Describe the user-visible change and how you checked it. Include a screenshot or short recording for interface changes, and link the source files or issue that explain the change.
- Preserve external dependencies' license files and copyright notices when adding or redistributing them. This project uses the [MIT license](LICENSE).

See the [README](README.md#prototype-scope) for the prototype's current boundaries.
