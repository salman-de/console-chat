const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");

const DATA_FILE = path.join(__dirname, "messages.json");

// ✅ ensure messages.json exists (Render fix)
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, "[]");
}

// ✅ load old messages
let messages = [];
try {
  messages = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
} catch (e) {
  messages = [];
}

const server = http.createServer((req, res) => {
  const filePath = path.join(__dirname, "index.html");

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500);
      res.end("Server error");
      return;
    }
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(content);
  });
});

const wss = new WebSocket.Server({ server });

wss.on("connection", (ws) => {
  // 📜 send history
  ws.send(JSON.stringify({ type: "history", data: messages }));

  ws.on("message", (msg) => {
    let data;
    try {
      data = JSON.parse(msg.toString());
    } catch {
      return;
    }

    // ✍️ typing (no save)
    if (data.type === "typing") {
      wss.clients.forEach(c => {
        if (c !== ws && c.readyState === WebSocket.OPEN) {
          c.send(JSON.stringify({ type: "typing", user: data.user }));
        }
      });
      return;
    }

    // 👁️ seen (no save)
    if (data.type === "seen") {
      wss.clients.forEach(c => {
        if (c.readyState === WebSocket.OPEN) {
          c.send(JSON.stringify(data));
        }
      });
      return;
    }

    // 💬 message (save + broadcast)
    if (data.type === "message") {
      messages.push(data);

      // async write → no blocking / hang
      fs.writeFile(DATA_FILE, JSON.stringify(messages, null, 2), () => {});

      wss.clients.forEach(c => {
        if (c.readyState === WebSocket.OPEN) {
          c.send(JSON.stringify(data));
        }
      });
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
