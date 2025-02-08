import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

const RECONNECT_MAX_ATTEMPTS = 5;
const HEARTBEAT_INTERVAL = 25000;
const BACKOFF_MAX_DELAY = 30000;
const WS_PING_TIMEOUT = 10000;
const DEBUG = true;

interface WebSocketMessage {
  type: 'message' | 'connection' | 'ping' | 'pong';
  status?: 'connected' | 'disconnected';
  error?: string;
  payload?: any;
}

interface UseWebSocketOptions {
  onMessage?: (message: any) => void;
  onConnectionChange?: (isConnected: boolean) => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptRef = useRef(0);
  const [isConnected, setIsConnected] = useState(false);
  const [lastPingTime, setLastPingTime] = useState<number>(Date.now());
  const pingTimeoutRef = useRef<NodeJS.Timeout>();
  const hasShownConnectedToast = useRef(false);
  const { toast } = useToast();

  const log = useCallback((...args: any[]) => {
    if (DEBUG) {
      console.log(`[WebSocket ${new Date().toISOString()}]`, ...args);
    }
  }, []);

  const connect = useCallback(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    let heartbeatInterval: NodeJS.Timeout;

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      log('Closing existing connection before reconnect');
      wsRef.current.close();
    }

    log('Attempting to connect to', wsUrl);
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      log('WebSocket connected successfully');
      setIsConnected(true);
      reconnectAttemptRef.current = 0;
      setLastPingTime(Date.now());
      options.onConnectionChange?.(true);

      // Only show the connection toast once per session
      if (!hasShownConnectedToast.current) {
        toast({
          title: "Connected to chat server",
          duration: 2000
        });
        hasShownConnectedToast.current = true;
      }

      heartbeatInterval = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          log('Sending ping');
          socket.send(JSON.stringify({ type: 'ping' }));
          setLastPingTime(Date.now());

          if (pingTimeoutRef.current) {
            clearTimeout(pingTimeoutRef.current);
          }

          pingTimeoutRef.current = setTimeout(() => {
            log('Ping timeout - no pong received');
            socket.close(4000, 'Ping timeout');
          }, WS_PING_TIMEOUT);
        } else {
          log('Socket not open during heartbeat, state:', socket.readyState);
        }
      }, HEARTBEAT_INTERVAL);
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as WebSocketMessage;
        log('Received message:', data.type || 'message');

        if (data.type === 'connection') {
          log('Connection status:', data.status);
          return;
        }

        if (data.error) {
          log('Server reported error:', data.error);
          toast({
            title: "Error",
            description: data.error,
            variant: "destructive"
          });
          return;
        }

        if (data.type === 'pong') {
          log('Received pong');
          if (pingTimeoutRef.current) {
            clearTimeout(pingTimeoutRef.current);
          }
          setLastPingTime(Date.now());
          return;
        }

        options.onMessage?.(data);
      } catch (error) {
        log('WebSocket message processing error:', error);
      }
    };

    socket.onerror = (error) => {
      log('WebSocket error:', error);
      setIsConnected(false);
      options.onConnectionChange?.(false);
      toast({
        title: "Connection error",
        description: "Failed to connect to chat server",
        variant: "destructive"
      });
    };

    socket.onclose = (event) => {
      log(`WebSocket disconnected with code ${event.code}:`, event.reason);
      setIsConnected(false);
      options.onConnectionChange?.(false);
      clearInterval(heartbeatInterval);

      if (pingTimeoutRef.current) {
        clearTimeout(pingTimeoutRef.current);
      }

      if (event.code === 1000 || event.code === 1001) {
        log('Normal closure, not attempting reconnect');
        return;
      }

      const backoffDelay = Math.min(1000 * Math.pow(2, reconnectAttemptRef.current), BACKOFF_MAX_DELAY);
      reconnectAttemptRef.current++;

      if (document.visibilityState === 'visible' && reconnectAttemptRef.current <= RECONNECT_MAX_ATTEMPTS) {
        log(`Scheduling reconnection in ${backoffDelay}ms (attempt ${reconnectAttemptRef.current})`);
        setTimeout(connect, backoffDelay);

        if (reconnectAttemptRef.current > 1) {
          toast({
            title: "Reconnecting...",
            description: `Attempt ${reconnectAttemptRef.current} of ${RECONNECT_MAX_ATTEMPTS}`,
            duration: 3000
          });
        }
      } else if (reconnectAttemptRef.current > RECONNECT_MAX_ATTEMPTS) {
        toast({
          title: "Connection lost",
          description: "Please refresh the page to reconnect",
          variant: "destructive",
          duration: 5000
        });
      }
    };

    wsRef.current = socket;
  }, [log, toast, options]);

  useEffect(() => {
    connect();

    return () => {
      log('Cleaning up WebSocket resources');
      if (pingTimeoutRef.current) {
        clearTimeout(pingTimeoutRef.current);
      }
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.close(1000, 'Component unmounting');
      }
    };
  }, [connect, log]);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      toast({
        title: "Connection error",
        description: "Not connected to chat server",
        variant: "destructive"
      });
    }
  }, [toast]);

  return {
    isConnected,
    lastPingTime,
    sendMessage,
  };
}