import { useWorkoutAPI } from "@/contexts/WorkoutAPI.Provider";
import { useQuery } from "@tanstack/react-query";

export function useWorkoutTypes() {
  const api = useWorkoutAPI();
  return useQuery({
    queryKey: ["workoutTypes"],
    queryFn: () => api.getWorkoutTypes(),
  });
}

export function useSessionHistory(userId: string) {
  const api = useWorkoutAPI();
  return useQuery({
    queryKey: ["sessionHistory", userId],
    queryFn: () => api.getSessionHistory(userId),
    enabled: !!userId,
  });
}
