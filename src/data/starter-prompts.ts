import { PersonaId } from "@/types/persona";

export interface StarterPrompt {
  label: string;
  message: string;
}

const universalPrompts: StarterPrompt[] = [
  {
    label: "Build a campaign",
    message: "Help me build a campaign",
  },
  {
    label: "Connect data",
    message: "I want to connect a data source to start tracking conversions",
  },
  {
    label: "Build an audience",
    message: "Help me build an audience for my next campaign",
  },
];

export const starterPrompts: Record<PersonaId, StarterPrompt[]> = {
  "cynthia-b2c": universalPrompts,
  "cynthia-b2b": universalPrompts,
  "cynthia-agency": universalPrompts,
};
