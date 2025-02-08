import { useState } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { updateProfile } from '@/lib/api';
import { z } from 'zod';
import { type Profile } from '@shared/schema';

const profileUpdateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  avatar: z.string().url("Invalid avatar URL"),
});

interface UserProfileProps {
  id: number;
  name: string;
  avatar: string;
  onUpdate?: (profile: Profile) => void;
}

export function UserProfile({ id, name, avatar, onUpdate }: UserProfileProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [newName, setNewName] = useState(name);
  const [newAvatar, setNewAvatar] = useState(avatar);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const validatedData = profileUpdateSchema.parse({
        name: newName,
        avatar: newAvatar,
      });

      setIsLoading(true);
      const updatedProfile = await updateProfile(id, validatedData);
      setIsEditing(false);

      if (onUpdate) {
        onUpdate(updatedProfile);
      }

      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
    } catch (error) {
      console.error('Profile update failed:', error);
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to update profile",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-4 p-2">
      <Avatar>
        <AvatarImage src={avatar} alt={name} />
        <AvatarFallback>{name[0]?.toUpperCase()}</AvatarFallback>
      </Avatar>

      {isEditing ? (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Name"
            className="w-32"
            disabled={isLoading}
          />
          <Input
            value={newAvatar}
            onChange={(e) => setNewAvatar(e.target.value)}
            placeholder="Avatar URL"
            className="w-48"
            disabled={isLoading}
          />
          <Button type="submit" size="sm" disabled={isLoading}>
            {isLoading ? "Saving..." : "Save"}
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            size="sm" 
            onClick={() => {
              setNewName(name);
              setNewAvatar(avatar);
              setIsEditing(false);
            }}
            disabled={isLoading}
          >
            Cancel
          </Button>
        </form>
      ) : (
        <>
          <span className="font-medium">{name}</span>
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
            Edit Profile
          </Button>
        </>
      )}
    </div>
  );
}