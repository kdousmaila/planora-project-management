import { Component, Input, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CheckInService } from '../../../core/services/checkin.service';
import * as signalR from '@microsoft/signalr';

@Component({
  selector: 'app-energy-heatmap',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="heatmap-card">
      <div class="heatmap-header">
        <span class="heatmap-title">⚡ Team Energy</span>
        <span class="heatmap-date">Today</span>
      </div>

      @if (loading) {
        <div class="heatmap-loading">Loading...</div>
      } @else if (members.length === 0) {
        <div class="heatmap-empty">No check-ins today</div>
      } @else {
        <div class="members-grid">
          @for (m of members; track m.userId) {
            <div class="member-row">
              <div class="member-avatar" [style.background]="avatarColor(m.userName)">
                {{ m.userName.charAt(0).toUpperCase() }}
              </div>
              <div class="member-info">
                <span class="member-name">{{ m.userName }}</span>
                @if (!m.hasCheckedInToday) {
                  <span class="no-checkin">Not yet</span>
                } @else {
                  <div class="energy-bar-wrap">
                    <div class="energy-bar"
                      [style.width.%]="(m.energyLevel / 5) * 100"
                      [class]="'bar-' + energyClass(m.energyLevel)">
                    </div>
                  </div>
                }
              </div>
              @if (m.hasCheckedInToday) {
                <div class="member-stats">
                  <span class="energy-emoji">{{ energyEmoji(m.energyLevel) }}</span>
                  <span class="hours-badge">{{ m.availableHours }}h</span>
                  @if (m.hasBlocker) {
                    <span class="blocker-badge" [title]="m.blockerNote || ''">🚧</span>
                  }
                </div>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
  .heatmap-card {
    background: #fff;
    border-radius: 20px;
    padding: 22px 24px;
    border: 1.5px solid #ede9fe;
    box-shadow: 0 2px 16px rgba(79,70,229,.06);
    margin-bottom: 16px;
    position: relative;
    overflow: hidden;
  }
  .heatmap-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 3px;
    background: linear-gradient(90deg, #06b6d4, #4f46e5, #818cf8);
  }
  .heatmap-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 18px;
  }
  .heatmap-title {
    font-size: 14px;
    font-weight: 700;
    color: #1e293b;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .heatmap-date {
    font-size: 11px;
    color: #94a3b8;
    background: #f8faff;
    padding: 3px 10px;
    border-radius: 20px;
    border: 1px solid #e2e8f0;
  }
  .heatmap-loading, .heatmap-empty {
    text-align: center;
    color: #94a3b8;
    font-size: 13px;
    padding: 28px 0;
  }
  .members-grid {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .member-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    border-radius: 12px;
    background: #fafbff;
    border: 1px solid #f0f0ff;
    transition: background .15s;
  }
  .member-row:hover { background: #f5f3ff; }
  .member-avatar {
    width: 34px;
    height: 34px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 13px;
    font-weight: 700;
    flex-shrink: 0;
    box-shadow: 0 2px 8px rgba(0,0,0,.12);
  }
  .member-info { flex: 1; min-width: 0; }
  .member-name {
    font-size: 13px;
    font-weight: 600;
    color: #334155;
    display: block;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-bottom: 4px;
  }
  .no-checkin {
    font-size: 11px;
    color: #cbd5e1;
    font-style: italic;
  }
  .energy-bar-wrap {
    height: 5px;
    background: #eef2ff;
    border-radius: 3px;
  }
  .energy-bar {
    height: 100%;
    border-radius: 3px;
    transition: width .5s cubic-bezier(.4,0,.2,1);
  }
  .bar-high   { background: linear-gradient(90deg, #10b981, #34d399); }
  .bar-medium { background: linear-gradient(90deg, #f59e0b, #fcd34d); }
  .bar-low    { background: linear-gradient(90deg, #ef4444, #f87171); }
  .member-stats {
    display: flex;
    align-items: center;
    gap: 5px;
    flex-shrink: 0;
  }
  .energy-emoji { font-size: 17px; }
  .hours-badge {
    font-size: 11px;
    font-weight: 700;
    color: #4f46e5;
    background: #ede9fe;
    padding: 2px 7px;
    border-radius: 6px;
    letter-spacing: .2px;
  }
  .blocker-badge { font-size: 14px; cursor: help; }
`]
})
export class EnergyHeatmapComponent implements OnInit, OnDestroy {
  @Input() projectId!: string;

  private checkInService = inject(CheckInService);
  private hubConnection!: signalR.HubConnection;

  loading = true;
  members: any[] = [];

  ngOnInit(): void {
    this.load();
    this.startSignalR();
  }

  ngOnDestroy(): void {
    if (this.hubConnection) {
      this.hubConnection.invoke('LeaveProjectManagers', this.projectId).catch(() => { });
      this.hubConnection.stop();
    }
  }

  private startSignalR(): void {
    // Retrieve the JWT token for SignalR auth
    const token = localStorage.getItem('access_token') ?? '';

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl('/hubs/chat', {
        accessTokenFactory: () => token  // ← sends the JWT to the hub
      })
      .withAutomaticReconnect()
      .build();

    // ✅ When a member submits their check-in → automatic reload
    this.hubConnection.on('CheckInUpdated', (projectId: string) => {
      if (projectId === this.projectId) {
        this.load();
      }
    });

    this.hubConnection.start()
      .then(() => {
        // Join the managers group (the hub checks the role on the C# side)
        return this.hubConnection.invoke('JoinProjectManagers', this.projectId);
      })
      .catch(err => console.error('SignalR connection error:', err));
  }

  load(): void {
    this.loading = true;
    this.checkInService.getTeamEnergy(this.projectId).subscribe({
      next: (res: any) => {
        this.members = res.data || [];
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  energyEmoji(level: number): string {
    const map: Record<number, string> = { 1: '😴', 2: '😔', 3: '😐', 4: '😊', 5: '🚀' };
    return map[level] || '❓';
  }

  energyClass(level: number): string {
    if (level >= 4) return 'high';
    if (level >= 3) return 'medium';
    return 'low';
  }

  avatarColor(name: string): string {
    const colors = ['#4f46e5', '#7c3aed', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444'];
    return colors[name.charCodeAt(0) % colors.length];
  }
}
