let _replay = false;

export const setReplayOnboarding = (val: boolean): void => {
  _replay = val;
};

export const isReplayOnboarding = (): boolean => _replay;
