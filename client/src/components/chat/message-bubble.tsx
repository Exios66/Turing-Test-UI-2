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
  const bubbleStyle = {
    modern: "rounded-2xl px-4 py-2",
    classic: "rounded-lg px-3 py-2",
    minimal: "rounded px-2 py-1",
  }[currentTheme.chat.bubbleStyle];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex items-end gap-2",
        isCurrentUser ? "flex-row-reverse" : "flex-row",
        !isLastInGroup && "mb-1",
        isLastInGroup && "mb-4"
      )}
    >
      {isFirstInGroup && (
        <>
          <Avatar className="w-8 h-8 cursor-pointer" onClick={() => setShowProfile(true)}>
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
          fontFamily: "var(--chat-font-family)",
        }}
        className={cn(
          "max-w-[70%]",
          bubbleStyle,
          isCurrentUser
            ? "text-white rounded-br-sm"
            : "text-black rounded-bl-sm",
          !isFirstInGroup && isCurrentUser && "mr-12",
          !isFirstInGroup && !isCurrentUser && "ml-12"
        )}
      >
        {isFirstInGroup && (
          <div className="text-sm font-medium mb-1">{message.sender}</div>
        )}
        <div className="break-words">{message.content}</div>
      </div>
    </motion.div>
  );
}