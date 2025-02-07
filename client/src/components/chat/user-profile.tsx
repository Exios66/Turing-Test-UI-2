
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface UserProfileProps {
  username: string;
  avatar?: string;
  onUpdate: (data: { username: string; avatar: string }) => void;
}

export function UserProfile({ username, avatar, onUpdate }: UserProfileProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [newUsername, setNewUsername] = useState(username);
  const [newAvatar, setNewAvatar] = useState(avatar || "");
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onUpdate({ username: newUsername, avatar: newAvatar });
      setIsEditing(false);
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-4 border rounded-lg">
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={avatar} alt={username} />
          <AvatarFallback>{username[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
        {isEditing ? (
          <form onSubmit={handleSubmit} className="flex-1 space-y-2">
            <Input
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="Username"
              className="mb-2"
            />
            <Input
              value={newAvatar}
              onChange={(e) => setNewAvatar(e.target.value)}
              placeholder="Avatar URL"
              className="mb-2"
            />
            <div className="flex gap-2">
              <Button type="submit">Save</Button>
              <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex-1">
            <h3 className="font-semibold text-lg">{username}</h3>
            <Button variant="outline" onClick={() => setIsEditing(true)}>
              Edit Profile
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
