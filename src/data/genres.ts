/** Genre / sub-genre matrix used by the Game Blueprint Configuration panel. */

export interface GenreGroup {
  genre: string;
  subGenres: string[];
}

export const GENRE_MATRIX: GenreGroup[] = [
  {
    genre: "Action",
    subGenres: [
      "Hack and Slash",
      "Beat 'em Up",
      "Character Action",
      "Bullet Hell",
      "Stealth Action",
      "Arena Brawler",
      "Rhythm Action",
    ],
  },
  {
    genre: "Shooter",
    subGenres: [
      "First-Person Shooter",
      "Third-Person Shooter",
      "Immersive Sim",
      "Hero Shooter",
      "Extraction Shooter",
      "Tactical Milsim",
      "Looter Shooter",
      "Battle Royale",
    ],
  },
  {
    genre: "RPG",
    subGenres: [
      "Soulslike",
      "Action RPG",
      "CRPG",
      "JRPG",
      "Tactical RPG",
      "Open-World RPG",
      "Dungeon Crawler",
      "MMORPG",
    ],
  },
  {
    genre: "Strategy",
    subGenres: [
      "Real-Time Strategy",
      "Turn-Based Strategy",
      "Auto-Battler",
      "4X",
      "Grand Strategy",
      "Tower Defense",
      "MOBA",
    ],
  },
  {
    genre: "Simulation",
    subGenres: [
      "Vehicle Sim",
      "Flight Sim",
      "Life Sim",
      "Colony Sim",
      "Farming Sim",
      "Space Sim",
      "Physics Sandbox",
    ],
  },
  {
    genre: "Racing",
    subGenres: [
      "Arcade Racer",
      "Sim Racer",
      "Kart Racer",
      "Open-World Racer",
      "Combat Racing",
      "Time Trial",
    ],
  },
  {
    genre: "Platformer",
    subGenres: [
      "3D Platformer",
      "Precision Platformer",
      "Metroidvania",
      "Puzzle Platformer",
      "Runner",
    ],
  },
  {
    genre: "Horror",
    subGenres: [
      "Survival Horror",
      "Stealth Horror",
      "Psychological Horror",
      "Cosmic Horror",
      "Asymmetric Multiplayer Horror",
    ],
  },
  {
    genre: "Survival",
    subGenres: [
      "Crafting Survival",
      "Base Building",
      "Roguelike",
      "Roguelite",
      "Open-World Survival",
    ],
  },
  {
    genre: "Adventure",
    subGenres: [
      "Narrative Adventure",
      "Point & Click",
      "Walking Simulator",
      "Visual Novel",
      "Exploration",
    ],
  },
  {
    genre: "Puzzle",
    subGenres: [
      "Physics Puzzle",
      "Escape Room",
      "Match & Merge",
      "Logic Grid",
      "Portal-Style Spatial",
    ],
  },
  {
    genre: "Sports",
    subGenres: [
      "Football",
      "Basketball",
      "Extreme Sports",
      "Golf",
      "Fighting Sports",
      "Sports Management",
    ],
  },
  {
    genre: "Sandbox",
    subGenres: [
      "Voxel Builder",
      "City Builder",
      "Creative Mode",
      "Destruction Sandbox",
      "Modding Playground",
    ],
  },
];

export type MultiplayerMode = "singleplayer" | "split-screen" | "online" | "online-coop";

export const MULTIPLAYER_MODES: Array<{ value: MultiplayerMode; label: string }> = [
  { value: "singleplayer", label: "Singleplayer" },
  { value: "split-screen", label: "Local Split-Screen" },
  { value: "online", label: "Online Multiplayer" },
  { value: "online-coop", label: "Online Co-Op" },
];
