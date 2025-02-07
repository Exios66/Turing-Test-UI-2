import { Message } from "@shared/schema";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  message: Message;
  isCurrentUser: boolean;
}

export function MessageBubble({ message, isCurrentUser }: MessageBubbleProps) {
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
        className={cn(
          "max-w-[70%] rounded-2xl px-4 py-2",
          isCurrentUser
            ? "bg-[#34C759] text-white rounded-br-sm"
            : "bg-[#F2F2F7] text-black rounded-bl-sm"
        )}
      >
        <div className="text-sm font-medium mb-1">{message.sender}</div>
        <div className="break-words">{message.content}</div>
      </div>
    </motion.div>
  );
}
