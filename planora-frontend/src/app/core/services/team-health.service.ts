import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// ── Modèle de résultat ──
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
  distribution: { Positif: number; Neutre: number; Stresse: number; Frustre: number };
  percentages: { Positif: number; Neutre: number; Stresse: number; Frustre: number };
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

  // ✅ NOUVEAU — Analyse depuis la vraie base de données
  // Envoie juste le projectId, Flask se connecte lui-même à la base
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
