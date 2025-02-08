import { Message } from "@shared/schema";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/use-theme";
import { useState } from "react";
import { UserProfile } from "./user-profile";

interface MessageBubbleProps {
  message: Message;
  isCurrentUser: boolean;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
}

export function MessageBubble({ 
  message, 
  isCurrentUser,
  isFirstInGroup,
  isLastInGroup 
}: MessageBubbleProps) {
  const [showProfile, setShowProfile] = useState(false);
  const { currentTheme } = useTheme();

  // Enhanced bubble styles based on theme
  const bubbleStyle = {
    modern: "rounded-2xl px-4 py-2.5",
    classic: "rounded-lg px-3.5 py-2",
    minimal: "rounded px-3 py-1.5",
  }[currentTheme.chat.bubbleStyle || 'modern'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "flex items-end gap-2.5",
        isCurrentUser ? "flex-row-reverse" : "flex-row",
        !isLastInGroup && "mb-1",
        isLastInGroup && "mb-4"
      )}
    >
      {isFirstInGroup && (
        <>
          <Avatar 
            className="w-8 h-8 cursor-pointer transition-transform hover:scale-105" 
            onClick={() => setShowProfile(true)}
          >
            <AvatarImage src={message.avatar} alt={message.sender} />
          </Avatar>
          {showProfile && (
            <UserProfile
              id={message.profileId ?? 0}
              name={message.sender}
              avatar={message.avatar}
              onUpdate={() => setShowProfile(false)}
            />
          )}
        </>
      )}
      {!isFirstInGroup && <div className="w-8" />}
      <div
        style={{
          backgroundColor: isCurrentUser
            ? currentTheme.chat.userBubbleColor
            : currentTheme.chat.otherBubbleColor,
          fontFamily: currentTheme.chat.fontFamily || "var(--font-sans)",
          boxShadow: currentTheme.chat.bubbleShadow ? "0 1px 2px rgba(0,0,0,0.1)" : "none",
        }}
        className={cn(
          "max-w-[70%] transition-colors",
          bubbleStyle,
          isCurrentUser
            ? "text-white dark:text-white rounded-br-sm"
            : "text-foreground dark:text-foreground rounded-bl-sm",
          !isFirstInGroup && isCurrentUser && "mr-12",
          !isFirstInGroup && !isCurrentUser && "ml-12",
          currentTheme.chat.bubbleHoverEffect && "hover:brightness-95"
        )}
      >
        {isFirstInGroup && (
          <div className={cn(
            "text-sm font-medium mb-1",
            isCurrentUser ? "text-white/90" : "text-foreground/90"
          )}>
            {message.sender}
          </div>
        )}
        <div className="break-words whitespace-pre-wrap">
          {message.content}
        </div>
      </div>
    </motion.div>
  );
}