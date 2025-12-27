const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");

const DATA_FILE = path.join(__dirname, "messages.json");

// ✅ load old messages (persisted)
let messages = [];
if (fs.existsSync(DATA_FILE)) {
  messages = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
}

const server = http.createServer((req, res) => {
  let filePath = path.join(__dirname, "index.html");

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500);
      res.end("Server error");
    } else {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(content);
    }
  });
});

const wss = new WebSocket.Server({ server });

wss.on("connection", (ws) => {
  // ✅ send message history on connect
  ws.send(JSON.stringify({ type: "history", data: messages }));

  ws.on("message", (msg) => {
    const data = JSON.parse(msg.toString());

    // ✅ typing indicator (no save)
    if (data.type === "typing") {
      wss.clients.forEach(c => {
        if (c !== ws && c.readyState === WebSocket.OPEN) {
          c.send(JSON.stringify({ type: "typing", user: data.user }));
        }
      });
      return;
    }

    // ✅ seen receipt (no save)
    if (data.type === "seen") {
      wss.clients.forEach(c => {
        if (c.readyState === WebSocket.OPEN) {
          c.send(JSON.stringify(data));
        }
      });
      return;
    }

    // ✅ normal message (save + broadcast)
    if (data.type === "message") {
      messages.push(data);
      fs.writeFileSync(DATA_FILE, JSON.stringify(messages, null, 2));

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
