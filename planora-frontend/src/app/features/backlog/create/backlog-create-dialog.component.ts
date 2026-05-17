import { Component, Inject, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { BacklogService } from '../../../core/services/backlog.service';
import { ProjectService } from '../../../core/services/project.service';
import { WorkspaceService } from '../../../core/services/workspace.service';
import { TaskPriority, WorkspaceMember } from '../../../core/models';

const STORY_POINT_OPTIONS = [1, 2, 3, 5, 8, 13, 21];

@Component({
  selector: 'app-backlog-create-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule,
    MatFormFieldModule, MatInputModule, MatButtonModule,
    MatSelectModule, MatSnackBarModule, MatIconModule
  ],
  templateUrl: './backlog-create-dialog.component.html',
  styleUrls: ['./backlog-create-dialog.component.scss']
})
export class BacklogCreateDialogComponent {
  private fb = inject(FormBuilder);
  private backlogService = inject(BacklogService);
  private projectService = inject(ProjectService);
  private workspaceService = inject(WorkspaceService);
  private snackBar = inject(MatSnackBar);
  private dialogRef = inject(MatDialogRef<BacklogCreateDialogComponent>);

  saving = false;
  users: WorkspaceMember[] = [];
  readonly storyPointOptions = STORY_POINT_OPTIONS;
  isEditMode = false;

  form = this.fb.group({
    title: ['', Validators.required],
    description: [''],
    priority: [TaskPriority.Medium],
    storyPoints: [3],
    assignedToId: ['']
  });

  constructor(@Inject(MAT_DIALOG_DATA) public data: { projectId: string; sprintId?: string | null; item?: any }) {
    this.isEditMode = !!data.item;
    if (this.isEditMode && data.item) {
      this.form.patchValue({
        title: data.item.title,
        description: data.item.description,
        priority: data.item.priority,
        storyPoints: data.item.storyPoints ?? data.item.complexity ?? 3,
        assignedToId: data.item.assignedToId || ''
      });
    }
    this.loadUsers();
  }

  loadUsers(): void {
    this.projectService.getProject(this.data.projectId).subscribe({
      next: (projectResponse) => {
        if (!projectResponse.success) {
          return;
        }

        this.workspaceService.getMembers(projectResponse.data.workspaceId).subscribe({
          next: (membersResponse) => {
            if (membersResponse.success) {
              this.users = membersResponse.data;
            }
          },
          error: () => {
            this.snackBar.open('Failed to load workspace members', 'Close', { duration: 3000 });
          }
        });
      },
      error: () => {
        this.snackBar.open('Failed to load project', 'Close', { duration: 3000 });
      }
    });
  }

  save(): void {
    if (this.form.invalid) return;
    this.saving = true;
    const value = this.form.value;

    if (this.isEditMode && this.data.item) {
      // Edit mode: update the existing item
      this.updateBacklogItem(value);
    } else {
      // Create mode: create a new item
      this.createBacklogItem(value);
    }
  }

  private createBacklogItem(value: any): void {
    const request: any = {
      title: value.title!,
      description: value.description || '',
      priority: value.priority as TaskPriority,
      projectId: this.data.projectId
    };

    // Add assignedToId only when provided
    if (value.assignedToId) {
      request.assignedToId = value.assignedToId;
    }

    if (value.storyPoints !== undefined && value.storyPoints !== null) {
      request.storyPoints = value.storyPoints;
      request.complexity = value.storyPoints;
    }

    if (this.data.sprintId) {
      request.sprintId = this.data.sprintId;
    }

    this.backlogService.createBacklogItem(request).subscribe({
      next: (response: any) => {
        if (!response.success) {
          this.saving = false;
          this.snackBar.open(response.message || 'Error', 'Close', { duration: 4000 });
          return;
        }

        const createdItemId = response.data?.id as string | undefined;
        const createdSprintId = response.data?.sprintId as string | null | undefined;
        const targetSprintId = this.data.sprintId ?? null;

        if (targetSprintId && createdItemId && createdSprintId !== targetSprintId) {
          this.backlogService.moveToSprint(createdItemId, targetSprintId).subscribe({
            next: () => {
              this.saving = false;
              this.snackBar.open('✅ Item added to sprint!', 'Close', { duration: 2000 });
              this.dialogRef.close(true);
            },
            error: () => {
              this.saving = false;
              this.snackBar.open('Created, but could not add it to the sprint', 'Close', { duration: 4000 });
              this.dialogRef.close(true);
            }
          });
          return;
        }

        this.saving = false;
        this.snackBar.open('✅ Item added!', 'Close', { duration: 2000 });
        this.dialogRef.close(true);
      },
      error: (err: any) => {
        this.saving = false;
        this.snackBar.open(err?.error?.message || 'Error', 'Close', { duration: 4000 });
      }
    });
  }

  private updateBacklogItem(value: any): void {
    const itemId = this.data.item.id;
    const request = {
      title: value.title || '',
      description: value.description || '',
      priority: value.priority as TaskPriority,
      assignedToId: value.assignedToId || null,
      complexity: value.storyPoints ?? null
    };

    this.backlogService.updateBacklogItem(itemId, request).subscribe({
      next: (response: any) => {
        this.saving = false;
        if (response?.success === false) {
          this.snackBar.open(response.message || 'Error updating the item', 'Close', { duration: 4000 });
          return;
        }
        this.snackBar.open('✅ Item updated!', 'Close', { duration: 2000 });
        this.dialogRef.close(true);
      },
      error: (err: any) => {
        this.saving = false;
        this.snackBar.open(err?.error?.message || 'Error updating the item', 'Close', { duration: 4000 });
      }
    });
  }
}
