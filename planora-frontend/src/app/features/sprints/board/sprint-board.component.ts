// src/app/features/sprints/board/sprint-board.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DragDropModule, CdkDragDrop, transferArrayItem } from '@angular/cdk/drag-drop';
import { BacklogService } from '../../../core/services/backlog.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { SprintService } from '../../../core/services/sprint.service';
import {
  BacklogItem,
  TaskPriority,
  TaskStatus,
  Sprint,
  SprintStatus,
  ApiResponse
} from '../../../core/models';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';
import { BacklogCreateDialogComponent } from '../../backlog/create/backlog-create-dialog.component';

@Component({
  selector: 'app-sprint-board',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatSelectModule,
    MatDialogModule,
    MatTooltipModule,
    DragDropModule,
    LoadingComponent
  ],
  templateUrl: './sprint-board.component.html',
  styleUrls: ['./sprint-board.component.scss']
})
export class SprintBoardComponent implements OnInit {
  private route = inject(ActivatedRoute);
  router = inject(Router);
  private backlogService = inject(BacklogService);
  private sprintService = inject(SprintService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  projectId = '';
  sprints: Sprint[] = [];
  selectedSprintId: string | null = null;
  selectedSprint: Sprint | null = null;

  todoItems: BacklogItem[] = [];
  inProgressItems: BacklogItem[] = [];
  doneItems: BacklogItem[] = [];

  loading = true;

  readonly STATUS_TODO = TaskStatus.Todo;
  readonly STATUS_IN_PROGRESS = TaskStatus.InProgress;
  readonly STATUS_DONE = TaskStatus.Done;

  ngOnInit(): void {
    this.projectId = this.route.snapshot.paramMap.get('projectId')!;

    this.route.queryParams.subscribe(params => {
      const sprintIdFromQuery = params['sprintId'];
      if (sprintIdFromQuery) {
        this.selectedSprintId = sprintIdFromQuery;
      }
      this.loadSprints();
    });
  }

  forceRefresh(): void {
    this.loadSprintItems();
    this.snackBar.open('Forced refresh', 'Close', { duration: 2000 });
  }

  completeSprint(): void {
    if (!this.selectedSprintId) return;

    const currentSprint = this.sprints.find(s => s.id === this.selectedSprintId);

    if (currentSprint?.status === SprintStatus.Planning) {

      const confirmDialog = this.dialog.open(ConfirmDialogComponent, {
        width: '400px',
        data: {
          title: 'Sprint not started',
          message: `This sprint has not been started yet. Do you want to start it or delete it?`,
          confirmLabel: 'Start',
          cancelLabel: 'Delete',
          danger: false
        }
      });

      confirmDialog.afterClosed().subscribe((confirmed: boolean) => {
        if (confirmed) {
          this.sprintService.startSprint(this.selectedSprintId!).subscribe({
            next: () => {
              this.loadSprints();
              this.snackBar.open('Sprint started!', 'Close', { duration: 3000 });
            },
            error: () => {
              this.snackBar.open('Error while starting', 'Close', { duration: 3000 });
            }
          });
        } else {
          this.sprintService.deleteSprint(this.selectedSprintId!).subscribe({
            next: () => {
              this.loadSprints();
              this.snackBar.open('Sprint deleted', 'Close', { duration: 3000 });
            },
            error: () => {
              this.snackBar.open('Error while deleting', 'Close', { duration: 3000 });
            }
          });
        }
      });

      return;
    }

    const allTasksDone =
      this.doneItems.length ===
      (this.todoItems.length + this.inProgressItems.length + this.doneItems.length);

    if (!allTasksDone) {
      this.snackBar.open(
        'All tasks must be completed before closing the sprint',
        'Close',
        { duration: 3000 }
      );
      return;
    }

    const confirmDialog = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Complete sprint',
        message: `Are you sure you want to complete sprint "${this.selectedSprint?.name}" ?`,
        confirmLabel: 'Complete',
        danger: false
      }
    });

    confirmDialog.afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed) return;

      this.sprintService.closeSprint(this.selectedSprintId!).subscribe({
        next: (response: ApiResponse<Sprint>) => {
          if (response.success) {
            this.snackBar.open('✓ Sprint completed!', 'Close', { duration: 3000 });
            this.loadSprints();
          }
        },
        error: () => {
          this.snackBar.open('Error while closing', 'Close', { duration: 3000 });
        }
      });
    });
  }

  fixTicketStatuses(): void {
    this.backlogService.getBacklogByProject(this.projectId).subscribe({
      next: (response: ApiResponse<BacklogItem[]>) => {
        if (response.success) {
          const itemsToFix = response.data.filter((item: BacklogItem) =>
            item.sprintId === this.selectedSprintId &&
            (item.status === undefined || item.status === null ||
              (item.status !== TaskStatus.Todo &&
                item.status !== TaskStatus.InProgress &&
                item.status !== TaskStatus.Done))
          );

          if (itemsToFix.length === 0) {
            this.snackBar.open('No tickets to fix', 'Close', { duration: 2000 });
            return;
          }

          let fixedCount = 0;

          itemsToFix.forEach((item: BacklogItem) => {
            this.backlogService.updateBacklogItemStatus(item.id, TaskStatus.Todo).subscribe({
              next: () => {
                fixedCount++;
                if (fixedCount === itemsToFix.length) {
                  this.snackBar.open(`${fixedCount} tickets fixed!`, 'Close', { duration: 3000 });
                  this.loadSprintItems();
                }
              },
              error: (err) => {
                console.error(`Error fixing ${item.title}:`, err);
              }
            });
          });
        }
      }
    });
  }

  loadSprints(): void {
    this.loading = true;

    this.sprintService.getSprintsByProject(this.projectId).subscribe({
      next: (response: ApiResponse<Sprint[]>) => {
        if (response.success) {
          this.sprints = response.data.filter(s => s.status !== SprintStatus.Closed);

          if (this.sprints.length === 0) {
            this.selectedSprintId = null;
            this.selectedSprint = null;
            this.todoItems = [];
            this.inProgressItems = [];
            this.doneItems = [];
            this.loading = false;
            return;
          }

          if (this.selectedSprintId) {
            const sprintExists = this.sprints.some(s => s.id === this.selectedSprintId);
            if (sprintExists) {
              this.loadSprintItems();
              this.loading = false;
              return;
            }
            this.selectedSprintId = null;
            this.selectedSprint = null;
          }

          this.selectedSprintId = this.sprints[0].id;
          this.loadSprintItems();
        }

        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Error loading sprints', 'Close', { duration: 3000 });
      }
    });
  }

  loadSprintItems(): void {
    if (!this.selectedSprintId) return;

    this.selectedSprint = this.sprints.find(s => s.id === this.selectedSprintId) || null;
    this.loading = true;

    this.backlogService.getBacklogByProject(this.projectId).subscribe({
      next: (response: ApiResponse<BacklogItem[]>) => {
        if (response.success) {
          const itemsInSprint = response.data.filter(
            (item: BacklogItem) => item.sprintId === this.selectedSprintId
          );

          itemsInSprint.forEach((item: BacklogItem) => {
            if (
              item.status === undefined ||
              item.status === null ||
              (item.status !== TaskStatus.Todo &&
                item.status !== TaskStatus.InProgress &&
                item.status !== TaskStatus.Done)
            ) {
              item.status = TaskStatus.Todo;
            }
          });

          this.todoItems = itemsInSprint.filter(i => i.status === TaskStatus.Todo);
          this.inProgressItems = itemsInSprint.filter(i => i.status === TaskStatus.InProgress);
          this.doneItems = itemsInSprint.filter(i => i.status === TaskStatus.Done);

          this.todoItems = [...this.todoItems];
          this.inProgressItems = [...this.inProgressItems];
          this.doneItems = [...this.doneItems];
        }

        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Error loading tickets', 'Close', { duration: 3000 });
      }
    });
  }

  onSprintChange(sprintId: string): void {
    this.selectedSprintId = sprintId;
    this.loadSprintItems();
  }

  onDrop(event: CdkDragDrop<BacklogItem[]>, newStatus: TaskStatus): void {
    if (event.previousContainer === event.container) return;

    const item = event.previousContainer.data[event.previousIndex];

    transferArrayItem(
      event.previousContainer.data,
      event.container.data,
      event.previousIndex,
      event.currentIndex
    );

    item.status = newStatus;

    this.backlogService.updateBacklogItemStatus(item.id, newStatus).subscribe({
      next: (response) => {
        if (response.success) {
          this.snackBar.open('Ticket moved successfully', 'Close', { duration: 2000 });
        } else {
          this.loadSprintItems();
          this.snackBar.open('Error while moving', 'Close', { duration: 3000 });
        }
      },
      error: () => {
        this.loadSprintItems();
        this.snackBar.open('Error while moving', 'Close', { duration: 3000 });
      }
    });
  }

  createItem(): void {
    const ref = this.dialog.open(BacklogCreateDialogComponent, {
      width: '550px',
      data: { projectId: this.projectId, sprintId: this.selectedSprintId }
    });

    ref.afterClosed().subscribe((result: boolean | undefined) => {
      if (result) this.loadSprintItems();
    });
  }

  editItem(item: BacklogItem): void {
    const ref = this.dialog.open(BacklogCreateDialogComponent, {
      width: '550px',
      data: { projectId: this.projectId, sprintId: this.selectedSprintId, item }
    });

    ref.afterClosed().subscribe((result: boolean | undefined) => {
      if (result) this.loadSprintItems();
    });
  }

  deleteItem(item: BacklogItem): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Delete ticket',
        message: `Are you sure you want to delete "${item.title}" ?`,
        confirmLabel: 'Delete',
        danger: true
      }
    });

    ref.afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed) return;

      this.backlogService.deleteBacklogItem(item.id).subscribe({
        next: (response) => {
          if (response.success) {
            this.snackBar.open('Ticket deleted', 'Close', { duration: 3000 });
            this.loadSprintItems();
          }
        },
        error: () => {
          this.snackBar.open('Error while deleting', 'Close', { duration: 3000 });
        }
      });
    });
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
    const labels = ['To Do', 'In Progress', 'Done'];
    return labels[status] ?? '';
  }

  getSprintStatusLabel(status: SprintStatus): string {
    const labels = ['Planning', 'Active', 'Closed'];
    return labels[status] ?? '';
  }

  getSprintStatusClass(status: SprintStatus): string {
    const classes = ['planning', 'active', 'closed'];
    return classes[status] ?? '';
  }

  getItemStoryPoints(item: BacklogItem): number {
    return item.storyPoints ?? item.complexity ?? 0;
  }

  getSelectedSprintTotalPoints(): number {
    return [...this.todoItems, ...this.inProgressItems, ...this.doneItems]
      .reduce((sum, item) => sum + this.getItemStoryPoints(item), 0);
  }

  getSelectedSprintPointsByStatus(status: TaskStatus): number {
    const source =
      status === TaskStatus.Todo
        ? this.todoItems
        : status === TaskStatus.InProgress
          ? this.inProgressItems
          : this.doneItems;

    return source.reduce((sum, item) => sum + this.getItemStoryPoints(item), 0);
  }

  isCompleteButtonDisabled(): boolean {
    if (!this.selectedSprint) return true;

    if (this.selectedSprint.status === SprintStatus.Planning) return true;

    if (this.selectedSprint.status === SprintStatus.Active) {
      const hasUnfinished = (this.todoItems.length + this.inProgressItems.length) > 0;
      return hasUnfinished;
    }

    return true;
  }

  getCompleteButtonTooltip(): string {
    if (!this.selectedSprint) return '';

    if (this.selectedSprint.status === SprintStatus.Planning) {
      return '📋 This sprint has not started yet. Go to the Backlog to start it.';
    }

    if (this.selectedSprint.status === SprintStatus.Active) {
      const unfinishedCount = this.todoItems.length + this.inProgressItems.length;
      if (unfinishedCount > 0) {
        return `⚠️ ${unfinishedCount} unfinished task(s). Move all tasks to "Done" before closing the sprint.`;
      }
      return '✅ Complete this sprint';
    }

    return '';
  }

  goToHistory(): void {
    this.router.navigate(['/projects', this.projectId, 'history']);
  }
}
