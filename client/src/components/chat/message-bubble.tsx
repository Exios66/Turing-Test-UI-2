import { Message } from "@shared/schema";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/use-theme";

interface MessageBubbleProps {
  message: Message;
  isCurrentUser: boolean;
}

export function MessageBubble({ message, isCurrentUser }: MessageBubbleProps) {
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
        "flex items-end gap-2 mb-4",
        isCurrentUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      <Avatar className="w-8 h-8">
        <AvatarImage src={message.avatar} alt={message.sender} />
      </Avatar>
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
            : "text-black rounded-bl-sm"
        )}
      >
        <div className="text-sm font-medium mb-1">{message.sender}</div>
        <div className="break-words">{message.content}</div>
      </div>
    </motion.div>
  );
}