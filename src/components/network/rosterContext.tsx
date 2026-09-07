import { createContext, useContext, type ReactNode } from "react";

/**
 * The roster (join/leave only) is produced by useNetworkSync outside the
 * Canvas and passed down through context, so socket lifecycle state never
 * lives inside the 3D tree.
 */
const RosterContext = createContext<string[]>([]);

export function RosterProvider({
  roster,
  children,
}: {
  roster: string[];
  children: ReactNode;
}) {
  return <RosterContext.Provider value={roster}>{children}</RosterContext.Provider>;
}

export function useNetworkRoster(): string[] {
  return useContext(RosterContext);
}
