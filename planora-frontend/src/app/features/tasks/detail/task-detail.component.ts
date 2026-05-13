// src/app/features/tasks/detail/task-detail.component.ts
import { Component, OnInit, inject, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule, FormControl, Validators, FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatSelectModule } from '@angular/material/select';
import { TaskService } from '../../../core/services/task.service';
import { AuthService } from '../../../core/services/auth.service';
import { BacklogService } from '../../../core/services/backlog.service';
import { Task, TaskComment, TaskStatus, TaskPriority, BacklogItem } from '../../../core/models';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';

@Component({
  selector: 'app-task-detail',
  imports: [
    CommonModule, RouterLink, ReactiveFormsModule, FormsModule,
    MatCardModule, MatButtonModule, MatIconModule, MatChipsModule,
    MatFormFieldModule, MatInputModule, MatSnackBarModule, MatDividerModule,
    MatSelectModule, LoadingComponent
  ],
  template: `
    @if (!isDialogMode) {
      <!-- NORMAL PAGE MODE -->
      <div class="page-container">
        @if (loading) {
          <app-loading></app-loading>
        }
        @if (!loading && task) {
          <div>
            <div class="page-header">
              <h1>{{ task.title }}</h1>
              <button mat-button [routerLink]="['/projects', task.projectId, 'tasks']">
                <mat-icon>arrow_back</mat-icon> Back to tasks
              </button>
            </div>
            <div class="detail-grid">
              <mat-card>
                <mat-card-header><mat-card-title>Task details</mat-card-title></mat-card-header>
                <mat-card-content>
                  <p>{{ task.description || 'No description' }}</p>
                  <div class="info-row">
                    <span class="label">Status:</span>
                    <mat-select [value]="task.status" (selectionChange)="updateStatus($event.value)" style="width: auto;">
                      <mat-option [value]="0">To do</mat-option>
                      <mat-option [value]="1">In progress</mat-option>
                      <mat-option [value]="2">Done</mat-option>
                    </mat-select>
                  </div>
                  <div class="info-row">
                    <span class="label">Priority:</span>
                    <mat-select [value]="task.priority" (selectionChange)="updatePriority($event.value)" style="width: auto;">
                      <mat-option [value]="0">Low</mat-option>
                      <mat-option [value]="1">Medium</mat-option>
                      <mat-option [value]="2">High</mat-option>
                      <mat-option [value]="3">Critical</mat-option>
                    </mat-select>
                  </div>
                  <div class="info-row"><span class="label">Assigned to:</span><span>{{ task.assignedToName || 'Unassigned' }}</span></div>
                  <div class="info-row"><span class="label">Sprint:</span><span>{{ task.sprintName || 'No sprint' }}</span></div>
                  <div class="info-row"><span class="label">Due date:</span><span>{{ task.dueDate ? (task.dueDate | date:'mediumDate') : '—' }}</span></div>
                  <div class="info-row"><span class="label">Progress:</span><span>{{ task.progressPercentage }}%</span></div>
                </mat-card-content>
              </mat-card>
              <mat-card>
                <mat-card-header><mat-card-title>Comments</mat-card-title></mat-card-header>
                <mat-card-content>
                  @if (commentsLoading) {
                    <app-loading></app-loading>
                  }
                  @for (c of comments; track c.id) {
                    <div class="comment">
                      <div class="comment-header">
                        <strong>{{ c.authorName }}</strong>
                        <span class="comment-date">{{ c.createdAt | date:'short' }}</span>
                        @if (canDelete(c)) {
                          <button mat-icon-button color="warn" (click)="deleteComment(c)" style="margin-left:auto">
                            <mat-icon style="font-size:16px">close</mat-icon>
                          </button>
                        }
                      </div>
                      <p>{{ c.content }}</p>
                      <mat-divider></mat-divider>
                    </div>
                  }
                  @if (!commentsLoading && !comments.length) {
                    <p class="no-data">No comments</p>
                  }
                  <div class="add-comment">
                    <mat-form-field appearance="outline" class="full-width">
                      <mat-label>Add a comment</mat-label>
                      <textarea matInput [formControl]="commentCtrl" rows="2"></textarea>
                    </mat-form-field>
                    <button mat-raised-button color="primary" (click)="addComment()" [disabled]="commentCtrl.invalid || addingComment">
                      {{ addingComment ? 'Sending...' : 'Send' }}
                    </button>
                  </div>
                </mat-card-content>
              </mat-card>
            </div>
          </div>
        }
      </div>
    }

    @if (isDialogMode) {
      <!-- DIALOG MODE (SIDE PANEL) -->
      <div class="dialog-container">
        @if (loading) {
          <app-loading></app-loading>
        }
        @if (!loading && task) {
          <div>
            <div class="dialog-task-header">
              <h2>{{ task.title }}</h2>
              <div class="task-id">#{{ task.id.slice(-6) }}</div>
            </div>

            <!-- Description -->
            <div class="dialog-section">
              <div class="section-title">
                <mat-icon>description</mat-icon>
                <span>Description</span>
              </div>
              <div class="description" (click)="startEditDescription()">
                @if (!isEditingDescription) {
                  <p>{{ task.description || 'Click to add a description...' }}</p>
                }
                @if (isEditingDescription) {
                  <textarea [(ngModel)]="editDescriptionText" rows="4" (click)="$event.stopPropagation()"></textarea>
                  <div class="edit-actions">
                    <button mat-button (click)="cancelEditDescription(); $event.stopPropagation()">Cancel</button>
                    <button mat-raised-button color="primary" (click)="saveDescription(); $event.stopPropagation()">Save</button>
                  </div>
                }
              </div>
            </div>

            <!-- Details -->
            <div class="dialog-section">
              <div class="section-title">
                <mat-icon>info</mat-icon>
                <span>Details</span>
              </div>
              <div class="details-grid">
                <div class="detail-row">
                  <span class="label">Status</span>
                  <mat-select [value]="task.status" (selectionChange)="updateStatus($event.value)">
                    <mat-option [value]="0">To do</mat-option>
                    <mat-option [value]="1">In progress</mat-option>
                    <mat-option [value]="2">Done</mat-option>
                  </mat-select>
                </div>
                <div class="detail-row">
                  <span class="label">Priority</span>
                  <mat-select [value]="task.priority" (selectionChange)="updatePriority($event.value)">
                    <mat-option [value]="0">Low</mat-option>
                    <mat-option [value]="1">Medium</mat-option>
                    <mat-option [value]="2">High</mat-option>
                    <mat-option [value]="3">Critical</mat-option>
                  </mat-select>
                </div>
                <div class="detail-row">
                  <span class="label">Assigned to</span>
                  <span>{{ task.assignedToName || 'Unassigned' }}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Sprint</span>
                  <span>{{ task.sprintName || 'No sprint' }}</span>
                </div>
              </div>
            </div>

            <!-- Comments -->
            <div class="dialog-section">
              <div class="section-title">
                <mat-icon>comment</mat-icon>
                <span>Comments ({{ comments.length }})</span>
              </div>
              <div class="comments-list">
                @for (c of comments; track c.id) {
                  <div class="comment">
                    <div class="comment-header">
                      <strong>{{ c.authorName }}</strong>
                      <span class="comment-date">{{ c.createdAt | date:'dd/MM/yyyy HH:mm' }}</span>
                      @if (canDelete(c)) {
                        <button mat-icon-button (click)="deleteComment(c)">
                          <mat-icon>delete</mat-icon>
                        </button>
                      }
                    </div>
                    <p>{{ c.content }}</p>
                  </div>
                }
                @if (comments.length === 0) {
                  <p class="no-comments">No comments</p>
                }
              </div>
              <div class="add-comment">
                <textarea [(ngModel)]="newComment" placeholder="Add a comment..." rows="2"></textarea>
                <button mat-raised-button color="primary" (click)="addCommentDialog()" [disabled]="!newComment.trim()">
                  Send
                </button>
              </div>
            </div>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    /* Normal page mode */
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    h1 { margin: 0; }
    .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .info-row { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
    .label { font-weight: 500; min-width: 90px; }
    .comment { margin-bottom: 12px; }
    .comment-header { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
    .comment-date { color: #999; font-size: 0.8rem; }
    .no-data { color: #999; font-style: italic; }
    .add-comment { margin-top: 16px; display: flex; flex-direction: column; gap: 8px; }
    .full-width { width: 100%; }

    /* Dialog mode */
    .dialog-container { padding: 0; }
    .dialog-task-header { margin-bottom: 20px; padding-bottom: 12px; border-bottom: 1px solid #e5e7eb; }
    .dialog-task-header h2 { margin: 0 0 8px 0; font-size: 18px; font-weight: 600; }
    .task-id { font-size: 12px; color: #6b7280; font-family: monospace; }
    .dialog-section { margin-bottom: 24px; }
    .section-title { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #e5e7eb; }
    .section-title mat-icon { font-size: 18px; width: 18px; height: 18px; color: #6b7280; }
    .section-title span { font-weight: 600; font-size: 14px; }
    .description { padding: 12px; background: #f9fafb; border-radius: 8px; cursor: pointer; }
    .description p { margin: 0; color: #4b5563; }
    .description textarea { width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 6px; resize: vertical; font-family: inherit; box-sizing: border-box; }
    .edit-actions { display: flex; gap: 8px; margin-top: 8px; }
    .details-grid { display: flex; flex-direction: column; gap: 12px; }
    .detail-row { display: flex; align-items: center; gap: 16px; }
    .detail-row .label { width: 80px; font-size: 13px; font-weight: 500; color: #6b7280; }
    .detail-row mat-select { width: 150px; }
    .comments-list { max-height: 250px; overflow-y: auto; margin-bottom: 16px; }
    .comment { padding: 12px; background: #f9fafb; border-radius: 8px; margin-bottom: 12px; }
    .comment-header { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
    .comment-date { font-size: 11px; color: #9ca3af; }
    .no-comments { color: #9ca3af; text-align: center; padding: 20px; }
    .add-comment textarea { width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 8px; resize: vertical; margin-bottom: 8px; font-family: inherit; box-sizing: border-box; }
    .add-comment textarea:focus { outline: none; border-color: #4f46e5; }
  `]
})
export class TaskDetailComponent implements OnInit {
  @Input() taskId?: string;
  @Output() closed = new EventEmitter<void>();

  private route = inject(ActivatedRoute);
  private taskService = inject(TaskService);
  private backlogService = inject(BacklogService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);

  loading = true;
  commentsLoading = true;
  addingComment = false;
  task: BacklogItem | null = null;
  comments: TaskComment[] = [];
  commentCtrl = new FormControl('', Validators.required);
  newComment = '';
  isEditingDescription = false;
  editDescriptionText = '';

  get isDialogMode(): boolean {
    return !!this.taskId;
  }

  ngOnInit(): void {
    const id = this.taskId || this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadTask(id);
    }
  }

  loadTask(id: string): void {
    this.loading = true;
    this.backlogService.getBacklogItem(id).subscribe({
      next: r => {
        this.loading = false;
        if (r.success) {
          this.task = r.data;
          this.loadComments(id);
        }
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Loading error', 'Close', { duration: 3000 });
      }
    });
  }

  loadComments(taskId: string): void {
    this.commentsLoading = true;
    this.taskService.getComments(taskId).subscribe({
      next: r => {
        this.commentsLoading = false;
        if (r.success) this.comments = r.data;
      },
      error: () => { this.commentsLoading = false; }
    });
  }

  startEditDescription(): void {
    this.editDescriptionText = this.task?.description || '';
    this.isEditingDescription = true;
  }

  cancelEditDescription(): void {
    this.isEditingDescription = false;
  }

  // FIX: missing subscribe in previous version
  saveDescription(): void {
    if (!this.task) return;
    this.backlogService.updateBacklogItem(this.task.id, {
      title: this.task.title,
      priority: this.task.priority,
      description: this.editDescriptionText
      // AssignedToId intentionally omitted → backend does not touch the FK
    }).subscribe({
      next: (response) => {
        if (response.success && this.task) {
          this.task.description = this.editDescriptionText;
          this.isEditingDescription = false;
          this.snackBar.open('Description updated', 'Close', { duration: 2000 });
        }
      },
      error: () => this.snackBar.open('Error', 'Close', { duration: 3000 })
    });
  }

  updateStatus(status: number): void {
    if (this.task) {
      this.backlogService.updateBacklogItemStatus(this.task.id, status).subscribe({
        next: (response) => {
          if (response.success && this.task) {
            this.task.status = status;
            this.snackBar.open('Status updated', 'Close', { duration: 2000 });
          }
        },
        error: () => this.snackBar.open('Error', 'Close', { duration: 3000 })
      });
    }
  }

  updatePriority(priority: number): void {
    if (this.task) {
      this.backlogService.updatePriority(this.task.id, priority).subscribe({
        next: (response) => {
          if (response.success && this.task) {
            this.task.priority = priority;
            this.snackBar.open('Priority updated', 'Close', { duration: 2000 });
          }
        },
        error: () => this.snackBar.open('Error', 'Close', { duration: 3000 })
      });
    }
  }

  addComment(): void {
    if (!this.task || this.commentCtrl.invalid) return;
    this.addingComment = true;
    this.taskService.addComment(this.task.id, this.commentCtrl.value!).subscribe({
      next: r => {
        this.addingComment = false;
        if (r.success) {
          this.commentCtrl.reset();
          this.loadComments(this.task!.id);
        }
      },
      error: () => {
        this.addingComment = false;
        this.snackBar.open('Error', 'Close', { duration: 3000 });
      }
    });
  }

  addCommentDialog(): void {
    if (!this.task || !this.newComment.trim()) return;
    this.addingComment = true;
    this.taskService.addComment(this.task.id, this.newComment).subscribe({
      next: r => {
        this.addingComment = false;
        if (r.success) {
          this.newComment = '';
          this.loadComments(this.task!.id);
          this.snackBar.open('Comment added', 'Close', { duration: 2000 });
        }
      },
      error: () => {
        this.addingComment = false;
        this.snackBar.open('Error', 'Close', { duration: 3000 });
      }
    });
  }

  deleteComment(comment: TaskComment): void {
    if (!this.task) return;
    this.taskService.deleteComment(this.task.id, comment.id).subscribe({
      next: r => {
        if (r.success) {
          this.loadComments(this.task!.id);
          this.snackBar.open('Comment deleted', 'Close', { duration: 2000 });
        }
      },
      error: () => this.snackBar.open('Error', 'Close', { duration: 3000 })
    });
  }

  canDelete(comment: TaskComment): boolean {
    const user = this.authService.currentUser;
    return !!(user && (user.userId === comment.authorId || this.authService.hasRole(['Admin'])));
  }

  close(): void {
    this.closed.emit();
  }
}
