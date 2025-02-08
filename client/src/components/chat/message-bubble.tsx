import { Message } from "@shared/schema";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
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
  }[currentTheme.chat?.bubbleStyle || 'modern'];

  // Font family based on theme settings
  const getFontFamily = () => {
    const fontStyle = currentTheme.chat?.fontStyle;
    switch(fontStyle) {
      case 'default':
        return 'var(--font-sans)';
      case 'rounded':
        return 'var(--font-rounded)';
      case 'monospace':
        return 'var(--font-mono)';
      default:
        return 'var(--font-sans)';
    }
  };

  const bubbleColors = {
    backgroundColor: isCurrentUser
      ? currentTheme.chat?.userBubbleColor || '#007AFF'
      : currentTheme.chat?.otherBubbleColor || '#E9E9EB',
    color: isCurrentUser
      ? '#FFFFFF'
      : currentTheme.chat?.textColor || '#000000',
    fontFamily: getFontFamily(),
  };

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
            className={cn(
              "w-8 h-8 cursor-pointer transition-transform hover:scale-105",
              currentTheme.chat?.avatarClassName
            )}
            onClick={() => setShowProfile(true)}
          >
            <AvatarImage src={message.avatar} alt={message.sender} />
            <AvatarFallback>{message.sender[0]?.toUpperCase()}</AvatarFallback>
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
        style={bubbleColors}
        className={cn(
          "max-w-[70%] transition-colors break-words",
          bubbleStyle,
          isCurrentUser
            ? "rounded-br-sm shadow-sm"
            : "rounded-bl-sm shadow-sm",
          !isFirstInGroup && isCurrentUser && "mr-12",
          !isFirstInGroup && !isCurrentUser && "ml-12",
          currentTheme.chat?.bubbleHoverEffect && "hover:brightness-95",
          currentTheme.chat?.bubbleShadow && "shadow-md"
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