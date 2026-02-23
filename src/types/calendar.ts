/** Shared types for the Calendar feature. */

export interface CalendarTask {
  _id: string;
  title: string;
  priority: string;
  taskType?: string;
  dueDate?: string;
  startDate?: string;
  status?: { name: string; color: string; isFinal?: boolean };
  assignees?: { _id: string; firstName: string; lastName: string; avatar?: string }[];
}

export interface ExtendedCalendarTask extends CalendarTask {
  taskNumber?: string;
  description?: string;
  lead?: { _id: string; name: string };
  client?: { _id: string; name: string };
  deal?: { _id: string; title: string; stage: string };
}
