const express = require('express');
const { WebSocketServer } = require('ws');
const { spawn, spawnSync } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;
const isWin = process.platform === 'win32';

app.use(express.static('public'));

const check = spawnSync('gemini', ['--version'], { shell: isWin });
if (check.status !== 0) {
  console.warn('WARNING: gemini CLI not found. Install: npm i -g @google/gemini-cli');
} else {
  console.log('Gemini CLI found:', check.stdout.toString().trim());
}

const wss = new WebSocketServer({ port: Number(PORT) + 1 });

function extractText(ev) {
  if (ev.type === 'message' && ev.role === 'assistant') return ev.content || '';
  if (ev.type === 'content' || ev.type === 'assistant_message') return ev.content || ev.text || '';
  return '';
}

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    let prompt;
    try {
      prompt = JSON.parse(message).prompt;
    } catch (err) {
      return ws.send(JSON.stringify({ type: 'error', data: err.message }));
    }

    const gemini = spawn('gemini', ['--output-format', 'stream-json'], { shell: isWin });
    gemini.stdin.write(prompt);
    gemini.stdin.end();

    let buf = '';
    gemini.stdout.on('data', (chunk) => {
      buf += chunk.toString();
      const lines = buf.split('\n');
      buf = lines.pop();
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const text = extractText(JSON.parse(line));
          if (text) ws.send(JSON.stringify({ type: 'content', data: text }));
        } catch {
          ws.send(JSON.stringify({ type: 'content', data: line + '\n' }));
        }
      }
    });

    gemini.stderr.on('data', (chunk) => {
      ws.send(JSON.stringify({ type: 'error', data: chunk.toString() }));
    });

    gemini.on('error', (e) => {
      ws.send(JSON.stringify({ type: 'error', data: 'Cannot start gemini: ' + e.message }));
      ws.send(JSON.stringify({ type: 'done', code: -1 }));
    });

    gemini.on('close', (code) => {
      ws.send(JSON.stringify({ type: 'done', code }));
    });
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
