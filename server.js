const express = require('express');
const { WebSocketServer } = require('ws');
const { spawn } = require('child_process');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

const wss = new WebSocketServer({ port: PORT + 1 });

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      const prompt = data.prompt;

      // Spawn gemini CLI in headless mode
      const gemini = spawn('gemini', ['-p', prompt, '--output-format', 'stream-json'], {
        shell: true,
      });

      let output = '';

      gemini.stdout.on('data', (chunk) => {
        output += chunk.toString();
        try {
          // Try to parse as JSON stream
          const lines = output.split('\n').filter(l => l.trim());
          for (const line of lines) {
            const event = JSON.parse(line);
            if (event.type === 'content' || event.type === 'assistant_message') {
              ws.send(JSON.stringify({ type: 'content', data: event.content || event.text || '' }));
            }
          }
          output = '';
        } catch {
          // Incomplete JSON, wait for more
        }
      });

      gemini.stderr.on('data', (chunk) => {
        ws.send(JSON.stringify({ type: 'error', data: chunk.toString() }));
      });

      gemini.on('close', (code) => {
        ws.send(JSON.stringify({ type: 'done', code }));
      });
    } catch (err) {
      ws.send(JSON.stringify({ type: 'error', data: err.message }));
    }
  });

  ws.on('close', () => console.log('Client disconnected'));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`WebSocket at ws://localhost:${PORT + 1}`);
});
