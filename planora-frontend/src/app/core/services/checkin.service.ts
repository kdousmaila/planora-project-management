// checkin.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CheckInPayload {
  projectId: string;
  energyLevel: number;
  availableHours: number;
  hasBlocker: boolean;
  blockerNote?: string;
}

export interface TeamMemberEnergy {
  userId: string;
  userName: string;
  energyLevel: number;
  availableHours: number;
  hasBlocker: boolean;
  blockerNote?: string;
  hasCheckedInToday: boolean;
  energyStatus: 'high' | 'medium' | 'low';
  // Viendra du TeamHealthService (sentiment)
  dominantMood?: string;
  stressRatio?: number;
  frustrationRatio?: number;
}

@Injectable({ providedIn: 'root' })
export class CheckInService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  submitCheckIn(projectId: string, payload: CheckInPayload): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/api/projects/${projectId}/checkin`,
      payload
    );
  }

  getTodayCheckIn(projectId: string): Observable<any> {
    return this.http.get(
      `${this.apiUrl}/api/projects/${projectId}/checkin/today`
    );
  }

  getTeamEnergy(projectId: string): Observable<any> {
    return this.http.get(
      `${this.apiUrl}/api/projects/${projectId}/checkin/team`
    );
  }
}
