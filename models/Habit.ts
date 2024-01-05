export interface Habit {
  id: number;
  name: string;
  color: string;
}

export interface ActivityLog {
  id: number;
  habitId: number;
  logDate: Date;
}