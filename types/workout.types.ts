
export interface UserCalibrationData {
  userId: string;
  standingYawAngle: number;
  standingPitchAngle: number;
  standingRollAngle: number;
  updatedAt: Date;
}

export type CreateUserCalibrationData = Omit<UserCalibrationData, "userId" | "updatedAt">;

export const DEFAULT_USER_CALIBRATION_DATA: UserCalibrationData = {
  userId: "",
  standingYawAngle: 0,
  standingPitchAngle: 0,
  standingRollAngle: 0,
  updatedAt: new Date()
};
