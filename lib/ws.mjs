import { WebSocketServer } from 'ws';

// server из app.listen(port, (server) => setupWs(server, /^\/ws$/, onConn))
export function setupWs(server, pathRe, onConn) {
  const wss = new WebSocketServer({ noServer: true });
  server.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url, 'http://x');
    if (pathRe.test(url.pathname)) {
      wss.handleUpgrade(req, socket, head, (ws) => onConn(ws, url, req));
    } else {
      socket.destroy();
    }
  });
  return wss;
}

// ws.send принимает строку; эти хелперы стандартизируют формат сообщений {type, ...data}
export function sendTo(ws, type, data = {}) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify({ type, ...data }));
}

export function broadcast(set, type, data = {}, except = null) {
  const payload = JSON.stringify({ type, ...data });
  for (const ws of set) {
    if (ws !== except && ws.readyState === ws.OPEN) ws.send(payload);
  }
}
