// src/app/features/backlog/view/story-points-dialog.component.ts
import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { ReactiveFormsModule, FormControl } from '@angular/forms';

// NE PAS importer StoryPointsDialogComponent ici !

const STORY_POINTS = [1, 2, 3, 5, 8, 13, 21];

@Component({
  selector: 'app-story-points-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, ReactiveFormsModule],
  template: `
   <h2 mat-dialog-title>Estimation — Story Points</h2>
<mat-dialog-content>
  <p class="hint">How many points does this effort represent?</p>
  <div class="points-grid">
    <button *ngFor="let pt of points" class="pt-btn" [class.selected]="pointControl.value === pt" (click)="pointControl.setValue(pt)">
      {{ pt }}
    </button>
    <button class="pt-btn question" [class.selected]="pointControl.value === -1" (click)="pointControl.setValue(-1)" matTooltip="Not estimated">
      ?
    </button>
  </div>
  <div class="selected-label" *ngIf="pointControl.value !== null">
    <ng-container *ngIf="pointControl.value === -1">Not estimated</ng-container>
    <ng-container *ngIf="pointControl.value !== -1">
      <span class="pt-display">{{ pointControl.value }}</span> point{{ pointControl.value > 1 ? 's' : '' }} — {{ getEffortLabel(pointControl.value) }}
    </ng-container>
  </div>
</mat-dialog-content>
<mat-dialog-actions align="end">
  <button mat-button [mat-dialog-close]="undefined">Cancel</button>
  <button mat-button class="save-btn" (click)="save()" [disabled]="pointControl.value === null">Save</button>
</mat-dialog-actions>
  `,
  styles: [`
    h2 { font-size: 16px; font-weight: 600; margin: 0; padding: 20px 20px 0; }
    .hint { font-size: 13px; color: #64748b; margin: 0 0 20px; }
    .points-grid { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 20px; }
    .pt-btn { width: 52px; height: 52px; border-radius: 10px; border: 1.5px solid #e2e8f0; background: #f8fafc; font-size: 17px; font-weight: 700; color: #334155; cursor: pointer; transition: all 0.12s; font-family: inherit; }
    .pt-btn:hover { border-color: #4f46e5; background: #eef2ff; color: #4f46e5; }
    .pt-btn.selected { background: #4f46e5; border-color: #4f46e5; color: #fff; box-shadow: 0 2px 8px rgba(79, 70, 229, 0.35); }
    .pt-btn.question { color: #94a3b8; font-size: 20px; }
    .pt-btn.question.selected { background: #64748b; border-color: #64748b; color: #fff; }
    .selected-label { display: flex; align-items: center; gap: 8px; padding: 10px 14px; background: #f1f5f9; border-radius: 8px; font-size: 13px; color: #475569; }
    .pt-display { font-size: 18px; font-weight: 700; color: #4f46e5; }
    .save-btn { background: #4f46e5; color: #fff; border-radius: 7px; padding: 6px 18px; font-weight: 600; }
    .save-btn:hover { background: #4338ca; }
    .save-btn:disabled { background: #e2e8f0; color: #94a3b8; }
  `]
})
export class StoryPointsDialogComponent {
  readonly points = STORY_POINTS;
  pointControl = new FormControl<number | null>(null);

  constructor(
    private dialogRef: MatDialogRef<StoryPointsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { currentComplexity: number }
  ) {
    this.pointControl.setValue(data.currentComplexity ?? null);
  }

  getEffortLabel(pt: number): string {
    if (pt <= 2) return 'Very quick';
    if (pt <= 3) return 'Quick';
    if (pt <= 5) return 'Moderate';
    if (pt <= 8) return 'Complex';
    if (pt <= 13) return 'Hard';
    return 'Very hard';
  }

  save(): void {
    this.dialogRef.close(this.pointControl.value);
  }
}
