
import { useState } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";

interface UserProfileProps {
  username: string;
  avatar: string;
  onUpdate: (data: { username: string; avatar: string }) => Promise<void>;
}

export function UserProfile({ username, avatar, onUpdate }: UserProfileProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [newUsername, setNewUsername] = useState(username);
  const [newAvatar, setNewAvatar] = useState(avatar);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onUpdate({ username: newUsername, avatar: newAvatar });
      setIsEditing(false);
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex items-center gap-4 p-2">
      <Avatar>
        <AvatarImage src={avatar} alt={username} />
        <AvatarFallback>{username[0]?.toUpperCase()}</AvatarFallback>
      </Avatar>
      
      {isEditing ? (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            placeholder="Username"
            className="w-32"
          />
          <Input
            value={newAvatar}
            onChange={(e) => setNewAvatar(e.target.value)}
            placeholder="Avatar URL"
            className="w-48"
          />
          <Button type="submit" size="sm">Save</Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setIsEditing(false)}>
            Cancel
          </Button>
        </form>
      ) : (
        <>
          <span className="font-medium">{username}</span>
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
            Edit Profile
          </Button>
        </>
      )}
    </div>
  );
}
