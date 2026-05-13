import { Component, Inject, OnInit, inject } from '@angular/core';

import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TaskService } from '../../../core/services/task.service';
import { SprintService } from '../../../core/services/sprint.service';
import { ProjectService } from '../../../core/services/project.service';
import { Task, TaskStatus, TaskPriority, Sprint, ProjectMember } from '../../../core/models';

@Component({
  selector: 'app-task-form-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSnackBarModule
  ],
  template: `
    <h2 mat-dialog-title>{{ data.task ? 'Edit' : 'Create' }} task</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Title</mat-label>
          <input matInput formControlName="title" placeholder="Task title">
          @if (form.get('title')?.hasError('required')) {
            <mat-error>Required</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Description</mat-label>
          <textarea matInput formControlName="description" rows="3" placeholder="Detailed description"></textarea>
        </mat-form-field>

        <div class="row">
          <mat-form-field appearance="outline" class="half-width">
            <mat-label>Status</mat-label>
            <mat-select formControlName="status">
              <mat-option [value]="0">To do</mat-option>
              <mat-option [value]="1">In progress</mat-option>
              <mat-option [value]="2">Done</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="half-width">
            <mat-label>Priority</mat-label>
            <mat-select formControlName="priority">
              <mat-option [value]="0">Low</mat-option>
              <mat-option [value]="1">Medium</mat-option>
              <mat-option [value]="2">High</mat-option>
              <mat-option [value]="3">Critical</mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <div class="row">
          <mat-form-field appearance="outline" class="half-width">
            <mat-label>Due date</mat-label>
            <input matInput [matDatepicker]="dp" formControlName="dueDate">
            <mat-datepicker-toggle matSuffix [for]="dp"></mat-datepicker-toggle>
            <mat-datepicker #dp></mat-datepicker>
          </mat-form-field>

          <mat-form-field appearance="outline" class="half-width">
            <mat-label>Progress (%)</mat-label>
            <input matInput type="number" formControlName="progressPercentage" min="0" max="100">
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Assigned to</mat-label>
          <mat-select formControlName="assignedToId">
            <mat-option value="">Unassigned</mat-option>
            @for (u of users; track u.userId) {
              <mat-option [value]="u.userId">{{ u.fullName }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Sprint (optional)</mat-label>
          <mat-select formControlName="sprintId">
            <mat-option value="">No sprint</mat-option>
            @for (s of sprints; track s.id) {
              <mat-option [value]="s.id">{{ s.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="undefined">Cancel</button>
      <button mat-raised-button color="primary" (click)="save()" [disabled]="form.invalid || saving">
        {{ saving ? 'Saving...' : 'Save' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .form {
      display: flex;
      flex-direction: column;
      gap: 12px;
      min-width: 450px;
      padding-top: 8px;
    }
    .full-width { width: 100%; }
    .half-width { width: calc(50% - 8px); }
    .row { display: flex; gap: 16px; }
    @media (max-width: 600px) {
      .row { flex-direction: column; }
      .half-width { width: 100%; }
      .form { min-width: auto; }
    }
  `]
})
export class TaskFormDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private taskService = inject(TaskService);
  private sprintService = inject(SprintService);
  private projectService = inject(ProjectService);
  private snackBar = inject(MatSnackBar);
  private dialogRef = inject(MatDialogRef<TaskFormDialogComponent>);

  sprints: Sprint[] = [];
  users: ProjectMember[] = [];
  saving = false;

  form = this.fb.group({
    title: ['', Validators.required],
    description: [''],
    status: [TaskStatus.Todo],
    priority: [TaskPriority.Medium],
    progressPercentage: [0],
    dueDate: [null as Date | null],
    assignedToId: [''],
    sprintId: ['']
  });

  constructor(@Inject(MAT_DIALOG_DATA) public data: { task: Task | null; projectId: string; sprintId?: string | null }) { }

  ngOnInit(): void {
    // Load project sprints
    this.sprintService.getSprintsByProject(this.data.projectId).subscribe({
      next: (response) => {
        if (response.success) {
          this.sprints = response.data;
        }
      }
    });

    // Load project members for assignment
    this.projectService.getProject(this.data.projectId).subscribe({
      next: (response) => {
        if (response.success) {
          this.users = response.data.members ?? [];
        }
      }
    });

    // If in edit mode, pre-fill the form
    if (this.data.task) {
      const task = this.data.task;
      this.form.patchValue({
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        progressPercentage: task.progressPercentage,
        dueDate: task.dueDate ? new Date(task.dueDate) : null,
        assignedToId: task.assignedToId || '',
        sprintId: task.sprintId || ''
      });
    } else if (this.data.sprintId) {
      // If creating a task within a specific sprint
      this.form.patchValue({
        sprintId: this.data.sprintId
      });
    }
  }

  save(): void {
    if (this.form.invalid) return;

    this.saving = true;
    const value = this.form.value;

    const payload = {
      title: value.title!,
      description: value.description || '',
      status: value.status as TaskStatus,
      priority: value.priority as TaskPriority,
      progressPercentage: value.progressPercentage ?? 0,
      dueDate: value.dueDate ? (value.dueDate as Date).toISOString() : '',
      projectId: this.data.projectId,
      assignedToId: value.assignedToId || '',
      sprintId: value.sprintId || null
    };

    const request = this.data.task
      ? this.taskService.updateTask(this.data.task.id, payload)
      : this.taskService.createTask(payload);

    request.subscribe({
      next: (response) => {
        this.saving = false;
        if (response.success) {
          this.snackBar.open(
            `Task ${this.data.task ? 'updated' : 'created'} successfully!`,
            'Close',
            { duration: 3000 }
          );
          this.dialogRef.close(true);
        } else {
          this.snackBar.open(response.message || 'Error', 'Close', { duration: 4000 });
        }
      },
      error: (err) => {
        this.saving = false;
        this.snackBar.open(err?.error?.message || 'Error while saving', 'Close', { duration: 4000 });
      }
    });
  }
}
