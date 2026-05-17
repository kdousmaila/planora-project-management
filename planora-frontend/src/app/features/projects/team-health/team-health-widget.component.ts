import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { TeamHealthService, TeamHealthResult } from '../../../core/services/team-health.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-team-health-widget',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    @if (isMember) { }

    @if (!isMember) {
    <div class="card card--health">

      <div class="card-head">
        <h3 class="card-title">Team Health</h3>
        <div class="head-right">
          <span class="badge-ia">🧠 AI</span>
          @if (isAdmin) {
            <span class="badge-scope badge-admin">All workspaces</span>
          } @else {
            <span class="badge-scope badge-pm">This project</span>
          }
          <span class="badge-period">Last 7 days</span>
          <button class="refresh-btn" (click)="loadAnalysis()" [disabled]="loading">
            <mat-icon [class.spin]="loading">refresh</mat-icon>
          </button>
        </div>
      </div>

      @if (loading) {
        <div class="health-loading">
          <div class="pulse-ring"></div>
          <span>Analyzing…</span>
        </div>
      }

      @if (error && !loading) {
        <div class="health-error">
          <mat-icon>error_outline</mat-icon>
          <span>{{ error }}</span>
          <button (click)="loadAnalysis()">Retry</button>
        </div>
      }

      @if (!loading && !error && !data) {
        <div class="health-empty">
          <mat-icon>chat_bubble_outline</mat-icon>
          <span>No sentiment data yet. Run the analysis to see the team summary.</span>
        </div>
      }

      @if (!loading && !error && data) {

        <div class="score-row">
          <div class="score-circle" [class]="'score-' + data.globalMoodColor">
            <span class="score-num">{{ data.globalScore }}</span>
            <span class="score-max">/10</span>
          </div>
          <div class="score-info">
            <div class="score-mood">
              <span class="mood-icon">{{ data.globalMoodIcon }}</span>
              <span class="mood-label">{{ data.globalMood }}</span>
            </div>
            <div class="score-meta">{{ data.totalMessages }} messages analyzed</div>
          </div>
        </div>

        <div class="distribution">
          <div class="dist-bar-wrap">
            <div class="dist-segment seg-positive"
              [style.width.%]="data.percentages['Positive']"
              [title]="'Positive: ' + data.percentages['Positive'] + '%'">
            </div>
            <div class="dist-segment seg-neutral"
              [style.width.%]="data.percentages['Neutral']"
              [title]="'Neutral: ' + data.percentages['Neutral'] + '%'">
            </div>
            <div class="dist-segment seg-stressed"
              [style.width.%]="data.percentages['Stressed']"
              [title]="'Stressed: ' + data.percentages['Stressed'] + '%'">
            </div>
            <div class="dist-segment seg-frustrated"
              [style.width.%]="data.percentages['Frustrated']"
              [title]="'Frustrated: ' + data.percentages['Frustrated'] + '%'">
            </div>
          </div>
          <div class="dist-legend">
            <span class="leg-item"><span class="leg-dot dot-pos"></span>Positive {{ data.distribution['Positive'] }}</span>
            <span class="leg-item"><span class="leg-dot dot-neu"></span>Neutral {{ data.distribution['Neutral'] }}</span>
            <span class="leg-item"><span class="leg-dot dot-str"></span>Stressed {{ data.distribution['Stressed'] }}</span>
            <span class="leg-item"><span class="leg-dot dot-fru"></span>Frustrated {{ data.distribution['Frustrated'] }}</span>
          </div>
        </div>

        @if (data.alerts.length > 0) {
          <div class="alerts-section">
            <div class="section-label">Detected Alerts</div>
            @for (alert of data.alerts; track alert.message) {
              <div class="alert-item" [class]="'alert-' + alert.level">
                <span class="alert-icon">{{ alert.icon }}</span>
                <div class="alert-body">
                  <div class="alert-msg">{{ alert.message }}</div>
                  <div class="alert-detail">{{ alert.detail }}</div>
                </div>
              </div>
            }
          </div>
        }

        @if (data.membersSummary.length > 0) {
          <div class="members-section">
            <div class="section-label">By Member</div>
            @for (member of data.membersSummary; track member.authorId) {
              <div class="member-row">
                <div class="member-avatar">{{ member.authorName.charAt(0).toUpperCase() }}</div>
                <div class="member-info">
                  <div class="member-name">{{ member.authorName }}</div>
                  <div class="member-msgs">{{ member.totalMessages }} msg</div>
                </div>
                <div class="member-mood" [class]="'mood-tag mood-' + getMoodClass(member.dominantMood)">
                  {{ getMoodEmoji(member.dominantMood) }} {{ member.dominantMood }}
                </div>
              </div>
            }
          </div>
        }

        <div class="health-footer">
          Analyzed on {{ data.analyzedAt | date:'MM/dd HH:mm' }}
        </div>
      }

    </div>
    }
  `,
  styles: [`
    .card--health {
  background: #fff;
  border-radius: 20px;
  padding: 24px;
  border: 1.5px solid #ede9fe;
  box-shadow: 0 2px 16px rgba(79,70,229,.06);
  margin-bottom: 24px;
  position: relative;
  overflow: hidden;
  animation: fadeUp .35s ease both;
  animation-delay: .4s;
}
.card--health::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 3px;
  background: linear-gradient(90deg, #4f46e5, #818cf8);
}
.card--health:hover {
  box-shadow: 0 8px 32px rgba(79,70,229,.10);
  border-color: #c7d2fe;
}
    @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }

    .card-head { display:flex;align-items:center;justify-content:space-between;margin-bottom:20px; }
    .card-title { font-size:15px;font-weight:700;color:#0f172a;margin:0;display:flex;align-items:center;gap:8px; }
    .card-title::before { content:'';width:3px;height:18px;background:linear-gradient(180deg,#4f46e5,#06b6d4);border-radius:3px; }
    .head-right { display:flex;align-items:center;gap:8px;flex-wrap:wrap; }
    .badge-ia { font-size:11px;font-weight:700;padding:3px 8px;border-radius:20px;background:#ede9fe;color:#4f46e5; }
    .badge-period { font-size:11px;color:#94a3b8;font-weight:500; }
    .badge-scope { font-size:11px;font-weight:600;padding:3px 10px;border-radius:20px; }
    .badge-admin { background:#fef3c7;color:#d97706; }
    .badge-pm    { background:#e0f2fe;color:#0369a1; }
    .refresh-btn { width:30px;height:30px;border:1px solid #c7d2fe;border-radius:8px;background:#fff;color:#4f46e5;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .15s; }
    .refresh-btn:hover { background:#ede9fe; }
    .refresh-btn:disabled { opacity:.5;cursor:not-allowed; }
    .spin { animation:spin 1s linear infinite; }
    @keyframes spin { to{transform:rotate(360deg)} }

    .health-loading { display:flex;flex-direction:column;align-items:center;gap:12px;padding:32px;color:#94a3b8;font-size:13px; }
    .pulse-ring { width:40px;height:40px;border-radius:50%;border:3px solid #c7d2fe;border-top-color:#4f46e5;animation:spin .8s linear infinite; }
    .health-error,.health-empty { text-align:center;padding:32px 20px;color:#94a3b8;font-size:13px; }
    .health-error mat-icon,.health-empty mat-icon { font-size:32px;width:32px;height:32px;display:block;margin:0 auto 8px; }
    .health-error button { margin-top:8px;padding:4px 14px;border:1px solid #c7d2fe;border-radius:6px;background:#fff;color:#4f46e5;cursor:pointer;font-size:12px; }

    .score-row { display:flex;align-items:center;gap:16px;margin-bottom:20px; }
    .score-circle { width:70px;height:70px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-direction:row;gap:1px;font-weight:800;flex-shrink:0;border:3px solid; }
    .score-positive   { border-color:#10b981;color:#059669;background:#d1fae5; }
    .score-neutral    { border-color:#f59e0b;color:#d97706;background:#fef3c7; }
    .score-stressed   { border-color:#f97316;color:#ea580c;background:#fff7ed; }
    .score-frustrated { border-color:#ef4444;color:#dc2626;background:#fee2e2; }
    .score-num { font-size:22px;font-weight:800; }
    .score-max { font-size:12px;font-weight:600;opacity:.6; }
    .score-mood { display:flex;align-items:center;gap:6px;margin-bottom:4px; }
    .mood-icon { font-size:18px; }
    .mood-label { font-size:15px;font-weight:700;color:#0f172a; }
    .score-meta { font-size:12px;color:#94a3b8; }

    .distribution { margin-bottom:20px; }
    .dist-bar-wrap { display:flex;height:8px;border-radius:8px;overflow:hidden;gap:1px;margin-bottom:8px; }
    .dist-segment { height:100%;transition:width .8s ease;min-width:2px; }
    .seg-positive   { background:#10b981; }
    .seg-neutral    { background:#94a3b8; }
    .seg-stressed   { background:#f97316; }
    .seg-frustrated { background:#ef4444; }
    .dist-legend { display:flex;flex-wrap:wrap;gap:10px; }
    .leg-item { display:flex;align-items:center;gap:5px;font-size:12px;color:#64748b;font-weight:500; }
    .leg-dot { width:8px;height:8px;border-radius:50%;flex-shrink:0; }
    .dot-pos { background:#10b981; } .dot-neu { background:#94a3b8; }
    .dot-str { background:#f97316; } .dot-fru { background:#ef4444; }

    .alerts-section,.members-section { margin-bottom:16px; }
    .section-label { font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.6px;margin-bottom:8px; }
    .alert-item { display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border-radius:10px;margin-bottom:6px;border-left:3px solid; }
    .alert-warning { background:#fff7ed;border-color:#f97316; }
    .alert-danger  { background:#fee2e2;border-color:#ef4444; }
    .alert-icon { font-size:16px; }
    .alert-msg { font-size:13px;font-weight:600;color:#1e293b; }
    .alert-detail { font-size:12px;color:#64748b;margin-top:2px; }

    .member-row { display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #f5f3ff; }
    .member-row:last-child { border-bottom:none; }
    .member-avatar { width:30px;height:30px;border-radius:8px;background:linear-gradient(135deg,#4f46e5,#06b6d4);color:#fff;font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0; }
    .member-info { flex:1; }
    .member-name { font-size:13px;font-weight:600;color:#0f172a; }
    .member-msgs { font-size:11px;color:#94a3b8; }
    .mood-tag { font-size:11px;font-weight:600;padding:3px 8px;border-radius:20px;white-space:nowrap; }
    .mood-positive   { background:#d1fae5;color:#059669; }
    .mood-neutral    { background:#f1f5f9;color:#64748b; }
    .mood-stressed   { background:#fff7ed;color:#ea580c; }
    .mood-frustrated { background:#fee2e2;color:#dc2626; }

    .health-footer { font-size:11px;color:#cbd5e1;text-align:right;margin-top:12px;padding-top:10px;border-top:1px solid #f5f3ff; }
  `]
})
export class TeamHealthWidgetComponent implements OnInit {
  @Input() projectId!: string;

  private teamHealthService = inject(TeamHealthService);
  private authService = inject(AuthService);

  loading = false;
  error: string | null = null;
  data: TeamHealthResult | null = null;

  isAdmin = false;
  isPM = false;
  isMember = false;
  currentUserId: string | null = null;

  ngOnInit(): void {
    try {
      const raw = localStorage.getItem('user_data');
      if (raw) {
        const stored = JSON.parse(raw);
        const roles: string[] = Array.isArray(stored.roles) ? stored.roles : [];
        this.isAdmin = roles.includes('Admin');
        this.isPM = roles.includes('ProjectManager');
        this.isMember = !this.isAdmin && !this.isPM;
        this.currentUserId = stored.userId ?? null;
      }
    } catch {
      this.isMember = true;
    }

    if (!this.isMember) {
      this.loadAnalysis();
    }
  }

  loadAnalysis(): void {
    this.loading = true;
    this.error = null;

    const scopeId = this.isAdmin ? 'all' : this.projectId;

    this.teamHealthService.analyzeTeamHealthLive(scopeId).subscribe({
      next: (result) => {
        this.data = result;
        this.loading = false;
      },
      error: () => {
        this.error = 'Flask server unreachable. Start app.py on port 8000.';
        this.loading = false;
      }
    });
  }

  getMoodClass(mood: string): string {
    const map: Record<string, string> = {
      'Positive': 'positive', 'Neutral': 'neutral',
      'Stressed': 'stressed', 'Frustrated': 'frustrated'
    };
    return map[mood] ?? 'neutral';
  }

  getMoodEmoji(mood: string): string {
    const map: Record<string, string> = {
      'Positive': '😊', 'Neutral': '😐',
      'Stressed': '😰', 'Frustrated': '😤'
    };
    return map[mood] ?? '😐';
  }
}
