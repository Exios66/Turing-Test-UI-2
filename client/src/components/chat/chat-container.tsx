import { Message } from "@shared/schema";
import { MessageBubble } from "./message-bubble";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEffect, useRef, useState } from "react";
import { Input } from "../ui/input";
import { UserProfile } from "./user-profile";
import { Skeleton } from "@/components/ui/skeleton";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ChatContainerProps {
  messages: Message[];
  currentUser?: string;
  isLoading?: boolean;
  currentConversation?: string;
}

export function ChatContainer({ messages, currentUser, isLoading, currentConversation }: ChatContainerProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptRef = useRef(0);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Setup WebSocket connection
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    let heartbeatInterval: NodeJS.Timeout;

    function connect() {
      const socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        reconnectAttemptRef.current = 0;
        toast({
          title: "Connected to chat server",
          duration: 2000
        });

        // Start heartbeat
        heartbeatInterval = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'ping' }));
          }
        }, 25000); // Every 25 seconds
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Handle connection status messages
          if (data.type === 'connection') {
            console.log('Connection status:', data.status);
            return;
          }

          // Handle error messages
          if (data.error) {
            console.error('Server reported error:', data.error);
            toast({
              title: "Error",
              description: data.error,
              variant: "destructive"
            });
            return;
          }

          // Handle chat messages
          const message = data as Message;
          queryClient.setQueryData<Message[]>(['/api/messages', currentConversation], (oldMessages = []) => {
            if (oldMessages.some(m => m.id === message.id)) {
              return oldMessages;
            }
            return [...oldMessages, message];
          });
        } catch (error) {
          console.error('WebSocket message processing error:', error);
        }
      };

      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
        toast({
          title: "Connection error",
          description: "Failed to connect to chat server",
          variant: "destructive"
        });
      };

      socket.onclose = (event) => {
        console.log(`WebSocket disconnected with code ${event.code}:`, event.reason);
        setIsConnected(false);
        clearInterval(heartbeatInterval);

        // Implement exponential backoff for reconnection
        const backoffDelay = Math.min(1000 * Math.pow(2, reconnectAttemptRef.current), 30000);
        reconnectAttemptRef.current++;

        // Only attempt reconnection if the page is visible and we haven't exceeded max attempts
        const maxReconnectAttempts = 5;
        if (document.visibilityState === 'visible' && reconnectAttemptRef.current <= maxReconnectAttempts) {
          console.log(`Attempting reconnection in ${backoffDelay}ms (attempt ${reconnectAttemptRef.current})`);
          setTimeout(connect, backoffDelay);

          if (reconnectAttemptRef.current > 1) {
            toast({
              title: "Reconnecting...",
              description: `Attempt ${reconnectAttemptRef.current} of ${maxReconnectAttempts}`,
              duration: 3000
            });
          }
        } else {
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

    // Cleanup on unmount
    return () => {
      clearInterval(heartbeatInterval);
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.close(1000, 'Component unmounting');
      }
    };
  }, [currentConversation, toast]);

  const filteredMessages = messages.filter(message =>
    message.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const scrollToBottom = () => {
    if (bottomRef.current && isAutoScrollEnabled) {
      try {
        bottomRef.current.scrollIntoView({ behavior: "smooth" });
      } catch (error) {
        console.error('Error scrolling to bottom:', error);
        // Fallback to instant scroll if smooth scroll fails
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
      <div className="flex flex-col h-full">
        <div className="p-4 space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-20 w-3/4" />
          <Skeleton className="h-20 w-2/3" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-2 border-b">
        {currentUser && (
          <UserProfile
            id={1}
            name={currentUser}
            avatar=""
            onUpdate={() => {
              // Use the correct invalidation query format for TanStack Query v5
              queryClient.invalidateQueries({ queryKey: ['/api/profiles'] });
            }}
          />
        )}
        <button
          onClick={() => setShowSearch(!showSearch)}
          className="p-2 hover:bg-muted rounded-md text-sm"
        >
          {showSearch ? "Hide Search" : "Show Search"}
        </button>
        {showSearch && (
          <div className="mt-2">
            <Input
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-md"
            />
          </div>
        )}
      </div>
      <ScrollArea className="flex-1 p-4" onScroll={handleScroll}>
        <div className="flex-1 overflow-y-auto p-4">
          {groupedMessages.map((group, groupIndex) => (
            <div key={groupIndex} className="mb-6">
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