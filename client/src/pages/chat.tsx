import { useState, useCallback } from "react";
import { ChatContainer } from "@/components/chat/chat-container";
import { MessageInput } from "@/components/chat/message-input";
import { FileUpload } from "@/components/chat/file-upload";
import { ThemeSelector } from "@/components/chat/theme-selector";
import { ConversationList } from "@/components/chat/conversation-list";
import { useQuery } from "@tanstack/react-query";
import type { Message } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const CURRENT_USER = "You";
const CURRENT_USER_AVATAR = "https://images.unsplash.com/photo-1630910561339-4e22c7150093";

export default function Chat() {
  const { toast } = useToast();
  const [currentConversation, setCurrentConversation] = useState<number>();

  const handleConversationChange = useCallback((id: number) => {
    console.log('Switching to conversation:', id);
    setCurrentConversation(id);
  }, []);

  const { data: messages = [], isLoading, error } = useQuery<Message[]>({
    queryKey: ["/api/messages", currentConversation],
    queryFn: async ({ queryKey }) => {
      const conversationId = queryKey[1];
      console.log('Fetching messages for conversation:', conversationId);
      try {
        const response = await fetch(
          conversationId
            ? `/api/messages/${conversationId}`
            : "/api/messages"
        );
        if (!response.ok) {
          throw new Error(`Failed to fetch messages: ${response.statusText}`);
        }
        const data = await response.json();
        console.log('Fetched messages:', data.length);
        return data;
      } catch (err) {
        console.error('Error fetching messages:', err);
        toast({
          title: "Error",
          description: "Failed to load messages. Please try again.",
          variant: "destructive",
        });
        throw err;
      }
    },
    staleTime: 1000, // Prevent rapid refetches
    refetchOnWindowFocus: false, // Disable automatic refetch on window focus
  });

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-500">Failed to load messages</div>
      </div>
    );
  }

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
          onSelectConversation={handleConversationChange}
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