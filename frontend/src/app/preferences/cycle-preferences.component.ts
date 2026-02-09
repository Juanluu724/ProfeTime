import { CommonModule } from '@angular/common';
import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  CycleDegreeSelection,
  CyclePreferencesResponse,
  PreferencesService,
  TipoGrado
} from './preferences.service';
import { ToastService } from '../ui/toast.service';

@Component({
  selector: 'app-cycle-preferences',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cycle-preferences.component.html',
  styleUrls: ['./cycle-preferences.component.scss']
})
export class CyclePreferencesComponent implements OnInit {
  @Output() saved = new EventEmitter<CyclePreferencesResponse>();

  loading = true;
  loadError = false;
  saving = false;

  allowed: CycleDegreeSelection = { ciclo_formativo: [], master_fp: [] };
  selected: CycleDegreeSelection = { ciclo_formativo: [], master_fp: [] };
  draft: CycleDegreeSelection = { ciclo_formativo: [], master_fp: [] };

  constructor(private prefs: PreferencesService, private toast: ToastService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.loadError = false;
    this.prefs.getCyclePreferences().subscribe({
      next: (res) => {
        this.allowed = res?.allowed || { ciclo_formativo: [], master_fp: [] };
        this.selected = res?.selected || { ciclo_formativo: [], master_fp: [] };
        this.draft = {
          ciclo_formativo: [...(this.selected.ciclo_formativo || [])],
          master_fp: [...(this.selected.master_fp || [])]
        };
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.loadError = true;
        this.toast.error('No se pudieron cargar las preferencias.');
      }
    });
  }

  isChecked(tipo: TipoGrado, grado: string): boolean {
    const key: keyof CycleDegreeSelection = tipo;
    return (this.draft[key] || []).includes(grado);
  }

  toggle(tipo: TipoGrado, grado: string, checked: boolean): void {
    const key: keyof CycleDegreeSelection = tipo;
    const next = new Set(this.draft[key] || []);
    if (checked) {
      next.add(grado);
    } else {
      next.delete(grado);
    }
    this.draft = { ...this.draft, [key]: Array.from(next) } as CycleDegreeSelection;
  }

  save(): void {
    if (this.saving) return;
    this.saving = true;

    this.prefs.saveCyclePreferences(this.draft).subscribe({
      next: (res) => {
        this.allowed = res?.allowed || this.allowed;
        this.selected = res?.selected || this.selected;
        this.draft = {
          ciclo_formativo: [...(this.selected.ciclo_formativo || [])],
          master_fp: [...(this.selected.master_fp || [])]
        };
        this.saving = false;
        this.toast.success('Preferencias guardadas.');
        this.saved.emit(res);
      },
      error: () => {
        this.saving = false;
        this.toast.error('No se pudieron guardar las preferencias.');
      }
    });
  }
}
