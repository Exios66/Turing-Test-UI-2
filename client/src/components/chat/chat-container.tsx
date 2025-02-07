import { Message } from "@shared/schema";
import { MessageBubble } from "./message-bubble";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEffect, useRef, useState } from "react";
import { Input } from "../ui/input";
import { UserProfile } from "./user-profile";
import { Skeleton } from "@/components/ui/skeleton";

interface ChatContainerProps {
  messages: Message[];
  currentUser?: string;
  isLoading?: boolean;
}

export function ChatContainer({ messages, currentUser, isLoading }: ChatContainerProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

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
            id={1} // TODO: Get actual user ID
            username={currentUser}
            avatar=""
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