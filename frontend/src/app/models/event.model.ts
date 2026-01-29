export interface CalendarEvent {
  id?: number;
  codigo_evento?: string;
  title: string;
  type: 'examen' | 'tarea' | 'reunion' | 'otro';
  date: string;
  endDate?: string;
  duration?: number;
  startTime?: string;
  endTime?: string;
  description?: string;
  location?: string;
  meet?: string;
  drive?: string;
  driveFileId?: string;
  driveFileName?: string;
  driveMimeType?: string;
  maps?: string;
  sharedWithEmail?: string;
  ownership?: 'propio' | 'compartido';
  senderName?: string;
}

