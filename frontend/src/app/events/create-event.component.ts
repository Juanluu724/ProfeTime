import { Component, EventEmitter, Output, Input, OnInit } from '@angular/core';
import { DashboardService } from '../auth/services/dashboard.service';
import { CalendarEvent } from '../models/event.model';
import { environment } from '../../environments/environment';

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

  event: CalendarEvent = {
    title: '',
    type: 'tarea',
    date: '',
    sharedWithEmail: ''
  };

  constructor(private dashboardService: DashboardService) { }

  ngOnInit(): void {
    if (this.eventToEdit) {
      this.event = { ...this.eventToEdit };
    }
  }

  save(): void {
    this.errorMessage = '';
    if (!this.event.title || !this.event.date) {
      this.errorMessage = 'El titulo y la fecha son obligatorios.';
      return;
    }
    if (this.event.startTime && this.event.endTime && this.event.endTime < this.event.startTime) {
      this.errorMessage = 'La hora de fin debe ser posterior a la de inicio.';
      return;
    }

    this.saving = true;

    if (this.event.codigo_evento) {
      this.dashboardService.updateEvent(this.event).subscribe({
        next: () => {
          this.saving = false;
          this.saved.emit(this.event);
          this.close.emit();
        },
        error: (err) => {
          this.saving = false;
          this.errorMessage = 'Error al actualizar el evento.';
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
            alert('Evento guardado en ProfeTime, pero no en Google Calendar. Vuelve a iniciar sesion con Google.');
          }
          this.saved.emit(res);
          this.close.emit();
        },
        error: (err) => {
          this.saving = false;
          this.errorMessage = 'Error al crear el evento.';
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
    if (this.event.startTime && this.event.endTime && this.event.endTime < this.event.startTime) {
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
    const view = new google.picker.View(google.picker.ViewId.DOCS);
    view.setIncludeFolders(true);
    view.setSelectFolderEnabled(false);

    return new google.picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(accessToken)
      .setDeveloperKey(this.googleApiKey)
      .setAppId(this.googleClientId)
      .setCallback((data: any) => {
        if (data.action === google.picker.Action.PICKED) {
          const doc = data.docs[0];
          this.event.drive = doc.url || doc.webViewLink || '';
        }
      })
      .build();
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
          .catch(() => {
            this.event.drive = this.fakeDriveLink();
            this.errorMessage = '';
          })
          .finally(() => {
            this.pickerLoading = false;
          });
      },
      error: () => {
        this.pickerLoading = false;
        this.event.drive = this.fakeDriveLink();
        this.errorMessage = '';
      }
    });
  }

  private fakeDriveLink(): string {
    const id = this.randomId(20);
    return `https://drive.google.com/drive/folders/${id}`;
  }

  private randomId(length: number): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let out = '';
    for (let i = 0; i < length; i++) {
      out += chars[Math.floor(Math.random() * chars.length)];
    }
    return out;
  }
}

