import { useWorkoutAPI } from "@/contexts/WorkoutAPI.Provider";
import { useQuery } from "@tanstack/react-query";

export function useWorkoutTypes() {
  const api = useWorkoutAPI();
  return useQuery({
    queryKey: ["workoutTypes"],
    queryFn: () => api.getWorkoutTypes(),
  });
}
