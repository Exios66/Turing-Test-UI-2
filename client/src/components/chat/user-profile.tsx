import { useState } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { updateProfile } from '@/lib/api';
import { z } from 'zod';
import { type Profile } from '@shared/schema';

const profileUpdateSchema = z.object({
  name: z.string().min(1, "Name is required").max(50, "Name must be 50 characters or less"),
  avatar: z.string().url("Invalid avatar URL").max(255, "Avatar URL is too long"),
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
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setNewName(name);
    setNewAvatar(avatar);
    setError(null);
    setIsEditing(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const validatedData = profileUpdateSchema.parse({
        name: newName.trim(),
        avatar: newAvatar.trim(),
      });

      setIsLoading(true);
      const updatedProfile = await updateProfile(id, validatedData);

      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
        duration: 3000,
      });

      if (onUpdate) {
        onUpdate(updatedProfile);
      }

      setIsEditing(false);
    } catch (error) {
      console.error('Profile update failed:', error);

      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        setError(firstError.message);
        toast({
          title: "Validation Error",
          description: firstError.message,
          variant: "destructive",
          duration: 5000,
        });
      } else {
        const errorMessage = error instanceof Error ? error.message : "Failed to update profile";
        setError(errorMessage);
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
          duration: 5000,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-4 p-2">
      <Avatar className="w-10 h-10">
        <AvatarImage src={avatar} alt={name} />
        <AvatarFallback>{name[0]?.toUpperCase()}</AvatarFallback>
      </Avatar>

      {isEditing ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 w-full max-w-md">
          <div>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Name"
              className="w-full mb-2"
              disabled={isLoading}
              aria-label="Name"
              aria-invalid={error ? "true" : "false"}
            />
            <Input
              value={newAvatar}
              onChange={(e) => setNewAvatar(e.target.value)}
              placeholder="Avatar URL"
              className="w-full"
              disabled={isLoading}
              aria-label="Avatar URL"
              aria-invalid={error ? "true" : "false"}
            />
            {error && (
              <p className="text-sm text-destructive mt-1">{error}</p>
            )}
          </div>
          <div className="flex gap-2 mt-2">
            <Button 
              type="submit" 
              size="sm" 
              disabled={isLoading}
              aria-busy={isLoading}
            >
              {isLoading ? "Saving..." : "Save"}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              onClick={resetForm}
              disabled={isLoading}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex items-center gap-4">
          <span className="font-medium">{name}</span>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsEditing(true)}
            className="hover:bg-secondary"
          >
            Edit Profile
          </Button>
        </div>
      )}
    </div>
  );
}