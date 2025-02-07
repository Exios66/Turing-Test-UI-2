import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Conversation } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface ConversationListProps {
  currentConversation?: number;
  onSelectConversation: (id: number) => void;
}

export function ConversationList({
  currentConversation,
  onSelectConversation,
}: ConversationListProps) {
  const { toast } = useToast();
  const [newConversationName, setNewConversationName] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
  });

  const { mutate: createConversation } = useMutation({
    mutationFn: async (name: string) => {
      await apiRequest("POST", "/api/conversations", { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setNewConversationName("");
      setIsDialogOpen(false);
      toast({
        title: "Success",
        description: "New conversation created",
      });
    },
  });

  const { mutate: clearMessages } = useMutation({
    mutationFn: async (conversationId: number) => {
      await apiRequest("DELETE", `/api/messages/${conversationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      toast({
        title: "Success",
        description: "Messages cleared",
      });
    },
  });

  return (
    <div className="w-64 border-r p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Conversations</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Conversation</DialogTitle>
            </DialogHeader>
            <div className="flex gap-2">
              <Input
                value={newConversationName}
                onChange={(e) => setNewConversationName(e.target.value)}
                placeholder="Conversation name"
              />
              <Button
                onClick={() => createConversation(newConversationName)}
                disabled={!newConversationName}
              >
                Create
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="flex flex-col gap-2">
        {conversations.map((conversation) => (
          <div
            key={conversation.id}
            className="flex items-center justify-between group"
          >
            <Button
              variant={currentConversation === conversation.id ? "secondary" : "ghost"}
              className="w-full justify-start"
              onClick={() => onSelectConversation(conversation.id)}
            >
              {conversation.name}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="opacity-0 group-hover:opacity-100"
              onClick={() => clearMessages(conversation.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
