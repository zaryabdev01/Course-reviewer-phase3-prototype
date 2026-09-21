import { create } from "zustand";
import { persist } from "zustand/middleware";

/** Points, levels, badges, challenges — M5's Gamification line, which was
 * entirely unbuilt. Kept genuinely simple (no server-side rules engine,
 * this is a frontend prototype) but the points/level/badge mechanics are
 * real and persist across the session via localStorage. */
export type BadgeId = "getting_started" | "certified" | "perfect_score" | "fast_learner";

export const BADGES: Record<BadgeId, { label: string; description: string }> = {
  getting_started: { label: "Getting Started", description: "Completed your first module" },
  certified: { label: "Certified", description: "Passed an assessment" },
  perfect_score: { label: "Perfect Score", description: "Scored 100% on an assessment" },
  fast_learner: { label: "Fast Learner", description: "Completed a course without repeating a module" },
};

interface GamificationState {
  points: number;
  badges: BadgeId[];
  coursesCompleted: number;
  addPoints: (n: number) => void;
  awardBadge: (id: BadgeId) => boolean; // returns true if newly awarded
  incrementCoursesCompleted: () => void;
}

export const useGamificationStore = create<GamificationState>()(
  persist(
    (set, get) => ({
      points: 0,
      badges: [],
      coursesCompleted: 0,
      addPoints: (n) => set((s) => ({ points: s.points + n })),
      awardBadge: (id) => {
        if (get().badges.includes(id)) return false;
        set((s) => ({ badges: [...s.badges, id] }));
        return true;
      },
      incrementCoursesCompleted: () => set((s) => ({ coursesCompleted: s.coursesCompleted + 1 })),
    }),
    { name: "phase3-prototype-gamification" },
  ),
);

export function levelForPoints(points: number): number {
  return Math.floor(points / 50) + 1;
}
