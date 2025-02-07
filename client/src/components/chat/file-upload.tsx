import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { messageFileSchema } from "@shared/schema";

export function FileUpload() {
  const { toast } = useToast();

  const { mutate, isPending } = useMutation({
    mutationFn: async (file: File) => {
      const text = await file.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error("Invalid JSON file");
      }

      const result = messageFileSchema.safeParse(data);
      if (!result.success) {
        throw new Error("Invalid message format");
      }

      await apiRequest("POST", "/api/messages/bulk", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      toast({
        title: "Success",
        description: "Messages imported successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="flex items-center gap-2">
      <Input
        type="file"
        accept=".json"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) mutate(file);
        }}
        className="max-w-[200px]"
        disabled={isPending}
      />
      <Button size="icon" disabled={isPending}>
        <Upload className="h-4 w-4" />
      </Button>
    </div>
  );
}
