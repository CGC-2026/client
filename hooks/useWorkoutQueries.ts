import { useWorkoutAPI } from "@/contexts/WorkoutAPI.Provider";
import { useQuery } from "@tanstack/react-query";
import { WorkoutSession, WorkoutSessionHistoryItem } from "@/types/workout.types";

export function useWorkoutTypes() {
  const api = useWorkoutAPI();
  return useQuery({
    queryKey: ["workoutTypes"],
    queryFn: () => api.getWorkoutTypes(),
  });
}

export function useSessionHistory(userId: string) {
  const api = useWorkoutAPI();
  return useQuery<WorkoutSessionHistoryItem[]>({
    queryKey: ["sessionHistory", userId],
    queryFn: () => api.getSessionHistory(userId),
    enabled: !!userId,
  });
}

export function useWorkoutSession(sessionId?: string) {
  const api = useWorkoutAPI();
  return useQuery<WorkoutSession, unknown>({
    queryKey: ["workoutSession", sessionId],
    queryFn: () => api.getWorkoutSession(sessionId ?? ""),
    enabled: !!sessionId,
  });
}
