export interface UICalendarEvent {
  id: string;
  title: string;
  time: string;
  endTime?: string;
  color?: string;
  description?: string;
  location?: string;
  attendees?: string[];
}

export interface UIDayEvents {
  dateISO: string;
  events: UICalendarEvent[];
}
