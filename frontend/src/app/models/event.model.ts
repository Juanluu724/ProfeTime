export interface CalendarEvent {
  id?: number;
  codigo_evento?: string;
  title: string;
  type: 'examen' | 'tarea' | 'reunion' | 'otro';
  date: string;
  endDate?: string;
  duration?: number;
  tipoGrado?: 'ciclo_formativo' | 'master_fp' | 'grado' | null;
  grado?: string | null;
  curso?: 1 | 2 | null;
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
  sharedWithEmails?: string[];
  ownership?: 'propio' | 'compartido';
  senderName?: string;
}
