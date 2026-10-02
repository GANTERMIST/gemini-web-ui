# Gemini Web UI

Веб-интерфейс для Gemini CLI в стиле Claude Code.

## Требования

- Node.js 18+
- Установленный `gemini` CLI (`npm install -g @google/gemini-cli`)

## Запуск

```bash
npm install
npm start
```

Открой http://localhost:3000

## Как работает

Сервер (Express) запускает `gemini -p "<запрос>" --output-format stream-json` и стримит ответ через WebSocket на фронтенд.

## Лицензия

MIT
