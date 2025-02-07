import { useState } from "react";
import { ChatContainer } from "@/components/chat/chat-container";
import { MessageInput } from "@/components/chat/message-input";
import { FileUpload } from "@/components/chat/file-upload";
import { ThemeSelector } from "@/components/chat/theme-selector";
import { ConversationList } from "@/components/chat/conversation-list";
import { useQuery } from "@tanstack/react-query";
import type { Message } from "@shared/schema";
import { Card } from "@/components/ui/card";

const CURRENT_USER = "You";
const CURRENT_USER_AVATAR = "https://images.unsplash.com/photo-1630910561339-4e22c7150093";

export default function Chat() {
  const [currentConversation, setCurrentConversation] = useState<number>();

  const { data: messages = [], isLoading } = useQuery<Message[]>({
    queryKey: ["/api/messages", currentConversation],
    queryFn: async ({ queryKey }) => {
      const conversationId = queryKey[1];
      const response = await fetch(
        conversationId
          ? `/api/messages/${conversationId}`
          : "/api/messages"
      );
      if (!response.ok) throw new Error("Failed to fetch messages");
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading messages...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <Card className="max-w-6xl mx-auto h-[80vh] flex">
        <ConversationList
          currentConversation={currentConversation}
          onSelectConversation={setCurrentConversation}
        />
        <div className="flex-1 flex flex-col">
          <div className="p-4 border-b flex items-center justify-between">
            <h1 className="text-xl font-semibold">Chat Visualization</h1>
            <div className="flex items-center gap-4">
              <ThemeSelector />
              <FileUpload />
            </div>
          </div>
          <ChatContainer messages={messages} currentUser={CURRENT_USER} />
          <MessageInput
            sender={CURRENT_USER}
            avatar={CURRENT_USER_AVATAR}
            conversationId={currentConversation}
          />
        </div>
      </Card>
    </div>
  );
}