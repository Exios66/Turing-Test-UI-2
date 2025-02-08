import { useState, useCallback, useEffect, useRef } from "react";
import { Message } from "@shared/schema";
import { MessageBubble } from "./message-bubble";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "../ui/input";
import { UserProfile } from "./user-profile";
import { Skeleton } from "@/components/ui/skeleton";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/use-theme";
import { useIsMobile } from "@/hooks/use-mobile";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2 } from "lucide-react";

interface ChatContainerProps {
  messages: Message[];
  currentUser?: string;
  isLoading?: boolean;
  currentConversation?: string;
}

const CURRENT_USER_AVATAR = "";
const RECONNECT_MAX_ATTEMPTS = 5;
const HEARTBEAT_INTERVAL = 25000;
const BACKOFF_MAX_DELAY = 30000;
const WS_PING_TIMEOUT = 10000;
const DEBUG = true;

export function ChatContainer({ messages, currentUser, isLoading, currentConversation }: ChatContainerProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptRef = useRef(0);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [lastPingTime, setLastPingTime] = useState<number>(Date.now());
  const pingTimeoutRef = useRef<NodeJS.Timeout>();
  const { toast } = useToast();
  const { currentTheme } = useTheme();
  const { isMobile, safeAreaInsets, isLandscape } = useIsMobile();

  // Enhanced logging function
  const log = useCallback((...args: any[]) => {
    if (DEBUG) {
      console.log(`[WebSocket ${new Date().toISOString()}]`, ...args);
    }
  }, []);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    let heartbeatInterval: NodeJS.Timeout;
    let reconnectTimeout: NodeJS.Timeout;

    function connect() {
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

        toast({
          title: "Connected to chat server",
          duration: 2000
        });

        // Start heartbeat
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
          const data = JSON.parse(event.data);
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

          // Handle regular message
          const message = data as Message;
          queryClient.setQueryData<Message[]>(['/api/messages', currentConversation], (oldMessages = []) => {
            if (oldMessages.some(m => m.id === message.id)) {
              return oldMessages;
            }
            return [...oldMessages, message];
          });
        } catch (error) {
          log('WebSocket message processing error:', error);
        }
      };

      socket.onerror = (error) => {
        log('WebSocket error:', error);
        setIsConnected(false);
        toast({
          title: "Connection error",
          description: "Failed to connect to chat server",
          variant: "destructive"
        });
      };

      socket.onclose = (event) => {
        log(`WebSocket disconnected with code ${event.code}:`, event.reason);
        setIsConnected(false);
        clearInterval(heartbeatInterval);

        if (pingTimeoutRef.current) {
          clearTimeout(pingTimeoutRef.current);
        }

        // Don't reconnect for normal closures
        if (event.code === 1000 || event.code === 1001) {
          log('Normal closure, not attempting reconnect');
          return;
        }

        const backoffDelay = Math.min(1000 * Math.pow(2, reconnectAttemptRef.current), BACKOFF_MAX_DELAY);
        reconnectAttemptRef.current++;

        if (document.visibilityState === 'visible' && reconnectAttemptRef.current <= RECONNECT_MAX_ATTEMPTS) {
          log(`Scheduling reconnection in ${backoffDelay}ms (attempt ${reconnectAttemptRef.current})`);

          // Clear any existing reconnect timeout
          if (reconnectTimeout) {
            clearTimeout(reconnectTimeout);
          }

          reconnectTimeout = setTimeout(connect, backoffDelay);

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
    }

    connect();

    // Clear all timeouts and intervals on cleanup
    return () => {
      log('Cleaning up WebSocket resources');
      clearInterval(heartbeatInterval);
      clearTimeout(reconnectTimeout);
      if (pingTimeoutRef.current) {
        clearTimeout(pingTimeoutRef.current);
      }
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.close(1000, 'Component unmounting');
      }
    };
  }, [currentConversation, toast, log]);

  const filteredMessages = messages.filter(message =>
    message.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const scrollToBottom = () => {
    if (bottomRef.current && isAutoScrollEnabled) {
      try {
        bottomRef.current.scrollIntoView({ behavior: "smooth" });
      } catch (error) {
        console.error('Error scrolling to bottom:', error);
        bottomRef.current.scrollIntoView();
      }
    }
  };

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, isAutoScrollEnabled]);

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const { scrollHeight, scrollTop, clientHeight } = event.currentTarget;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setIsAutoScrollEnabled(isNearBottom);
  };

  const groupedMessages = filteredMessages.reduce((groups: Message[][], message) => {
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && lastGroup[0].sender === message.sender) {
      lastGroup.push(message);
    } else {
      groups.push([message]);
    }
    return groups;
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col h-full bg-background">
        <div className="p-4 space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-20 w-3/4" />
          <Skeleton className="h-20 w-2/3" />
        </div>
      </div>
    );
  }

  const containerStyle = {
    backgroundColor: currentTheme.chat?.background || 'transparent',
    color: currentTheme.chat?.textColor || 'inherit',
    paddingTop: isMobile ? `max(${safeAreaInsets.top}, 1rem)` : undefined,
    paddingBottom: isMobile ? `max(${safeAreaInsets.bottom}, 0.5rem)` : undefined,
    height: isMobile ? (isLandscape ? '100%' : '100dvh') : '100%',
  };

  const messageClassName = currentTheme.chat?.messageClassName;

  const ConnectionStatus = () => (
    <div className="flex items-center gap-2">
      <Badge variant={isConnected ? "default" : "destructive"}>
        {isConnected ? (
          <>
            <CheckCircle2 className="w-4 h-4 mr-1" />
            Connected
          </>
        ) : (
          <>
            <AlertCircle className="w-4 h-4 mr-1" />
            Disconnected
          </>
        )}
      </Badge>
    </div>
  );

  return (
    <div
      className={cn(
        "flex flex-col transition-colors",
        currentTheme.chat?.containerClassName,
        isMobile && "min-h-screen overflow-hidden"
      )}
      style={containerStyle}
    >
      <div className={cn(
        "p-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-20",
        isMobile && "safe-area-x"
      )}>
        <div className="flex items-center justify-between">
          {currentUser && (
            <UserProfile
              id={1}
              name={currentUser}
              avatar={CURRENT_USER_AVATAR}
              onUpdate={() => {
                queryClient.invalidateQueries({ queryKey: ['/api/profiles'] });
              }}
            />
          )}
          <ConnectionStatus />
        </div>
        <button
          onClick={() => setShowSearch(!showSearch)}
          className="p-2 hover:bg-muted rounded-md text-sm transition-colors"
        >
          {showSearch ? "Hide Search" : "Show Search"}
        </button>
        {showSearch && (
          <div className="mt-2">
            <Input
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                "max-w-md",
                currentTheme.chat?.inputClassName
              )}
              style={{
                backgroundColor: currentTheme.chat?.inputBackground,
                borderColor: currentTheme.chat?.inputBorder,
              }}
            />
          </div>
        )}
      </div>
      <ScrollArea
        className={cn(
          "flex-1 p-4 relative",
          currentTheme.chat?.scrollAreaClassName,
          isMobile && "safe-area-x"
        )}
        onScroll={handleScroll}
      >
        <div className="flex-1 overflow-y-auto p-4">
          {groupedMessages.map((group, groupIndex) => (
            <div
              key={groupIndex}
              className={cn(
                "mb-6",
                messageClassName
              )}
            >
              {group.map((message, messageIndex) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isCurrentUser={message.sender === currentUser}
                  isFirstInGroup={messageIndex === 0}
                  isLastInGroup={messageIndex === group.length - 1}
                />
              ))}
            </div>
          ))}
        </div>
        <div ref={bottomRef} />
      </ScrollArea>
    </div>
  );
}