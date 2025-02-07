import { z } from "zod";

export const themeSchema = z.object({
  name: z.string(),
  variant: z.enum(["professional", "tint", "vibrant"]),
  primary: z.string(),
  appearance: z.enum(["light", "dark", "system"]),
  radius: z.number(),
  chat: z.object({
    bubbleStyle: z.enum(["modern", "classic", "minimal"]),
    userBubbleColor: z.string(),
    otherBubbleColor: z.string(),
    fontStyle: z.enum(["default", "rounded", "monospace"]),
  }),
});

export type Theme = z.infer<typeof themeSchema>;

export const defaultThemes: Theme[] = [
  {
    name: "iMessage",
    variant: "professional",
    primary: "#007AFF",
    appearance: "light",
    radius: 12,
    chat: {
      bubbleStyle: "modern",
      userBubbleColor: "#34C759",
      otherBubbleColor: "#F2F2F7",
      fontStyle: "default",
    },
  },
  {
    name: "Dark Mode",
    variant: "professional",
    primary: "#0A84FF",
    appearance: "dark",
    radius: 8,
    chat: {
      bubbleStyle: "modern",
      userBubbleColor: "#4CAF50",
      otherBubbleColor: "#424242",
      fontStyle: "default",
    },
  },
  {
    name: "Minimal",
    variant: "tint",
    primary: "#6B7280",
    appearance: "light",
    radius: 4,
    chat: {
      bubbleStyle: "minimal",
      userBubbleColor: "#E5E7EB",
      otherBubbleColor: "#F3F4F6",
      fontStyle: "monospace",
    },
  },
];
