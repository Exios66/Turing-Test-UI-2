import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./theme-toggle";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Loader2 } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";

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

  const { data: conversations = [], isLoading, error } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
  });

  const { mutate: createConversation, isPending: isCreating } = useMutation({
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
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create conversation",
        variant: "destructive",
      });
    },
  });

  const { mutate: clearMessages, isPending: isClearing } = useMutation({
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
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to clear messages",
        variant: "destructive",
      });
    },
  });

  if (error) {
    return (
      <div className="w-64 border-r p-4 flex flex-col gap-4">
        <div className="text-red-500">Failed to load conversations</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="w-64 border-r p-4 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-64 border-r p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Conversations</h2>
        <div className="flex items-center gap-2">
          <ThemeToggle />
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
                  disabled={isCreating}
                />
                <Button
                  onClick={() => createConversation(newConversationName)}
                  disabled={!newConversationName || isCreating}
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Creating...
                    </>
                  ) : (
                    "Create"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
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
              disabled={isClearing}
            >
              {isClearing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}