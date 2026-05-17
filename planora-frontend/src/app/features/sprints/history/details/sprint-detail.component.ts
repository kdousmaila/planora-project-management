// src/app/features/sprints/history/details/sprint-detail.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SprintService } from '../../../../core/services/sprint.service';
import { BacklogService } from '../../../../core/services/backlog.service';
import { Sprint, BacklogItem, TaskStatus, TaskPriority } from '../../../../core/models';
import { LoadingComponent } from '../../../../shared/components/loading/loading.component';

@Component({
  selector: 'app-sprint-detail',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatProgressBarModule,
    LoadingComponent
  ],
  templateUrl: './sprint-detail.component.html',
  styleUrls: ['./sprint-detail.component.scss']
})
export class SprintDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private sprintService = inject(SprintService);
  private backlogService = inject(BacklogService);
  private snackBar = inject(MatSnackBar);

  projectId = '';
  sprintId = '';
  sprint: Sprint | null = null;
  tasks: BacklogItem[] = [];
  loading = true;
  statusFilter: 'all' | 'done' | 'unfinished' = 'all';

  TaskStatus = TaskStatus;

  ngOnInit(): void {
    this.projectId = this.route.snapshot.paramMap.get('projectId')!;
    this.sprintId = this.route.snapshot.paramMap.get('sprintId')!;
    this.loadData();
  }

  loadData(): void {
    this.loading = true;

    this.sprintService.getSprint(this.sprintId).subscribe({
      next: (response: any) => {
        if (response?.success) {
          this.sprint = response.data;
          this.loadTasks();
        } else {
          this.loading = false;
          this.snackBar.open('Sprint not found', 'Close', { duration: 3000 });
        }
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Failed to load sprint', 'Close', { duration: 3000 });
      }
    });
  }

  loadTasks(): void {
    this.backlogService.getSprintTasks(this.sprintId).subscribe({
      next: (response: any) => {
        this.tasks = response?.data || [];
        this.loading = false;
      },
      error: () => {
        this.tasks = [];
        this.loading = false;
        this.snackBar.open('Failed to load tickets', 'Close', { duration: 3000 });
      }
    });
  }

  get filteredTasks(): BacklogItem[] {
    if (this.statusFilter === 'done') {
      return this.tasks.filter(t => t.status === TaskStatus.Done);
    }
    if (this.statusFilter === 'unfinished') {
      return this.tasks.filter(t => t.status !== TaskStatus.Done);
    }
    return this.tasks;
  }

  setFilter(filter: 'all' | 'done' | 'unfinished'): void {
    this.statusFilter = filter;
  }

  getCompletedCount(): number {
    return this.tasks.filter(t => t.status === TaskStatus.Done).length;
  }

  getUnfinishedCount(): number {
    return this.tasks.filter(t => t.status !== TaskStatus.Done).length;
  }

  getCompletionRate(): number {
    if (this.tasks.length === 0) return 0;
    return Math.round((this.getCompletedCount() / this.tasks.length) * 100);
  }

  getDuration(): number {
    if (!this.sprint) return 0;
    const start = new Date(this.sprint.startDate);
    const end = new Date(this.sprint.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  getPriorityLabel(priority: TaskPriority): string {
    const labels = ['Low', 'Medium', 'High', 'Critical'];
    return labels[priority] ?? '';
  }

  getPriorityClass(priority: TaskPriority): string {
    const classes = ['priority-low', 'priority-medium', 'priority-high', 'priority-critical'];
    return classes[priority] ?? '';
  }

  getStatusLabel(status: TaskStatus): string {
    const labels = ['To do', 'In progress', 'Done'];
    return labels[status] ?? '';
  }

  getStatusClass(status: TaskStatus): string {
    const classes = ['status-todo', 'status-progress', 'status-done'];
    return classes[status] ?? '';
  }

  exportToCSV(): void {
    const headers = ['ID', 'Title', 'Description', 'Priority', 'Status'];
    const rows = this.tasks.map(task => [
      task.id.slice(-6),
      `"${task.title.replace(/"/g, '""')}"`,
      `"${(task.description || '').replace(/"/g, '""')}"`,
      this.getPriorityLabel(task.priority),
      this.getStatusLabel(task.status)
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `sprint_${this.sprint?.name}_tickets.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    this.snackBar.open('CSV export successful!', 'Close', { duration: 2000 });
  }

  goBack(): void {
    this.router.navigate(['/projects', this.projectId, 'history']);
  }
}
