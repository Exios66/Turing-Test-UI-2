import { Message } from "@shared/schema";
import { MessageBubble } from "./message-bubble";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEffect, useRef, useState } from "react";
import { Input } from "../ui/input";

interface ChatContainerProps {
  messages: Message[];
  currentUser?: string;
}

export function ChatContainer({ messages, currentUser }: ChatContainerProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredMessages = messages.filter(message => 
    message.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    console.log('Messages updated:', messages.length);
    if (isAutoScrollEnabled && bottomRef.current) {
      try {
        bottomRef.current.scrollIntoView({ behavior: "smooth" });
      } catch (error) {
        console.error('Error scrolling to bottom:', error);
      }
    }
  }, [messages, isAutoScrollEnabled]);

  // Handle scroll events to disable auto-scroll when user scrolls up
  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const { scrollHeight, scrollTop, clientHeight } = event.currentTarget;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setIsAutoScrollEnabled(isNearBottom);
  };

  // Group messages by sender for better visualization
  const groupedMessages = filteredMessages.reduce((groups: Message[][], message) => {
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && lastGroup[0].sender === message.sender) {
      lastGroup.push(message);
    } else {
      groups.push([message]);
    }
    return groups;
  }, []);

  return (
    <ScrollArea className="flex-1 p-4" onScroll={handleScroll}>
      <div className="p-4 border-b">
        <Input
          placeholder="Search messages..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />
      </div>
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
  );
}