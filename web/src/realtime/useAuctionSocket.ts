import { useEffect, useRef, useState } from 'react';
import { WS_URL } from '../config';
import type { ServerMessage } from './messages';

export function useAuctionSocket(
  auctionId: string,
  token: string | null,
  onMessage: (message: ServerMessage) => void,
) {
  const [connected, setConnected] = useState(false);
  const [viewers, setViewers] = useState(0);
  const handler = useRef(onMessage);

  useEffect(() => {
    handler.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    if (!token) return;
    const socket = new WebSocket(`${WS_URL}?token=${encodeURIComponent(token)}`);

    socket.onopen = () => {
      setConnected(true);
      socket.send(JSON.stringify({ type: 'subscribe', auctionId }));
    };

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data as string) as ServerMessage;
      if (message.type === 'auction.presence') {
        setViewers(message.connected);
      }
      handler.current(message);
    };

    socket.onclose = () => setConnected(false);

    return () => socket.close();
  }, [auctionId, token]);

  return { connected, viewers };
}