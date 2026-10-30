import { IncomingMessage, Server } from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import { TokenService } from '../../application/ports/TokenService';

export const WEBSOCKET_PATH = '/ws';

interface ClientInfo {
  userId: string;
  auctionIds: Set<string>;
}

type ClientMessage = { type: 'subscribe' | 'unsubscribe'; auctionId: string };

export class AuctionRealtimeHub {
  private readonly clients = new Map<WebSocket, ClientInfo>();
  private readonly subscribers = new Map<string, Set<WebSocket>>();

  constructor(private readonly tokenService: TokenService) {}

  attach(server: Server): void {
    const wss = new WebSocketServer({ server, path: WEBSOCKET_PATH });
    wss.on('connection', (socket, request) => this.handleConnection(socket, request));
  }

  broadcastToAuction(auctionId: string, message: object): void {
    for (const socket of this.subscribers.get(auctionId) ?? []) {
      this.send(socket, message);
    }
  }

  sendToUser(userId: string, message: object): void {
    for (const [socket, info] of this.clients) {
      if (info.userId === userId) {
        this.send(socket, message);
      }
    }
  }

  connectedCount(auctionId: string): number {
    return this.subscribers.get(auctionId)?.size ?? 0;
  }

  private handleConnection(socket: WebSocket, request: IncomingMessage): void {
    const url = new URL(request.url ?? '', 'http://localhost');
    const token = url.searchParams.get('token');
    const payload = token ? this.tokenService.verify(token) : null;

    if (!payload) {
      this.send(socket, { type: 'error', code: 'UNAUTHENTICATED', message: 'A valid token is required to connect.' });
      socket.close(4401, 'Unauthenticated');
      return;
    }

    this.clients.set(socket, { userId: payload.userId, auctionIds: new Set() });
    this.send(socket, { type: 'connected', userId: payload.userId });

    socket.on('message', (raw) => this.handleMessage(socket, raw.toString()));
    socket.on('close', () => this.handleClose(socket));
  }

  private handleMessage(socket: WebSocket, raw: string): void {
    let message: ClientMessage;
    try {
      message = JSON.parse(raw);
    } catch {
      this.send(socket, { type: 'error', code: 'INVALID_MESSAGE', message: 'Messages must be valid JSON.' });
      return;
    }

    if (typeof message.auctionId !== 'string' || message.auctionId.length === 0) {
      this.send(socket, { type: 'error', code: 'INVALID_MESSAGE', message: 'auctionId is required.' });
      return;
    }

    if (message.type === 'subscribe') {
      this.subscribe(socket, message.auctionId);
    } else if (message.type === 'unsubscribe') {
      this.unsubscribe(socket, message.auctionId);
    } else {
      this.send(socket, { type: 'error', code: 'INVALID_MESSAGE', message: 'Unknown message type.' });
    }
  }

  private subscribe(socket: WebSocket, auctionId: string): void {
    const sockets = this.subscribers.get(auctionId) ?? new Set<WebSocket>();
    sockets.add(socket);
    this.subscribers.set(auctionId, sockets);
    this.clients.get(socket)?.auctionIds.add(auctionId);

    this.send(socket, { type: 'subscribed', auctionId });
    this.broadcastPresence(auctionId);
  }

  private unsubscribe(socket: WebSocket, auctionId: string): void {
    this.subscribers.get(auctionId)?.delete(socket);
    this.clients.get(socket)?.auctionIds.delete(auctionId);
    this.send(socket, { type: 'unsubscribed', auctionId });
    this.broadcastPresence(auctionId);
  }

  private handleClose(socket: WebSocket): void {
    const info = this.clients.get(socket);
    this.clients.delete(socket);
    for (const auctionId of info?.auctionIds ?? []) {
      this.subscribers.get(auctionId)?.delete(socket);
      this.broadcastPresence(auctionId);
    }
  }

  private broadcastPresence(auctionId: string): void {
    this.broadcastToAuction(auctionId, {
      type: 'auction.presence',
      auctionId,
      connected: this.connectedCount(auctionId),
    });
  }

  private send(socket: WebSocket, message: object): void {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  }
}