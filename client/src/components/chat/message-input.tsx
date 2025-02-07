import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { insertMessageSchema } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

interface MessageInputProps {
  sender: string;
  avatar: string;
  conversationId?: number;
}

export function MessageInput({ sender, avatar, conversationId }: MessageInputProps) {
  const form = useForm({
    resolver: zodResolver(insertMessageSchema),
    defaultValues: {
      content: "",
      sender,
      avatar,
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: async (values: { content: string; sender: string; avatar: string }) => {
      await apiRequest("POST", "/api/messages", {
        ...values,
        conversationId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages", conversationId] });
      form.reset();
    },
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) => mutate(values))}
        className="flex items-center gap-2 p-4 border-t"
      >
        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem className="flex-1">
              <FormControl>
                <Input
                  placeholder="Type a message..."
                  {...field}
                  disabled={isPending}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <Button type="submit" size="icon" disabled={isPending}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </Form>
  );
}