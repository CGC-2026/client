import { WorkoutAPIService } from "@/services/workout.service";
import React, { createContext, useContext, useMemo } from "react";
import { useAuthApiClient } from "./AuthApi.Provider";

const WorkoutAPIContext = createContext<WorkoutAPIService | undefined>(undefined);

export const WorkoutAPIProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const authClient = useAuthApiClient();

  const workoutAPI = useMemo(() => {
    if (!authClient) return null;
    return new WorkoutAPIService(authClient);
  }, [authClient]);

  if (!workoutAPI) return null;

  return (
    <WorkoutAPIContext.Provider value={workoutAPI}>
      {children}
    </WorkoutAPIContext.Provider>
  );
};

export function useWorkoutAPI(): WorkoutAPIService {
  const context = useContext(WorkoutAPIContext);
  if (!context) {
    throw new Error("useWorkoutAPI must be used within a WorkoutAPIProvider");
  }
  return context;
}
