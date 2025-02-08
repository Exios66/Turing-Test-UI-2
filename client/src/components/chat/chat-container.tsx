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
import { useWebSocket } from "@/hooks/use-websocket";
import { withErrorBoundary } from "@/components/error-boundary";

interface ChatContainerProps {
  messages: Message[];
  currentUser?: string;
  isLoading?: boolean;
  currentConversation?: string;
}

const CURRENT_USER_AVATAR = "";
const DEBUG = true;

export function ChatContainer({ messages, currentUser, isLoading, currentConversation }: ChatContainerProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const { toast } = useToast();
  const { currentTheme } = useTheme();
  const { isMobile, safeAreaInsets, isLandscape } = useIsMobile();

  const handleWebSocketMessage = useCallback((message: any) => {
    if (message && !message.error) {
      queryClient.setQueryData<Message[]>(['/api/messages', currentConversation], (oldMessages = []) => {
        if (oldMessages.some((m: Message) => m.id === message.id)) {
          return oldMessages;
        }
        return [...oldMessages, message];
      });
    }
  }, [currentConversation]);

  const { isConnected, sendMessage } = useWebSocket({
    onMessage: handleWebSocketMessage,
    onConnectionChange: (connected) => {
      if (connected) {
        toast({
          title: "Connected to chat server",
          duration: 2000
        });
      }
    }
  });

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
      <div className="flex flex-col h-full bg-background" role="status">
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
          {groupedMessages.map((group: Message[], groupIndex: number) => (
            <div
              key={`message-group-${groupIndex}`}
              className={cn(
                "mb-6",
                messageClassName
              )}
            >
              {group.map((message: Message, messageIndex: number) => (
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

export default withErrorBoundary(ChatContainer);