const log = (text) => {
  const box = document.getElementById('log');
  box.textContent += new Date().toLocaleTimeString() + '  ' + text + '\n';
  box.scrollTop = box.scrollHeight;
};

document.getElementById('connect').addEventListener('click', () => {
  const server = document.getElementById('server').value.trim();
  const token = document.getElementById('token').value.trim();
  const auctionId = document.getElementById('auctionId').value.trim();

  const socket = new WebSocket(server + '?token=' + encodeURIComponent(token));
  socket.onopen = () => socket.send(JSON.stringify({ type: 'subscribe', auctionId }));
  socket.onmessage = (event) => log(event.data);
  socket.onclose = (event) => log('Conexión cerrada (código ' + event.code + ')');
});