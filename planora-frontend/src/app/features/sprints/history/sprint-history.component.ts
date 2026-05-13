// src/app/features/sprints/history/sprint-history.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SprintService } from '../../../core/services/sprint.service';
import { Sprint, BacklogItem, TaskStatus } from '../../../core/models';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-sprint-history',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatProgressBarModule,
    LoadingComponent,
    RouterLink
  ],
  templateUrl: './sprint-history.component.html',
  styleUrls: ['./sprint-history.component.scss']
})
export class SprintHistoryComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private sprintService = inject(SprintService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);

  projectId = '';
  completedSprints: Sprint[] = [];
  sprintTasksMap: Map<string, BacklogItem[]> = new Map();
  loading = true;

  readonly sprintColors = ['#4f46e5', '#059669', '#d97706', '#dc2626', '#0891b2'];

  ngOnInit(): void {
    this.projectId = this.route.snapshot.paramMap.get('projectId')!;
    this.loadCompletedSprints();
  }

  loadCompletedSprints(): void {
    this.loading = true;

    this.sprintService.getCompletedSprints(this.projectId).subscribe({
      next: (response: any) => {
        if (response && response.success) {
          this.completedSprints = response.data || [];
          this.loadSprintTasks();
        }

        this.loading = false;
      },

      error: (err) => {
        console.error('Error loading completed sprints:', err);

        this.loading = false;

        this.snackBar.open(
          'Error loading sprints',
          'Close',
          { duration: 3000 }
        );
      }
    });
  }

  loadSprintTasks(): void {
    if (this.completedSprints.length === 0) return;

    this.completedSprints.forEach(sprint => {

      this.sprintService.getSprintTasks(sprint.id).subscribe({

        next: (response: any) => {
          if (response && response.success) {
            this.sprintTasksMap.set(sprint.id, response.data || []);
          }
        },

        error: (err) => {
          console.error(`Error loading tasks for sprint ${sprint.id}:`, err);

          this.sprintTasksMap.set(sprint.id, []);
        }

      });

    });
  }

  getSprintTasksCount(sprintId: string): number {
    return this.sprintTasksMap.get(sprintId)?.length || 0;
  }

  getSprintCompletedTasksCount(sprintId: string): number {
    const tasks = this.sprintTasksMap.get(sprintId) || [];

    return tasks.filter(t => t.status === TaskStatus.Done).length;
  }

  getSprintCompletionRate(sprintId: string): number {
    const total = this.getSprintTasksCount(sprintId);

    if (total === 0) return 0;

    const completed = this.getSprintCompletedTasksCount(sprintId);

    return Math.round((completed / total) * 100);
  }

  getTotalCompletedTasks(): number {
    let total = 0;

    this.completedSprints.forEach(sprint => {
      total += this.getSprintCompletedTasksCount(sprint.id);
    });

    return total;
  }

  getAverageCompletionRate(): number {
    if (this.completedSprints.length === 0) return 0;

    let total = 0;

    this.completedSprints.forEach(sprint => {
      total += this.getSprintCompletionRate(sprint.id);
    });

    return Math.round(total / this.completedSprints.length);
  }

  getSprintColor(index: number): string {
    return this.sprintColors[index % this.sprintColors.length];
  }

  viewSprint(sprintId: string): void {
    this.router.navigate(['/projects', this.projectId, 'history', sprintId]);
  }
}
