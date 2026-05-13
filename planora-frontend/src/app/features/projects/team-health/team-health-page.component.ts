import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { forkJoin } from 'rxjs';
import { EnergyHeatmapComponent } from '../daily-checkin/energy-heatmap.component';
import { TeamHealthWidgetComponent } from './team-health-widget.component';
import { CheckInService } from '../../../core/services/checkin.service';
import { TeamHealthService, TeamHealthResult } from '../../../core/services/team-health.service';

interface EnergyMember {
  userId: string;
  userName: string;
  hasCheckedInToday: boolean;
  hasBlocker: boolean;
  energyLevel: number;
}

@Component({
  selector: 'app-team-health-page',
  standalone: true,
  imports: [CommonModule, MatIconModule, EnergyHeatmapComponent, TeamHealthWidgetComponent],
  template: `
    <div class="page-root">

      <!-- HEADER -->
      <div class="page-header">
        <div class="header-icon">
          <mat-icon>favorite</mat-icon>
        </div>
        <div class="header-text">
          <h1 class="page-title">Team Health</h1>
          <p class="page-subtitle">AI Sentiment Analysis — Last 7 days</p>
        </div>
      </div>

      @if (loading) {
        <div class="global-loading">
          <div class="pulse-ring"></div>
          <span>Loading full analysis…</span>
        </div>
      }

      @if (!loading && projectId) {

        <!-- COMBINED HEALTH SCORE -->
        <div class="combined-card" [class]="'combined-' + getCombinedStatus()">

          <div class="combined-header">
            <span class="combined-title">🎯 Global Health Score</span>
            <span class="combined-badge">Check-in + AI Sentiment</span>
          </div>

          <div class="combined-body">

            <!-- Big score -->
            <div class="big-score" [class]="'big-score-' + getCombinedStatus()">
              <span class="big-num">{{ combinedScore }}</span>
              <span class="big-den">/10</span>
            </div>

            <!-- Two-source breakdown -->
            <div class="score-sources">

              <div class="source-item">
                <div class="source-icon">🔋</div>
                <div class="source-info">
                  <div class="source-label">Check-in Energy</div>
                  <div class="source-bar-wrap">
                    <div class="source-bar bar-energy"
                         [style.width.%]="energyScore * 10">
                    </div>
                  </div>
                  <div class="source-val">{{ energyScore }}/10</div>
                </div>
              </div>

              <div class="source-divider">+</div>

              <div class="source-item">
                <div class="source-icon">💬</div>
                <div class="source-info">
                  <div class="source-label">AI Chat Sentiment</div>
                  <div class="source-bar-wrap">
                    <div class="source-bar bar-sentiment"
                         [style.width.%]="sentimentScore * 10">
                    </div>
                  </div>
                  <div class="source-val">{{ sentimentScore }}/10</div>
                </div>
              </div>

              <div class="source-divider">=</div>

              <div class="source-item source-result">
                <div class="source-icon">{{ getCombinedIcon() }}</div>
                <div class="source-info">
                  <div class="source-label">Combined Score</div>
                  <div class="source-bar-wrap">
                    <div class="source-bar bar-combined"
                         [style.width.%]="combinedScore * 10"
                         [class]="'bar-combined-' + getCombinedStatus()">
                    </div>
                  </div>
                  <div class="source-val"><strong>{{ combinedScore }}/10</strong></div>
                </div>
              </div>

            </div>

            <!-- Status message -->
            <div class="combined-status-msg" [class]="'msg-' + getCombinedStatus()">
              {{ getCombinedMessage() }}
            </div>

          </div>

          <!-- Critical alert if both scores are low -->
          @if (getCombinedStatus() === 'critical') {
            <div class="critical-banner">
              🚨 <strong>Warning!</strong> Both energy AND sentiment are degraded.
              A team meeting is strongly recommended.
            </div>
          }

          <!-- Quick stats -->
          <div class="quick-stats">
            <div class="stat-item">
              <span class="stat-val">{{ checkedInCount }}/{{ totalMembers }}</span>
              <span class="stat-label">Check-ins today</span>
            </div>
            <div class="stat-sep"></div>
            <div class="stat-item">
              <span class="stat-val">{{ sentimentData?.totalMessages ?? 0 }}</span>
              <span class="stat-label">Messages analyzed</span>
            </div>
            <div class="stat-sep"></div>
            <div class="stat-item">
              <span class="stat-val">{{ blockerCount }}</span>
              <span class="stat-label">Blocker(s)</span>
            </div>
            <div class="stat-sep"></div>
            <div class="stat-item">
              <span class="stat-val">{{ sentimentData?.alerts?.length ?? 0 }}</span>
              <span class="stat-label">AI Alert(s)</span>
            </div>
          </div>

        </div>

        <!-- Existing widgets below -->
        <app-energy-heatmap [projectId]="projectId"></app-energy-heatmap>
        <app-team-health-widget [projectId]="projectId"></app-team-health-widget>

      }

    </div>
  `,
  styles: [`
  .page-root {
    padding: 36px 40px;
    max-width: 900px;
    margin: 0 auto;
    font-family: 'Segoe UI', system-ui, sans-serif;
    min-height: calc(100vh - 64px);
  }

  .page-header {
    display: flex; align-items: center; gap: 18px;
    margin-bottom: 28px; padding-bottom: 24px;
    border-bottom: 1px solid #ede9fe;
  }
  .header-icon {
    width: 54px; height: 54px; border-radius: 18px;
    background: linear-gradient(135deg, #4f46e5, #818cf8);
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 8px 24px rgba(79,70,229,0.25); flex-shrink: 0;
  }
  .header-icon mat-icon { color: #fff; font-size: 26px; width: 26px; height: 26px; }
  .page-title { font-size: 26px; font-weight: 800; color: #0f172a; margin: 0 0 3px; letter-spacing: -0.5px; }
  .page-subtitle { font-size: 13px; color: #94a3b8; margin: 0; }

  .global-loading {
    display: flex; flex-direction: column; align-items: center;
    gap: 16px; padding: 60px; color: #94a3b8; font-size: 14px;
  }
  .pulse-ring {
    width: 48px; height: 48px; border-radius: 50%;
    border: 3px solid #c7d2fe; border-top-color: #4f46e5;
    animation: spin .8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .combined-card {
    background: #fff;
    border-radius: 20px;
    border: 1.5px solid #ede9fe;
    box-shadow: 0 4px 24px rgba(79,70,229,.08);
    margin-bottom: 20px;
    overflow: hidden;
    position: relative;
    animation: fadeUp .4s ease both;
  }
  .combined-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 3px;
    background: linear-gradient(90deg, #4f46e5, #818cf8, #06b6d4);
  }
  @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }

  .combined-good     { border-color: #a7f3d0; }
  .combined-medium   { border-color: #fde68a; }
  .combined-bad      { border-color: #fdba74; }
  .combined-critical { border-color: #fca5a5; }

  .combined-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 20px 24px 0;
  }
  .combined-title { font-size: 15px; font-weight: 800; color: #0f172a; }
  .combined-badge {
    font-size: 11px; font-weight: 700; padding: 4px 12px;
    border-radius: 20px; background: #eef2ff; color: #4f46e5;
    border: 1px solid #c7d2fe;
  }

  .combined-body { padding: 20px 24px; }

  .big-score {
    display: inline-flex; align-items: baseline; gap: 4px;
    margin-bottom: 20px;
  }
  .big-num { font-size: 60px; font-weight: 900; line-height: 1; letter-spacing: -3px; }
  .big-den { font-size: 22px; font-weight: 600; color: #94a3b8; }

  .big-score-good     .big-num { color: #059669; }
  .big-score-medium   .big-num { color: #d97706; }
  .big-score-bad      .big-num { color: #ea580c; }
  .big-score-critical .big-num { color: #dc2626; }

  .score-sources {
    display: flex; align-items: center; gap: 10px;
    flex-wrap: wrap; margin-bottom: 16px;
  }
  .source-item {
    display: flex; align-items: center; gap: 10px;
    background: #fafbff;
    border-radius: 12px; padding: 10px 14px;
    flex: 1; min-width: 150px;
    border: 1px solid #ede9fe;
  }
  .source-result { flex: 1.2; background: #eef2ff; border-color: #c7d2fe; }
  .source-icon { font-size: 20px; }
  .source-info { flex: 1; }
  .source-label {
    font-size: 10px; color: #64748b; font-weight: 700;
    text-transform: uppercase; letter-spacing: .5px; margin-bottom: 6px;
  }
  .source-bar-wrap {
    height: 5px; background: #e2e8f0;
    border-radius: 6px; overflow: hidden; margin-bottom: 4px;
  }
  .source-bar { height: 100%; border-radius: 6px; transition: width 1s ease; }
  .bar-energy    { background: linear-gradient(90deg, #4f46e5, #818cf8); }
  .bar-sentiment { background: linear-gradient(90deg, #0891b2, #22d3ee); }
  .bar-combined-good     { background: linear-gradient(90deg, #059669, #34d399); }
  .bar-combined-medium   { background: linear-gradient(90deg, #d97706, #fbbf24); }
  .bar-combined-bad      { background: linear-gradient(90deg, #ea580c, #fb923c); }
  .bar-combined-critical { background: linear-gradient(90deg, #dc2626, #f87171); }
  .source-val { font-size: 13px; font-weight: 700; color: #0f172a; }

  .source-divider {
    font-size: 18px; font-weight: 800; color: #c7d2fe;
    flex-shrink: 0; align-self: center;
  }

  .combined-status-msg {
    font-size: 13px; font-weight: 600; padding: 10px 14px;
    border-radius: 10px; margin-bottom: 4px;
  }
  .msg-good     { background: #d1fae5; color: #065f46; }
  .msg-medium   { background: #fef3c7; color: #92400e; }
  .msg-bad      { background: #fff7ed; color: #9a3412; }
  .msg-critical { background: #fee2e2; color: #991b1b; }

  .critical-banner {
    background: #fef2f2;
    border-top: 1px solid #fecaca;
    padding: 12px 24px;
    font-size: 13px; color: #991b1b;
  }

  .quick-stats {
    display: flex; align-items: center;
    padding: 14px 24px;
    border-top: 1px solid #ede9fe;
    background: #fafbff;
    gap: 0;
  }
  .stat-item { flex: 1; text-align: center; }
  .stat-val { display: block; font-size: 20px; font-weight: 800; color: #0f172a; }
  .stat-label { font-size: 11px; color: #94a3b8; font-weight: 500; }
  .stat-sep { width: 1px; height: 32px; background: #ede9fe; flex-shrink: 0; }
`]
})
export class TeamHealthPageComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private checkInService = inject(CheckInService);
  private healthService = inject(TeamHealthService);

  projectId = '';
  loading = false;

  sentimentData: TeamHealthResult | null = null;
  energyData: EnergyMember[] = [];

  sentimentScore = 0;
  energyScore = 0;
  combinedScore = 0;

  checkedInCount = 0;
  totalMembers = 0;
  blockerCount = 0;

  ngOnInit() {
    this.projectId = this.route.snapshot.paramMap.get('projectId') ?? '';
    if (this.projectId) this.loadCombinedData();
  }

  loadCombinedData(): void {
    this.loading = true;

    let scopeId = this.projectId;
    try {
      const raw = localStorage.getItem('user_data');
      if (raw) {
        const stored = JSON.parse(raw);
        const roles: string[] = Array.isArray(stored.roles) ? stored.roles : [];
        if (roles.includes('Admin')) scopeId = 'all';
      }
    } catch { }

    forkJoin({
      sentiment: this.healthService.analyzeTeamHealthLive(scopeId),
      energy: this.checkInService.getTeamEnergy(this.projectId)
    }).subscribe({
      next: ({ sentiment, energy }) => {
        this.sentimentData = sentiment;
        this.sentimentScore = sentiment.globalScore ?? 0;

        const members = (energy?.data ?? []) as EnergyMember[];
        this.energyData = members;
        this.totalMembers = members.length;
        this.checkedInCount = members.filter(m => m.hasCheckedInToday).length;
        this.blockerCount = members.filter(m => m.hasBlocker).length;

        const checkedIn = members.filter(m => m.hasCheckedInToday);
        if (checkedIn.length > 0) {
          const avg = checkedIn.reduce((s, m) => s + m.energyLevel, 0) / checkedIn.length;
          this.energyScore = Math.round(avg * 2);
        } else {
          this.energyScore = 5;
        }

        this.combinedScore = Math.round((this.energyScore + this.sentimentScore) / 2);
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  getCombinedStatus(): string {
    if (this.combinedScore >= 7) return 'good';
    if (this.combinedScore >= 5) return 'medium';
    if (this.combinedScore >= 3) return 'bad';
    return 'critical';
  }

  getCombinedIcon(): string {
    const icons: Record<string, string> = {
      good: '🚀', medium: '😐', bad: '⚠️', critical: '🔴'
    };
    return icons[this.getCombinedStatus()] ?? '😐';
  }

  getCombinedMessage(): string {
    const energyOk = this.energyScore >= 6;
    const sentimentOk = this.sentimentScore >= 6;

    if (energyOk && sentimentOk)
      return '✅ The team is in great shape — high energy and positive chat atmosphere.';

    if (energyOk && !sentimentOk)
      return '⚡ Energy is good but the chat reveals stress. Check for technical blockers.';

    if (!energyOk && sentimentOk)
      return '💬 Chat is positive but energy is low. The team may be tired.';

    if (this.combinedScore >= 3)
      return '⚠️ Low energy AND negative sentiment detected. Intervention is recommended.';

    return '🚨 Critical situation — the team is exhausted and stressed. Act now.';
  }
}
