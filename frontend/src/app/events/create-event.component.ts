import { Component, EventEmitter, Output, Input, OnInit } from '@angular/core';
import { DashboardService } from '../auth/services/dashboard.service';
import { CalendarEvent } from '../models/event.model';
import { environment } from '../../environments/environment';
import { ToastService } from '../ui/toast.service';

declare const gapi: any;
declare const google: any;

@Component({
  selector: 'app-create-event',
  templateUrl: './create-event.component.html',
  styleUrls: ['./create-event.component.scss']
})
export class CreateEventComponent implements OnInit {

  @Input() eventToEdit?: CalendarEvent;
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<CalendarEvent>();

  errorMessage = '';
  saving = false;
  generatingMeet = false;
  creatingDrive = false;
  pickerLoading = false;

  private googleApiKey = environment.googleApiKey;
  private googleClientId = environment.googleClientId;
  private pickerReady = false;

  sharedEmailDraft = '';
  sharedEmails: string[] = [];

  readonly tipoGradoOptions: Array<{ value: NonNullable<CalendarEvent['tipoGrado']>; label: string }> = [
    { value: 'ciclo_formativo', label: 'Ciclo Formativo' },
    { value: 'master_fp', label: 'Máster FP' },
    { value: 'grado', label: 'Grado' }
  ];

  readonly gradosCicloFormativo: string[] = [
    'Administración y Finanzas',
    'Comercio Internacional',
    'Gestión de Ventas y Espacios Comerciales',
    'Marketing y Publicidad',
    'Aplicaciones Multiplataforma',
    'Aplicaciones Web',
    'Animación 3D y Videojuegos',
    'Sonido',
    'Realización Audiovisual',
    'Educación Infantil (DUAL)',
    'Gestión de Alojamientos (DUAL)',
    'Dirección de Cocina',
    'Dirección de Servicios en Restauración',
    'TSAF Acondicionamiento Físico'
  ];

  readonly gradosMasterFp: string[] = [
    'Ciberseguridad en Entornos de las Tecnologías de la Información',
    'Desarrollo de Videojuegos y Realidad Virtual',
    'Inteligencia Artificial y Big Data'
  ];

  event: CalendarEvent = {
    title: '',
    type: 'tarea',
    date: '',
    sharedWithEmail: '',
    tipoGrado: null,
    grado: null,
    curso: null
  };

  constructor(private dashboardService: DashboardService, private toast: ToastService) { }

  ngOnInit(): void {
    if (this.eventToEdit) {
      this.event = { ...this.eventToEdit };
    }

    const initial = (this.event.sharedWithEmails || []).length
      ? this.event.sharedWithEmails || []
      : this.event.sharedWithEmail
        ? String(this.event.sharedWithEmail).split(/[,\s]+/g)
        : [];

    this.sharedEmails = Array.from(
      new Set(
        initial
          .map((v) => this.normalizeEmail(v))
          .filter((v) => this.isValidEmail(v))
      )
    );
  }

  save(): void {
    this.errorMessage = '';

    this.event.sharedWithEmails = this.sharedEmails.length ? [...this.sharedEmails] : undefined;
    this.event.sharedWithEmail = this.sharedEmails.length === 1 ? this.sharedEmails[0] : undefined;

    if (!this.event.title || !this.event.type || !this.event.date) {
      this.errorMessage = 'Titulo, tipo y fecha son obligatorios.';
      return;
    }

    if (this.isAcademicEvent()) {
      if (!this.event.tipoGrado) {
        this.errorMessage = 'Tipo de grado es obligatorio.';
        return;
      }
      if (!this.event.grado || !String(this.event.grado).trim()) {
        this.errorMessage = 'Grado es obligatorio.';
        return;
      }
      if (this.event.curso !== 1 && this.event.curso !== 2) {
        this.errorMessage = 'Curso es obligatorio (1º o 2º).';
        return;
      }
    } else {
      this.event.tipoGrado = null;
      this.event.grado = null;
      this.event.curso = null;
    }

    const hasStart = !!this.event.startTime;
    const hasEnd = !!this.event.endTime;
    if ((hasStart && !hasEnd) || (!hasStart && hasEnd)) {
      this.errorMessage = 'Si indicas horas, debes poner inicio y fin.';
      return;
    }
    if (hasStart && hasEnd && this.event.endTime! < this.event.startTime!) {
      this.errorMessage = 'La hora de fin debe ser posterior a la de inicio.';
      return;
    }

    this.saving = true;

    if (this.event.codigo_evento) {
      this.dashboardService.updateEvent(this.event).subscribe({
        next: () => {
          this.saving = false;
          this.toast.success('Evento actualizado.');
          this.saved.emit(this.event);
          this.close.emit();
        },
        error: (err) => {
          this.saving = false;
          this.errorMessage = 'Error al actualizar el evento.';
          this.toast.error('No se pudo actualizar el evento.');
          console.error(err);
        }
      });
    } else {
      const payload = {
        ...this.event,
        sharedWithEmail: this.event.sharedWithEmail || undefined
      };

      this.dashboardService.createEvent(payload).subscribe({
        next: (res) => {
          this.saving = false;
          if (res?.googleSync && res.googleSync.ok === false) {
            this.toast.warning(
              'Evento guardado en ProfeTime, pero no en Google Calendar. Vuelve a vincular Google.'
            );
          } else {
            this.toast.success('Evento creado.');
          }
          this.saved.emit(res);
          this.close.emit();
        },
        error: (err) => {
          this.saving = false;
          this.errorMessage = 'Error al crear el evento.';
          this.toast.error('No se pudo crear el evento.');
          console.error(err);
        }
      });
    }
  }

  generateMeet(): void {
    this.errorMessage = '';
    if (!this.event.date) {
      this.errorMessage = 'La fecha es obligatoria para Meet.';
      return;
    }
    const hasStart = !!this.event.startTime;
    const hasEnd = !!this.event.endTime;
    if ((hasStart && !hasEnd) || (!hasStart && hasEnd)) {
      this.errorMessage = 'Si indicas horas, debes poner inicio y fin.';
      return;
    }
    if (hasStart && hasEnd && this.event.endTime! < this.event.startTime!) {
      this.errorMessage = 'La hora de fin debe ser posterior a la de inicio.';
      return;
    }

    this.generatingMeet = true;
    const dateForMeet = this.normalizeDate(this.event.date);
    this.dashboardService
      .generateMeet({
        date: dateForMeet,
        startTime: this.event.startTime,
        endTime: this.event.endTime,
        title: this.event.title
      })
      .subscribe({
        next: (res) => {
          this.generatingMeet = false;
          if (res.meetLink) {
            this.event.meet = res.meetLink;
          } else {
            this.errorMessage = 'No se pudo generar el enlace de Meet.';
          }
        },
        error: () => {
          this.generatingMeet = false;
          this.errorMessage = 'No se pudo generar el enlace de Meet.';
        }
      });
  }

  private normalizeDate(value: string): string {
    if (!value) return value;
    if (value.includes('/')) {
      const [day, month, year] = value.split('/');
      if (day && month && year) {
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    }
    return value;
  }

  private loadPickerScript(): Promise<void> {
    if (this.pickerReady) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const existing = document.getElementById('google-picker');
      if (existing) {
        gapi.load('picker', {
          callback: () => {
            this.pickerReady = true;
            resolve();
          },
          onerror: reject
        });
        return;
      }

      const script = document.createElement('script');
      script.id = 'google-picker';
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => {
        gapi.load('picker', {
          callback: () => {
            this.pickerReady = true;
            resolve();
          },
          onerror: reject
        });
      };
      script.onerror = reject;
      document.body.appendChild(script);
    });
  }

  private buildPicker(accessToken: string) {
    if (!this.googleApiKey) {
      throw new Error('Falta googleApiKey (APP_GOOGLE_API_KEY).');
    }

    const view = new google.picker.DocsView(google.picker.ViewId.DOCS);
    view.setIncludeFolders(true);
    view.setSelectFolderEnabled(false);

    return new google.picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(accessToken)
      .setDeveloperKey(this.googleApiKey)
      .setOrigin(window.location.origin)
      .setCallback((data: any) => {
        if (data.action === google.picker.Action.PICKED) {
          const doc = data.docs[0];
          this.event.drive = doc.url || doc.webViewLink || '';
          this.event.driveFileId = doc.id || '';
          this.event.driveFileName = doc.name || doc.title || '';
          this.event.driveMimeType = doc.mimeType || doc.type || '';
          this.toast.success('Archivo adjuntado.');
        }
      })
      .build();
  }

  isAcademicEvent(): boolean {
    return this.event.type === 'tarea' || this.event.type === 'examen';
  }

  getGradoOptions(): string[] {
    if (this.event.tipoGrado === 'ciclo_formativo') return this.gradosCicloFormativo;
    if (this.event.tipoGrado === 'master_fp') return this.gradosMasterFp;
    return [];
  }

  onTipoGradoChange(): void {
    const options = this.getGradoOptions();
    if (options.length > 0 && this.event.grado && !options.includes(this.event.grado)) {
      this.event.grado = null;
    }
    if (this.event.tipoGrado === 'grado' && !this.event.grado) {
      this.event.grado = '';
    }
  }

  onTypeChange(): void {
    if (!this.isAcademicEvent()) {
      this.event.tipoGrado = null;
      this.event.grado = null;
      this.event.curso = null;
    }
  }

  attachDrive(): void {
    this.errorMessage = '';
    this.pickerLoading = true;
    this.dashboardService.getPickerToken().subscribe({
      next: (res) => {
        this.loadPickerScript()
          .then(() => {
            const picker = this.buildPicker(res.accessToken);
            picker.setVisible(true);
          })
          .catch((err) => {
            console.error('Drive Picker error:', err);
            this.toast.error('No se pudo abrir el selector de Drive.');
          })
          .finally(() => {
            this.pickerLoading = false;
          });
      },
      error: () => {
        this.pickerLoading = false;
        this.toast.warning('Vincula Google para poder usar Drive.');
      }
    });
  }

  addSharedEmail(): void {
    const raw = String(this.sharedEmailDraft || '').trim();
    if (!raw) return;

    const parts = raw.split(/[,\s]+/g).map((v) => this.normalizeEmail(v));
    const valid = parts.filter((v) => this.isValidEmail(v));

    if (valid.length === 0) {
      this.toast.warning('Email inválido.');
      return;
    }

    const merged = new Set(this.sharedEmails);
    valid.forEach((v) => merged.add(v));
    this.sharedEmails = Array.from(merged);
    this.sharedEmailDraft = '';
  }

  removeSharedEmail(index: number): void {
    this.sharedEmails = this.sharedEmails.filter((_, i) => i !== index);
  }

  onSharedEmailKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      this.addSharedEmail();
    }
  }

  private normalizeEmail(value: string): string {
    return String(value || '').trim().toLowerCase();
  }

  private isValidEmail(value: string): boolean {
    if (!value) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }
}

