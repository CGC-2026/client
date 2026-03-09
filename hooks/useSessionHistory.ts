import { useWorkoutAPI } from "@/contexts/WorkoutAPI.Provider";
import { useQuery } from "@tanstack/react-query";

export function useSessionHistory(userId: string) {
  const api = useWorkoutAPI();
  return useQuery({
    queryKey: ["sessionHistory", userId],
    queryFn: () => api.getSessionHistory(userId),
    enabled: !!userId,
  });
}
