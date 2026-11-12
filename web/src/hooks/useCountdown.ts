import { useEffect, useState } from 'react';

export function useCountdown(target: string): number {
  const [remaining, setRemaining] = useState(() => new Date(target).getTime() - Date.now());

  useEffect(() => {
    const timer = setInterval(() => setRemaining(new Date(target).getTime() - Date.now()), 1000);
    return () => clearInterval(timer);
  }, [target]);

  return Math.max(0, remaining);
}

export function formatRemaining(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => String(value).padStart(2, '0');
  return days > 0 ? `${days}d ${pad(hours)}h ${pad(minutes)}m` : `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}