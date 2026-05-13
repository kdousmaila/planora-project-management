// src/app/features/tasks/list/tasks-list.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BacklogService } from '../../../core/services/backlog.service';
import { AuthService } from '../../../core/services/auth.service';
import { BacklogItem, TaskStatus, TaskPriority } from '../../../core/models';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';
import { BacklogCreateDialogComponent } from '../../backlog/create/backlog-create-dialog.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { TaskCardComponent, TaskCardData } from '../card/task-card.component';

@Component({
  selector: 'app-tasks-list',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatPaginatorModule,
    MatSnackBarModule,
    MatDialogModule,
    MatTooltipModule,
    LoadingComponent,
    TaskCardComponent
  ],
  templateUrl: './tasks-list.component.html',
  styleUrls: ['./tasks-list.component.scss']
})
export class TasksListComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private backlogService = inject(BacklogService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  projectId: string | null = null;
  backlogItems: BacklogItem[] = [];
  totalCount = 0;
  pageSize = 10;
  currentPage = 1;
  loading = true;

  get canManage(): boolean {
    return this.authService.hasRole(['Admin', 'ProjectManager']);
  }

  ngOnInit(): void {
    this.projectId = this.route.snapshot.paramMap.get('projectId');
    this.loadBacklogItems();
  }

  loadBacklogItems(): void {
    this.loading = true;

    if (this.projectId) {
      // ✅ Use the new endpoint getAllBacklogItemsForProject
      this.backlogService.getAllBacklogItemsForProject(this.projectId, this.currentPage, this.pageSize).subscribe({
        next: (response: any) => {
          this.loading = false;
          if (response.success) {
            this.backlogItems = response.data.items;
            this.totalCount = response.data.totalCount;
          }
        },
        error: (error: any) => {
          this.loading = false;
          this.snackBar.open('Error loading tickets', 'Close', { duration: 3000 });
        }
      });
    } else {
      this.loading = false;
    }
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex + 1;
    this.pageSize = event.pageSize;
    this.loadBacklogItems();
  }

  openCreate(): void {
    const ref = this.dialog.open(BacklogCreateDialogComponent, {
      width: '550px',
      data: { projectId: this.projectId || '' }
    });
    ref.afterClosed().subscribe((result: any) => { if (result) this.loadBacklogItems(); });
  }

  openEdit(itemData: TaskCardData): void {
    const item = this.backlogItems.find(i => i.id === itemData.id);
    if (!item) return;

    const ref = this.dialog.open(BacklogCreateDialogComponent, {
      width: '550px',
      data: {
        projectId: this.projectId || '',
        item: item
      }
    });
    ref.afterClosed().subscribe((result: any) => { if (result) this.loadBacklogItems(); });
  }

  deleteBacklogItem(itemData: TaskCardData): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Delete ticket',
        message: `Are you sure you want to delete "${itemData.title}"?`,
        confirmLabel: 'Delete',
        danger: true
      }
    });
    ref.afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed) return;
      this.backlogService.deleteBacklogItem(itemData.id).subscribe({
        next: (response: any) => {
          if (response.success) {
            this.snackBar.open('Ticket deleted', 'Close', { duration: 3000 });
            this.loadBacklogItems();
          }
        },
        error: () => this.snackBar.open('Error while deleting', 'Close', { duration: 3000 })
      });
    });
  }

  getStatusLabel(status: TaskStatus): string {
    return ['To Do', 'In Progress', 'Done'][status] ?? status.toString();
  }

  getStatusClass(status: TaskStatus): string {
    return ['status-todo', 'status-progress', 'status-done'][status] ?? '';
  }

  getPriorityLabel(priority: TaskPriority): string {
    return ['Low', 'Medium', 'High', 'Critical'][priority] ?? priority.toString();
  }

  getPriorityClass(priority: TaskPriority): string {
    return ['priority-low', 'priority-medium', 'priority-high', 'priority-critical'][priority] ?? '';
  }
}
