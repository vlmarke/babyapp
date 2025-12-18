
export type EntryType = 'breast_left' | 'breast_right' | 'bottle' | 'diaper_wet' | 'diaper_dirty' | 'diaper_both' | 'sleep';

export interface LogEntry {
  id: string;
  type: EntryType;
  timestamp: number;
  duration?: number; // for nursing or sleep in minutes
  amount?: number; // for bottle in ml/oz
  note?: string;
}

export interface AppState {
  entries: LogEntry[];
  babyName: string;
  isDarkMode: boolean;
  unit: 'oz' | 'ml';
}

export interface AIInsight {
  summary: string;
  prediction: string;
  tip: string;
}
