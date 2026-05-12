import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { TeamHealthWidgetComponent } from './team-health-widget.component';

@Component({
  selector: 'app-team-health-page',
  standalone: true,
  imports: [CommonModule, MatIconModule, TeamHealthWidgetComponent],
  template: `
    <div class="page-root">
      <div class="page-header">
        <div class="header-icon">
          <mat-icon>favorite</mat-icon>
        </div>
        <div>
          <h1 class="page-title">Santé de l'équipe</h1>
          <p class="page-subtitle">Analyse IA des sentiments — 7 derniers jours</p>
        </div>
      </div>
      @if (projectId) {
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
      background: #f6f7fb;
      min-height: calc(100vh - 64px);
    }
    .page-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 32px;
    }
    .header-icon {
      width: 52px;
      height: 52px;
      border-radius: 16px;
      background: linear-gradient(135deg, #4f46e5, #818cf8);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 8px 24px rgba(79,70,229,0.3);
    }
    .header-icon mat-icon {
      color: #fff;
      font-size: 26px;
      width: 26px;
      height: 26px;
    }
    .page-title {
      font-size: 24px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 3px;
      letter-spacing: -0.5px;
    }
    .page-subtitle {
      font-size: 13px;
      color: #94a3b8;
      margin: 0;
    }
  `]
})
export class TeamHealthPageComponent implements OnInit {
  private route = inject(ActivatedRoute);
  projectId = '';

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.projectId = params.get('projectId') ?? '';
    });
  }
}
