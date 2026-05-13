import { Component, OnInit, inject, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { BacklogService } from '../../../core/services/backlog.service';
import { SprintService } from '../../../core/services/sprint.service';
import { AuthService } from '../../../core/services/auth.service';
import { BacklogItem, Sprint, TaskPriority } from '../../../core/models';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { BacklogCreateDialogComponent } from '../create/backlog-create-dialog.component';

@Component({
  selector: 'app-backlog-list',
  standalone: true,
  imports: [
    CommonModule, RouterLink, ReactiveFormsModule, FormsModule,
    MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatSnackBarModule, MatDialogModule, MatTooltipModule,
    MatChipsModule, DragDropModule, LoadingComponent
  ],
  templateUrl: './backlog-list.component.html',
  styleUrls: ['./backlog-list.component.scss']
})
export class BacklogListComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private backlogService = inject(BacklogService);
  private sprintService = inject(SprintService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  projectId = '';
  items: BacklogItem[] = [];
  sprints: Sprint[] = [];
  loading = true;

  sprintItemsMap: Map<string, BacklogItem[]> = new Map();
  backlogItems: BacklogItem[] = [];

  readonly sprintColors = ['#6366f1', '#059669', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'];
  readonly sprintColorsLight = ['#ede9fe', '#d1fae5', '#fef3c7', '#fee2e2', '#cffafe', '#fce7f3'];

  get canManage(): boolean {
    return this.authService.hasRole(['Admin', 'ProjectManager']);
  }

  ngOnInit(): void {
    this.projectId = this.route.snapshot.paramMap.get('projectId')!;
    this.loadAll();
  }

  loadAll(): void {
    this.loading = true;
    this.sprintService.getSprintsByProject(this.projectId).subscribe(r => {
      if (r.success) {
        this.sprints = r.data;
        this.sprints.forEach(s => this.sprintItemsMap.set(s.id, []));
      }
      this.backlogService.getBacklogByProject(this.projectId).subscribe({
        next: response => {
          this.loading = false;
          if (response.success) {
            this.items = response.data;
            this.backlogItems = this.items.filter(i => !i.sprintId);
            this.sprints.forEach(s => {
              this.sprintItemsMap.set(s.id, this.items.filter(i => i.sprintId === s.id));
            });
          }
        },
        error: () => {
          this.loading = false;
          this.snackBar.open('Loading error', 'Close', { duration: 3000 });
        }
      });
    });
  }

  getSprintItems(sprintId: string): BacklogItem[] {
    return this.sprintItemsMap.get(sprintId) ?? [];
  }

  getSprintIds(): string[] {
    return this.sprints.map(s => s.id);
  }

  getAllListIds(excludeId: string): string[] {
    const ids = ['backlog', ...this.sprints.map(s => s.id)];
    return ids.filter(id => id !== excludeId);
  }

  getSprintColor(index: number): string {
    return this.sprintColors[index % this.sprintColors.length];
  }

  getSprintColorLight(index: number): string {
    return this.sprintColorsLight[index % this.sprintColorsLight.length];
  }

  onDrop(event: CdkDragDrop<BacklogItem[]>, targetSprintId: string | null): void {
    const item: BacklogItem = event.item.data;

    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      return;
    }

    transferArrayItem(
      event.previousContainer.data,
      event.container.data,
      event.previousIndex,
      event.currentIndex
    );

    if (targetSprintId) {
      this.backlogService.moveToSprint(item.id, targetSprintId).subscribe({
        next: r => {
          if (r.success) {
            item.sprintId = targetSprintId;
            this.snackBar.open('✅ Moved to sprint!', 'Close', { duration: 2000 });
          }
        },
        error: () => {
          this.loadAll();
          this.snackBar.open('Error while moving', 'Close', { duration: 3000 });
        }
      });
    } else {
      this.backlogService.removeFromSprint(item.id).subscribe({
        next: () => {
          item.sprintId = null;
          this.snackBar.open('↩️ Back to backlog', 'Close', { duration: 2000 });
        },
        error: () => this.loadAll()
      });
    }
  }

  removeFromSprint(item: BacklogItem): void {
    const sprintId = item.sprintId;
    if (!sprintId) return;
    this.backlogService.removeFromSprint(item.id).subscribe({
      next: () => {
        const sprintList = this.sprintItemsMap.get(sprintId) ?? [];
        const idx = sprintList.findIndex(i => i.id === item.id);
        if (idx !== -1) sprintList.splice(idx, 1);
        item.sprintId = null;
        this.backlogItems.push(item);
        this.snackBar.open('↩️ Back to backlog', 'Close', { duration: 2000 });
      },
      error: () => this.loadAll()
    });
  }

  openCreate(): void {
    const ref = this.dialog.open(BacklogCreateDialogComponent, {
      width: '450px',
      data: { projectId: this.projectId }
    });
    ref.afterClosed().subscribe(result => { if (result) this.loadAll(); });
  }

  cyclePriority(item: BacklogItem): void {
    const next = ((item.priority + 1) % 4) as TaskPriority;
    this.backlogService.updatePriority(item.id, next).subscribe({
      next: r => {
        if (r.success) {
          item.priority = next;
          this.snackBar.open(`Priority: ${this.getPriorityLabel(next)}`, 'Close', { duration: 1500 });
        }
      }
    });
  }

  moveToSprint(item: BacklogItem): void {
    if (this.sprints.length === 0) {
      this.snackBar.open('No sprints available', 'Close', { duration: 3000 });
      return;
    }

    const ref = this.dialog.open(MoveToSprintDialogComponent, {
      width: '420px',
      data: { sprints: this.sprints }
    });

    ref.afterClosed().subscribe((sprintId: string | undefined) => {
      if (!sprintId) return;

      this.backlogService.moveToSprint(item.id, sprintId).subscribe({
        next: response => {
          if (response.success) {
            this.snackBar.open('Item moved to sprint', 'Close', { duration: 2000 });
            this.loadAll();
          }
        },
        error: () => {
          this.snackBar.open('Error while moving', 'Close', { duration: 3000 });
        }
      });
    });
  }

  deleteItem(item: BacklogItem): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '380px',
      data: {
        title: 'Delete',
        message: `Delete "${item.title}"?`,
        confirmLabel: 'Delete',
        danger: true
      }
    });
    ref.afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.backlogService.deleteBacklogItem(item.id).subscribe({
        next: r => {
          if (r.success) {
            this.backlogItems = this.backlogItems.filter(i => i.id !== item.id);
            this.snackBar.open('Item deleted', 'Close', { duration: 2000 });
          }
        }
      });
    });
  }

  getPriorityLabel(priority: TaskPriority): string {
    return ['Low', 'Medium', 'High', 'Critical'][priority] ?? '';
  }

  getPriorityClass(priority: TaskPriority): string {
    return ['priority-low', 'priority-medium', 'priority-high', 'priority-critical'][priority] ?? '';
  }

  getSprintStatusLabel(status: number): string {
    return ['Planning', 'Active', 'Closed'][status] ?? '';
  }

  getSprintStatusClass(status: number): string {
    return ['status-planning', 'status-active', 'status-closed'][status] ?? '';
  }
}

@Component({
  standalone: true,
  selector: 'app-move-to-sprint-dialog',
  imports: [CommonModule, FormsModule, MatDialogModule, MatFormFieldModule, MatSelectModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Move to Sprint</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Select Sprint</mat-label>
        <mat-select [(ngModel)]="selectedSprintId" [ngModelOptions]="{standalone: true}">
          @for (s of data.sprints; track s) {
            <mat-option [value]="s.id">{{ s.name }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="primary" [mat-dialog-close]="selectedSprintId" [disabled]="!selectedSprintId">Move</button>
    </mat-dialog-actions>
    `,
  styles: [`.full-width { width: 100%; min-width: 250px; }`]
})
export class MoveToSprintDialogComponent {
  selectedSprintId = '';
  constructor(@Inject(MAT_DIALOG_DATA) public data: { sprints: Sprint[] }) { }
}
