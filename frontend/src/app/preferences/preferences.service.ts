import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type TipoGrado = 'ciclo_formativo' | 'master_fp';

export interface CycleDegreeSelection {
  ciclo_formativo: string[];
  master_fp: string[];
}

export interface CyclePreferencesResponse {
  role?: string;
  allowed: CycleDegreeSelection;
  selected: CycleDegreeSelection;
}

@Injectable({
  providedIn: 'root'
})
export class PreferencesService {
  private readonly baseUrl = `${environment.apiBaseUrl}/api/preferences`;

  constructor(private http: HttpClient) {}

  getCyclePreferences(): Observable<CyclePreferencesResponse> {
    return this.http.get<CyclePreferencesResponse>(`${this.baseUrl}/ciclos`);
  }

  saveCyclePreferences(selected: CycleDegreeSelection): Observable<CyclePreferencesResponse> {
    return this.http.put<CyclePreferencesResponse>(`${this.baseUrl}/ciclos`, { selected });
  }
}

