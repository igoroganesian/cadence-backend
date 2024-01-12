export interface Habit {
  id: number;
  name: string;
  color: string;
  activityLog: Date[];
}

export interface ActivityLog {
  id: number;
  habitId: number;
  logDate: Date;
}