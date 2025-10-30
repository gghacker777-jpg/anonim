const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const MESSAGES_FILE = path.join(__dirname, 'messages.json');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Load messages from file or initialize empty array
let messages = [];
function loadMessages() {
  if (fs.existsSync(MESSAGES_FILE)) {
    try {
      messages = JSON.parse(fs.readFileSync(MESSAGES_FILE, 'utf8'));
    } catch (err) {
      console.error('Error reading messages file:', err);
      messages = [];
    }
  }
}

function saveMessages() {
  fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messages, null, 2));
}

// Load messages on startup
loadMessages();

// API endpoints
app.get('/api/messages', (req, res) => {
  res.json(messages);
});

app.post('/api/messages', (req, res) => {
  const { text } = req.body;
  if (!text || text.trim().length === 0) {
    return res.status(400).json({ error: 'Message text is required' });
  }

  const message = {
    id: Date.now(),
    text: text.trim(),
    timestamp: new Date().toISOString()
  };

  messages.push(message);
  saveMessages();

  res.status(201).json(message);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 CooliChat server running on port ${PORT}`);
  console.log(`🌐 Open http://localhost:${PORT} in your browser to start chatting!`);
});
