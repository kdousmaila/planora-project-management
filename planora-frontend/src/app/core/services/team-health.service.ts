import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// ── Result model ──
export interface TeamHealthAlert {
  type: string;
  icon: string;
  level: string;
  message: string;
  detail: string;
}

export interface TeamHealthMember {
  authorId: string;
  authorName: string;
  totalMessages: number;
  dominantMood: string;
  stressRatio: number;
  frustrationRatio: number;
}

export interface TeamHealthResult {
  projectId: string;
  analyzedAt: string;
  totalMessages: number;
  globalScore: number;
  globalMood: string;
  globalMoodIcon: string;
  globalMoodColor: string;
  distribution: { Positive: number; Neutral: number; Stressed: number; Frustrated: number };
  percentages: { Positive: number; Neutral: number; Stressed: number; Frustrated: number };
  alerts: TeamHealthAlert[];
  membersSummary: TeamHealthMember[];
  messageResults: any[];
}

export interface ChatMessage {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
}

@Injectable({ providedIn: 'root' })
export class TeamHealthService {
  private http = inject(HttpClient);

  // URL de ton serveur Flask
  private flaskUrl = 'http://localhost:8000';

  // ✅ NEW - Analysis from the real database
  // Sends only the projectId; Flask connects to the database itself
  analyzeTeamHealthLive(projectId: string): Observable<TeamHealthResult> {
    return this.http.post<TeamHealthResult>(
      `${this.flaskUrl}/api/sentiment/team-health-live`,
      { projectId }
    );
  }

  // Ancien endpoint (garde pour les tests avec messages manuels)
  analyzeTeamHealth(
    projectId: string,
    messages: ChatMessage[]
  ): Observable<TeamHealthResult> {
    return this.http.post<TeamHealthResult>(
      `${this.flaskUrl}/api/sentiment/team-health`,
      { projectId, messages }
    );
  }
}
