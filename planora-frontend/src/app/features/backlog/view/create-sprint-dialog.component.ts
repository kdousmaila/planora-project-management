// src/app/features/backlog/view/create-sprint-dialog.component.ts
import { Component, Inject, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SprintService } from '../../../core/services/sprint.service';

@Component({
  selector: 'app-create-sprint-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  template: `
    <h2 mat-dialog-title>Create a new sprint</h2>
    <mat-dialog-content>
      <form [formGroup]="sprintForm" class="sprint-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Sprint name</mat-label>
          <input matInput formControlName="name" placeholder="Ex: Sprint 1" autofocus>
          <mat-error *ngIf="sprintForm.get('name')?.hasError('required')">Name is required</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Goal</mat-label>
          <textarea matInput formControlName="goal" rows="2" placeholder="Sprint goal..."></textarea>
        </mat-form-field>

        <div class="date-row">
          <mat-form-field appearance="outline" class="half-width">
            <mat-label>Start date</mat-label>
            <input matInput [matDatepicker]="startPicker" formControlName="startDate">
            <mat-datepicker-toggle matSuffix [for]="startPicker"></mat-datepicker-toggle>
            <mat-datepicker #startPicker></mat-datepicker>
          </mat-form-field>

          <mat-form-field appearance="outline" class="half-width">
            <mat-label>End date</mat-label>
            <input matInput [matDatepicker]="endPicker" formControlName="endDate">
            <mat-datepicker-toggle matSuffix [for]="endPicker"></mat-datepicker-toggle>
            <mat-datepicker #endPicker></mat-datepicker>
          </mat-form-field>
        </div>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="undefined">Cancel</button>
      <button mat-raised-button class="btn-blue" (click)="save()" [disabled]="sprintForm.invalid || saving">
        {{ saving ? 'Creating...' : 'Create' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
  .sprint-form { display: flex; flex-direction: column; gap: 16px; min-width: 450px; padding-top: 8px; }
  .full-width { width: 100%; }
  .date-row { display: flex; gap: 16px; }
  .half-width { width: calc(50% - 8px); }
  .btn-blue { background: linear-gradient(135deg, #4f46e5, #4338ca) !important; color: white !important; box-shadow: 0 2px 8px rgba(79,70,229,0.3); }
  .btn-blue:hover { background: linear-gradient(135deg, #4338ca, #3730a3) !important; }
  .btn-blue:disabled { background: #a5b4fc !important; color: white !important; box-shadow: none; }

  @media (max-width: 600px) {
    .date-row { flex-direction: column; }
    .half-width { width: 100%; }
    .sprint-form { min-width: auto; }
  }
`]
})
export class CreateSprintDialogComponent {
  private fb = inject(FormBuilder);
  private sprintService = inject(SprintService);
  private snackBar = inject(MatSnackBar);
  private dialogRef = inject(MatDialogRef<CreateSprintDialogComponent>);

  saving = false;

  sprintForm = this.fb.group({
    name: ['', Validators.required],
    goal: [''],
    startDate: [new Date(), Validators.required],
    endDate: [new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), Validators.required]
  });

  constructor(@Inject(MAT_DIALOG_DATA) public data: { projectId: string }) { }

  save(): void {
    if (this.sprintForm.invalid) return;

    this.saving = true;
    const value = this.sprintForm.value;

    const request = {
      name: value.name!,
      goal: value.goal || '',
      startDate: (value.startDate as Date).toISOString(),
      endDate: (value.endDate as Date).toISOString(),
      projectId: this.data.projectId
    };

    this.sprintService.createSprint(request).subscribe({
      next: (response: any) => {
        this.saving = false;
        if (response.success) {
          this.snackBar.open('Sprint created successfully!', 'Close', { duration: 3000 });
          this.dialogRef.close(true);
        } else {
          this.snackBar.open(response.message || 'Creation error', 'Close', { duration: 3000 });
        }
      },
      error: (err) => {
        this.saving = false;
        this.snackBar.open('Error while creating sprint', 'Close', { duration: 3000 });
        console.error(err);
      }
    });
  }
}
