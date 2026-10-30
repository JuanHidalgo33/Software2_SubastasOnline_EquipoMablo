import { createServer } from 'http';
import { buildApp } from './composition';
import { config } from './config';
import { WEBSOCKET_PATH } from './realtime/AuctionRealtimeHub';

const { app, realtimeHub } = buildApp();

const server = createServer(app);
realtimeHub.attach(server);

server.listen(config.port, () => {
  console.log(`Server listening on http://localhost:${config.port}`);
  console.log(`WebSocket available at ws://localhost:${config.port}${WEBSOCKET_PATH}`);
});