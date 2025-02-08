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
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import cn from 'classnames';

const CURRENT_USER = "You";
const CURRENT_USER_AVATAR = "https://images.unsplash.com/photo-1630910561339-4e22c7150093";

export default function Chat() {
  const { toast } = useToast();
  const [currentConversation, setCurrentConversation] = useState<number>();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { isMobile, safeAreaInsets } = useIsMobile();

  const handleConversationChange = useCallback((id: number) => {
    setCurrentConversation(id);
    setIsSidebarOpen(false); // Close sidebar on mobile after selection
  }, []);

  const { data: messages = [], isLoading, error } = useQuery<Message[]>({
    queryKey: ["/api/messages", currentConversation],
    enabled: true,
    staleTime: 1000,
    refetchOnWindowFocus: false,
  });

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-6">
          <div className="text-red-500">Failed to load messages</div>
          <p className="text-sm text-muted-foreground mt-2">
            Please try refreshing the page
          </p>
        </Card>
      </div>
    );
  }

  const sidebarStyle = {
    paddingTop: isMobile ? safeAreaInsets.top : undefined,
    paddingBottom: isMobile ? safeAreaInsets.bottom : undefined,
  };

  return (
    <div className="min-h-[100dvh] bg-gray-100 md:p-4">
      <Card className="mx-auto h-[100dvh] md:h-[80dvh] md:max-w-6xl flex flex-col md:flex-row relative">
        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 left-4 md:hidden z-50"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          style={{ 
            top: isMobile ? `calc(1rem + ${safeAreaInsets.top})` : '1rem' 
          }}
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Sidebar/ConversationList */}
        <div 
          className={cn(
            "fixed inset-y-0 left-0 w-64 bg-card transform transition-transform duration-300 ease-in-out z-40",
            "md:relative md:translate-x-0 md:transform-none",
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          )}
          style={sidebarStyle}
        >
          <ConversationList
            currentConversation={currentConversation}
            onSelectConversation={handleConversationChange}
          />
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col w-full md:w-auto">
          <div className={cn(
            "p-4 border-b flex items-center justify-between sticky top-0 z-30",
            "bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
          )}>
            <h1 className="text-xl font-semibold ml-12 md:ml-0">Chat Visualization</h1>
            <div className="flex items-center gap-4">
              <ThemeSelector />
              <FileUpload />
            </div>
          </div>

          <ChatContainer 
            messages={messages} 
            currentUser={CURRENT_USER} 
            isLoading={isLoading}
          />

          <MessageInput
            sender={CURRENT_USER}
            avatar={CURRENT_USER_AVATAR}
            conversationId={currentConversation}
          />
        </div>

        {/* Overlay for mobile sidebar */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/20 z-30 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </Card>
    </div>
  );
}