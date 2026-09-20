/** Pure, server-safe catalogue of local game-ready GLB assets. Keep this file free of Three.js imports. */
export type AssetCategory = "vehicle" | "character" | "building" | "nature" | "prop";

export interface CatalogEntry {
  name: string;
  modelUrl: string;
  scale: number;
  category: AssetCategory;
  keywords: string[];
}

export const MODEL_CATALOG: CatalogEntry[] = [
  { name:"Sports Car", modelUrl:"/models/sports-car.glb", scale:1, category:"vehicle", keywords:["sports car","supercar","sportscar","coupe","car","vehicle"] },
  { name:"Race Car", modelUrl:"/models/race-car.glb", scale:1, category:"vehicle", keywords:["race car","racecar","racing car","formula","rally car"] },
  { name:"Police Car", modelUrl:"/models/police-car.glb", scale:1, category:"vehicle", keywords:["police car","police","cop car","squad car"] },
  { name:"Taxi", modelUrl:"/models/taxi.glb", scale:1, category:"vehicle", keywords:["taxi","cab"] },
  { name:"Fire Truck", modelUrl:"/models/firetruck.glb", scale:1, category:"vehicle", keywords:["fire truck","firetruck","fire engine"] },
  { name:"Truck", modelUrl:"/models/truck.glb", scale:1, category:"vehicle", keywords:["truck","lorry","semi"] },
  { name:"Van", modelUrl:"/models/van.glb", scale:1, category:"vehicle", keywords:["van","minivan"] },
  { name:"SUV", modelUrl:"/models/suv.glb", scale:1, category:"vehicle", keywords:["suv","jeep","4x4","offroad"] },
  { name:"Sedan", modelUrl:"/models/sedan.glb", scale:1, category:"vehicle", keywords:["sedan","automobile","auto"] },

  { name:"Character (Male)", modelUrl:"/models/character-male.glb", scale:1, category:"character", keywords:["male character","man","guy","hero","player","character","person","human","npc","people"] },
  { name:"Character (Female)", modelUrl:"/models/character-female.glb", scale:1, category:"character", keywords:["female character","woman","girl","heroine","lady"] },
  { name:"Robot", modelUrl:"/models/robot.glb", scale:.6, category:"character", keywords:["robot","bot","droid","android","mech"] },

  { name:"Skyscraper", modelUrl:"/models/skyscraper.glb", scale:1, category:"building", keywords:["skyscraper","tower","high rise","highrise"] },
  { name:"Shop", modelUrl:"/models/shop.glb", scale:1, category:"building", keywords:["shop","store","storefront"] },
  { name:"Building", modelUrl:"/models/building.glb", scale:1, category:"building", keywords:["building","house","office","apartment","block"] },

  { name:"Palm Tree", modelUrl:"/models/palm-tree.glb", scale:1, category:"nature", keywords:["palm tree","palm"] },
  { name:"Pine Tree", modelUrl:"/models/pine-tree.glb", scale:1, category:"nature", keywords:["pine tree","pine","oak","fir","conifer"] },
  { name:"Tree", modelUrl:"/models/tree.glb", scale:1, category:"nature", keywords:["tree","trees","forest"] },
  { name:"Bush", modelUrl:"/models/bush.glb", scale:1, category:"nature", keywords:["bush","shrub","hedge"] },
  { name:"Grass", modelUrl:"/models/grass.glb", scale:1, category:"nature", keywords:["grass","weeds","foliage"] },
  { name:"Rock", modelUrl:"/models/rock.glb", scale:1, category:"nature", keywords:["rock","boulder","stone"] },
  { name:"Small Rock", modelUrl:"/models/small-rock.glb", scale:1, category:"nature", keywords:["small rock","pebble","small stone"] },
  { name:"Ground Tile", modelUrl:"/models/ground-tile.glb", scale:1, category:"nature", keywords:["ground tile","terrain","land","tile","floor patch"] },
  { name:"Campfire", modelUrl:"/models/campfire.glb", scale:1, category:"prop", keywords:["campfire","fire","bonfire","logs"] },

];

const KEYWORD_INDEX = MODEL_CATALOG.flatMap((entry) =>
  entry.keywords.map((keyword) => ({ keyword, entry })),
).sort((a,b) => b.keyword.length - a.keyword.length);

export function matchCatalog(prompt: string): CatalogEntry | null {
  const p = ` ${prompt.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()} `;
  return KEYWORD_INDEX.find(({keyword}) => p.includes(` ${keyword} `))?.entry ?? null;
}

export function catalogSummary(): string {
  return MODEL_CATALOG.map((e) => `${e.name}: ${e.modelUrl}; keywords: ${e.keywords.join(", ")}`).join("\n");
}
