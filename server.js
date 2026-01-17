const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");

const DATA_FILE = path.join(__dirname, "messages.json");
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, "[]");

let messages = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8") || "[]");

const server = http.createServer((req, res) => {
  fs.readFile("index.html", (_, data) => {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(data);
  });
});

const wss = new WebSocket.Server({ server });

wss.on("connection", ws => {
  ws.send(JSON.stringify({ type: "history", data: messages }));

  ws.on("message", raw => {
    let data;
    try { data = JSON.parse(raw); } catch { return; }

    if (["typing","seen","presence"].includes(data.type)) {
      wss.clients.forEach(c=>c.readyState===1 && c.send(JSON.stringify(data)));
      return;
    }

    if (data.type === "edit") {
      const m = messages.find(x=>x.id===data.id);
      if (m) m.text = data.text;
    }

    if (data.type === "delete") {
      messages = messages.filter(m=>m.id!==data.id);
    }

    if (data.type === "reaction") {
      const m = messages.find(x=>x.id===data.id);
      if (m) {
        m.reactions ??= {};
        m.reactions[data.emoji] ??= [];
        const i = m.reactions[data.emoji].indexOf(data.user);
        i === -1 ? m.reactions[data.emoji].push(data.user)
                 : m.reactions[data.emoji].splice(i,1);
      }
    }

    if (data.type === "message") messages.push(data);

    fs.writeFileSync(DATA_FILE, JSON.stringify(messages,null,2));
    wss.clients.forEach(c=>c.readyState===1 && c.send(JSON.stringify(data)));
  });
});

server.listen(process.env.PORT||3000);
