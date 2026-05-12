import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { DashboardService } from '../../core/services/dashboard.service';
import { DashboardData } from '../../core/models';
import { LoadingComponent } from '../../shared/components/loading/loading.component';
import { AuthService } from '../../core/services/auth.service';

// ✅ Import supprimé — TeamHealthWidgetComponent n'est plus dans le dashboard

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatProgressBarModule,
    MatTableModule,
    MatIconModule,
    MatButtonModule,
    MatSnackBarModule,
    LoadingComponent,
    // ✅ TeamHealthWidgetComponent retiré ici aussi
  ],
  templateUrl: './dashboard.component.html',
  styles: [`
    .dash-root {
      padding: 36px 40px;
      max-width: 1400px;
      margin: 0 auto;
      min-height: calc(100vh - 64px);
      font-family: 'Segoe UI', system-ui, sans-serif;
      background: #f6f7fb;
    }
    .dash-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 36px;
    }
    .dash-header-left {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .dash-avatar-ring {
      width: 52px;
      height: 52px;
      border-radius: 16px;
      background: linear-gradient(135deg, #4f46e5, #818cf8);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 26px;
      box-shadow: 0 8px 24px rgba(79, 70, 229, 0.3);
    }
    .dash-title {
      font-size: 24px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 3px;
      letter-spacing: -0.5px;
    }
    .dash-subtitle {
      font-size: 13px;
      color: #94a3b8;
      margin: 0;
    }
    .dash-date-chip {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      font-weight: 500;
      color: #475569;
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 8px 16px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.04);
    }
    .date-icon { font-size: 15px; }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
      margin-bottom: 28px;
    }
    @media (max-width: 1024px) { .kpi-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 600px)  { .kpi-grid { grid-template-columns: 1fr; } }
    .kpi-card {
      border-radius: 20px;
      padding: 24px;
      color: #fff;
      position: relative;
      overflow: hidden;
      display: flex;
      align-items: center;
      gap: 18px;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      animation: fadeUp 0.4s ease both;
    }
    .kpi-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 20px 48px -8px rgba(0,0,0,0.22);
    }
    .kpi-card:nth-child(1) { animation-delay: 0.05s; }
    .kpi-card:nth-child(2) { animation-delay: 0.10s; }
    .kpi-card:nth-child(3) { animation-delay: 0.15s; }
    .kpi-card:nth-child(4) { animation-delay: 0.20s; }
    .kpi-indigo { background: linear-gradient(135deg, #4f46e5 0%, #818cf8 100%); box-shadow: 0 10px 32px rgba(79, 70, 229, 0.3); }
    .kpi-cyan   { background: linear-gradient(135deg, #0891b2 0%, #22d3ee 100%); box-shadow: 0 10px 32px rgba(8, 145, 178, 0.3); }
    .kpi-amber  { background: linear-gradient(135deg, #d97706 0%, #fbbf24 100%); box-shadow: 0 10px 32px rgba(217, 119, 6, 0.3); }
    .kpi-green  { background: linear-gradient(135deg, #059669 0%, #34d399 100%); box-shadow: 0 10px 32px rgba(5, 150, 105, 0.3); }
    .kpi-icon-wrap {
      width: 52px;
      height: 52px;
      border-radius: 14px;
      background: rgba(255,255,255,0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      backdrop-filter: blur(4px);
    }
    .kpi-icon-wrap mat-icon { font-size: 24px; width: 24px; height: 24px; color: #fff; }
    .kpi-body { display: flex; flex-direction: column; gap: 4px; }
    .kpi-label {
      font-size: 12px;
      font-weight: 600;
      opacity: 0.85;
      text-transform: uppercase;
      letter-spacing: 0.7px;
    }
    .kpi-value {
      font-size: 40px;
      font-weight: 800;
      line-height: 1;
      letter-spacing: -1.5px;
    }
    .kpi-glow {
      position: absolute;
      top: -40px;
      right: -40px;
      width: 120px;
      height: 120px;
      border-radius: 50%;
      background: rgba(255,255,255,0.12);
      pointer-events: none;
    }
    .mid-row {
      display: grid;
      grid-template-columns: 280px 1fr;
      gap: 20px;
      margin-bottom: 24px;
    }
    @media (max-width: 900px) { .mid-row { grid-template-columns: 1fr; } }
    .card {
      background: #fff;
      border-radius: 20px;
      padding: 26px;
      border: 1px solid #e8eaf6;
      box-shadow: 0 2px 12px rgba(79, 70, 229, 0.05);
      transition: box-shadow 0.2s;
      animation: fadeUp 0.4s ease both;
    }
    .card:hover { box-shadow: 0 8px 32px rgba(79, 70, 229, 0.09); }
    .card--progress { animation-delay: 0.25s; }
    .card--breakdown { animation-delay: 0.30s; }
    .card--table { animation-delay: 0.35s; }
    .card-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 22px;
    }
    .card-title {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 15px;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
    }
    .title-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
    .dot-indigo { background: #4f46e5; }
    .dot-cyan   { background: #0891b2; }
    .dot-amber  { background: #d97706; }
    .dot-green  { background: #059669; }
    .pct-badge {
      background: #ede9fe;
      color: #4f46e5;
      font-size: 13px;
      font-weight: 700;
      padding: 4px 12px;
      border-radius: 20px;
      letter-spacing: -0.2px;
    }
    .card--progress { text-align: center; }
    .progress-circle-wrap {
      position: relative;
      width: 148px;
      height: 148px;
      margin: 0 auto 16px;
    }
    .progress-ring { width: 148px; height: 148px; transform: rotate(-90deg); }
    .ring-track { fill: none; stroke: #ede9fe; stroke-width: 10; }
    .ring-fill {
      fill: none;
      stroke: url(#ring-gradient);
      stroke: #4f46e5;
      stroke-width: 10;
      stroke-linecap: round;
      stroke-dasharray: 314;
      transition: stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .ring-center {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .ring-pct { font-size: 28px; font-weight: 800; color: #0f172a; line-height: 1; letter-spacing: -1px; }
    .ring-sub { font-size: 11px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; }
    .progress-desc { font-size: 13px; color: #64748b; margin: 0; }
    .progress-desc strong { color: #0f172a; font-weight: 700; }
    .breakdown-list { display: flex; flex-direction: column; gap: 20px; }
    .bd-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
    .bd-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
    .dot-todo       { background: #4f46e5; }
    .dot-inprogress { background: #f59e0b; }
    .dot-done       { background: #10b981; }
    .bd-name { font-size: 13px; font-weight: 600; color: #334155; flex: 1; }
    .bd-count { font-size: 13px; font-weight: 700; color: #0f172a; }
    .bd-pct { font-size: 12px; color: #94a3b8; font-weight: 500; min-width: 34px; text-align: right; }
    .bd-track { height: 7px; background: #f1f5f9; border-radius: 8px; overflow: hidden; }
    .bd-fill { height: 100%; border-radius: 8px; transition: width 1s cubic-bezier(0.4, 0, 0.2, 1); }
    .bd-fill--todo       { background: linear-gradient(90deg, #4f46e5, #818cf8); }
    .bd-fill--inprogress { background: linear-gradient(90deg, #d97706, #fbbf24); }
    .bd-fill--done       { background: linear-gradient(90deg, #059669, #34d399); }
    .card--table { padding: 26px; }
    .view-all-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 13px;
      font-weight: 600;
      color: #4f46e5;
      text-decoration: none;
      padding: 6px 14px;
      border-radius: 10px;
      background: #ede9fe;
      transition: background 0.15s, transform 0.15s;
    }
    .view-all-btn mat-icon { font-size: 16px; width: 16px; height: 16px; transition: transform 0.2s; }
    .view-all-btn:hover { background: #ddd6fe; transform: translateX(2px); }
    .view-all-btn:hover mat-icon { transform: translateX(3px); }
    .proj-table { width: 100%; }
    ::ng-deep .proj-table .mat-mdc-header-cell {
      font-size: 11px !important; font-weight: 700 !important; color: #94a3b8 !important;
      text-transform: uppercase; letter-spacing: 0.6px;
      border-bottom: 1px solid #f1f5f9 !important;
      padding: 12px 16px !important; background: #fafbff !important;
    }
    ::ng-deep .proj-table .mat-mdc-cell {
      padding: 16px 16px !important;
      border-bottom: 1px solid #f8f8fc !important;
      font-size: 14px;
    }
    ::ng-deep .proj-table .mat-mdc-row { transition: background 0.15s; }
    ::ng-deep .proj-table .mat-mdc-row:hover .mat-mdc-cell { background: #faf8ff !important; }
    .proj-link {
      display: flex; align-items: center; gap: 12px;
      text-decoration: none; color: #0f172a; font-weight: 600; font-size: 14px; transition: color 0.15s;
    }
    .proj-link:hover { color: #4f46e5; }
    .proj-avatar {
      width: 34px; height: 34px; border-radius: 10px;
      background: linear-gradient(135deg, #4f46e5, #818cf8);
      color: #fff; font-size: 14px; font-weight: 700;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
      box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);
    }
    .num-badge {
      display: inline-flex; align-items: center; justify-content: center;
      height: 26px; border-radius: 8px; background: #f5f3ff; color: #4f46e5;
      font-size: 13px; font-weight: 700; padding: 0 10px; letter-spacing: -0.2px;
    }
    .prog-cell { display: flex; align-items: center; gap: 12px; }
    .prog-track { flex: 1; height: 7px; background: #f1f5f9; border-radius: 8px; overflow: hidden; max-width: 140px; }
    .prog-fill { height: 100%; border-radius: 8px; transition: width 0.8s ease; }
    .prog-low  { background: linear-gradient(90deg, #4f46e5, #818cf8); }
    .prog-mid  { background: linear-gradient(90deg, #d97706, #fbbf24); }
    .prog-high { background: linear-gradient(90deg, #059669, #34d399); }
    .prog-pct { font-size: 12px; font-weight: 700; color: #475569; min-width: 36px; }
    .table-empty { text-align: center; padding: 48px 20px; color: #94a3b8; }
    .empty-icon-wrap {
      width: 56px; height: 56px; border-radius: 16px; background: #f5f3ff;
      display: flex; align-items: center; justify-content: center; margin: 0 auto 14px;
    }
    .empty-icon-wrap mat-icon { font-size: 28px; width: 28px; height: 28px; color: #a5b4fc; }
    .table-empty p { font-size: 14px; margin: 0; color: #94a3b8; }
    .ws-pagination {
      display: flex; align-items: center; justify-content: center;
      gap: 16px; padding: 18px; border-top: 1px solid #f1f5f9; margin-top: 4px;
    }
    .ws-page-btn {
      width: 34px; height: 34px; border-radius: 10px;
      border: 1.5px solid #e0e7ff; background: white; color: #4f46e5;
      cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s;
    }
    .ws-page-btn mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .ws-page-btn:hover:not(:disabled) { background: #ede9fe; border-color: #c7d2fe; }
    .ws-page-btn:disabled { opacity: 0.35; cursor: not-allowed; }
    .ws-page-info { font-size: 13px; font-weight: 700; color: #475569; min-width: 48px; text-align: center; }
    .page-empty { text-align: center; padding: 100px 40px; color: #94a3b8; }
    .page-empty mat-icon { font-size: 60px; width: 60px; height: 60px; display: block; margin: 0 auto 16px; opacity: 0.4; }
    .page-empty h3 { font-size: 20px; font-weight: 700; color: #334155; margin: 0 0 8px; }
    .page-empty p { font-size: 14px; margin: 0; }
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(20px); }
      to   { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class DashboardComponent implements OnInit {
  private dashboardService = inject(DashboardService);
  private snackBar = inject(MatSnackBar);
  private authService = inject(AuthService);

  loading = true;
  data: DashboardData | null = null;
  displayedColumns = ['workspaceName', 'totalProjects', 'totalTasks', 'progress'];
  isAdmin = false;
  today = new Date();

  ngOnInit(): void {
    this.isAdmin = this.authService.hasRole(['Admin']);
    this.dashboardService.getDashboard().subscribe({
      next: response => {
        if (response.success) this.data = response.data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Dashboard error:', err);
        this.loading = false;
      }
    });
  }

  getPercent(count: number): number {
    if (!this.data || this.data.totalTasks === 0 || count <= 0) return 0;
    return Math.round((count / this.data.totalTasks) * 100);
  }

  wsPage = 0;
  wsPageSize = 5;

  get wsTotalPages(): number {
    if (!this.data?.workspacesProgress) return 1;
    return Math.ceil(this.data.workspacesProgress.length / this.wsPageSize);
  }

  get pagedWorkspaces() {
    if (!this.data?.workspacesProgress) return [];
    const start = this.wsPage * this.wsPageSize;
    return this.data.workspacesProgress.slice(start, start + this.wsPageSize);
  }
}
