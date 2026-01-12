const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");

const DATA_FILE = path.join(__dirname, "messages.json");

// ensure messages.json exists
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, "[]");
}

// load history
let messages = [];
try {
  messages = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
} catch {
  messages = [];
}

const server = http.createServer((req, res) => {
  fs.readFile(path.join(__dirname, "index.html"), (err, content) => {
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

  // send history
  ws.send(JSON.stringify({ type: "history", data: messages }));

  ws.on("message", (raw) => {
    let data;
    try { data = JSON.parse(raw.toString()); } catch { return; }

    // typing (no save)
    if (data.type === "typing") {
      wss.clients.forEach(c => {
        if (c !== ws && c.readyState === WebSocket.OPEN) {
          c.send(JSON.stringify({ type: "typing", user: data.user }));
        }
      });
      return;
    }

    // seen / delivered (no save)
    if (data.type === "seen" || data.type === "delivered") {
      wss.clients.forEach(c => {
        if (c.readyState === WebSocket.OPEN) {
          c.send(JSON.stringify(data));
        }
      });
      return;
    }

    // edit message
    if (data.type === "edit") {
      const i = messages.findIndex(m => m.id === data.id);
      if (i !== -1) {
        messages[i].text = data.text;
        fs.writeFile(DATA_FILE, JSON.stringify(messages, null, 2), () => {});
      }
      wss.clients.forEach(c => {
        if (c.readyState === WebSocket.OPEN) {
          c.send(JSON.stringify(data));
        }
      });
      return;
    }

    // normal message
    if (data.type === "message") {
      messages.push(data);
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
