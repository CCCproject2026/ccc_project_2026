export const alarmStore = {
  alarms: [] as Array<{ id: string; description: string; severity: string }> ,
  setAlarms(alarms: Array<{ id: string; description: string; severity: string }>) {
    this.alarms = alarms;
  },
};
