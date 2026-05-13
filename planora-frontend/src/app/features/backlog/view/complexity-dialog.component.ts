// src/app/features/backlog/view/complexity-dialog.component.ts
import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { ReactiveFormsModule, FormControl } from '@angular/forms';

@Component({
  selector: 'app-complexity-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, ReactiveFormsModule],
  template: `
   <h2 mat-dialog-title>Complexity</h2>
<mat-dialog-content>
  <p class="hint">What is the complexity of this task?</p>
  <div class="complexity-grid">
    <button class="complexity-btn xs" [class.selected]="complexityControl.value === 0" (click)="complexityControl.setValue(0)">
      <span class="label">XS</span>
      <span class="desc">Very easy</span>
    </button>
    <button class="complexity-btn s" [class.selected]="complexityControl.value === 1" (click)="complexityControl.setValue(1)">
      <span class="label">S</span>
      <span class="desc">Easy</span>
    </button>
    <button class="complexity-btn m" [class.selected]="complexityControl.value === 2" (click)="complexityControl.setValue(2)">
      <span class="label">M</span>
      <span class="desc">Medium</span>
    </button>
    <button class="complexity-btn l" [class.selected]="complexityControl.value === 3" (click)="complexityControl.setValue(3)">
      <span class="label">L</span>
      <span class="desc">Hard</span>
    </button>
    <button class="complexity-btn xl" [class.selected]="complexityControl.value === 4" (click)="complexityControl.setValue(4)">
      <span class="label">XL</span>
      <span class="desc">Very hard</span>
    </button>
  </div>
  <div class="selected-label" *ngIf="complexityControl.value !== null">
    Current complexity: <strong>{{ getLabel(complexityControl.value) }}</strong>
  </div>
</mat-dialog-content>
<mat-dialog-actions align="end">
  <button mat-button [mat-dialog-close]="undefined">Cancel</button>
  <button mat-button class="save-btn" (click)="save()" [disabled]="complexityControl.value === null">Save</button>
</mat-dialog-actions>
  `,
  styles: [`
    h2 { font-size: 16px; font-weight: 600; margin: 0; padding: 20px 20px 0; }
    .hint { font-size: 13px; color: #64748b; margin: 0 0 20px; }
    .complexity-grid { display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; }
    .complexity-btn { display: flex; align-items: center; gap: 16px; padding: 12px 16px; border-radius: 10px; border: 1.5px solid #e2e8f0; background: #f8fafc; cursor: pointer; transition: all 0.12s; font-family: inherit; width: 100%; }
    .complexity-btn:hover { border-color: #4f46e5; background: #eef2ff; }
    .complexity-btn.selected { border-color: #4f46e5; background: #eef2ff; }
    .complexity-btn .label { font-size: 16px; font-weight: 700; min-width: 40px; }
    .complexity-btn .desc { font-size: 13px; color: #475569; }
    .complexity-btn.xs.selected .label { color: #166534; }
    .complexity-btn.s.selected .label { color: #065f46; }
    .complexity-btn.m.selected .label { color: #92400e; }
    .complexity-btn.l.selected .label { color: #991b1b; }
    .complexity-btn.xl.selected .label { color: #7f1d1d; }
    .selected-label { padding: 10px 14px; background: #f1f5f9; border-radius: 8px; font-size: 13px; color: #475569; }
    .save-btn { background: #4f46e5; color: #fff; border-radius: 7px; padding: 6px 18px; font-weight: 600; }
    .save-btn:hover { background: #4338ca; }
    .save-btn:disabled { background: #e2e8f0; color: #94a3b8; }
  `]
})
export class ComplexityDialogComponent {
  complexityControl = new FormControl<number>(2);

  constructor(
    private dialogRef: MatDialogRef<ComplexityDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { currentComplexity: number }
  ) {
    this.complexityControl.setValue(data.currentComplexity);
  }

  getLabel(value: number): string {
    const labels = ['Very easy', 'Easy', 'Medium', 'Hard', 'Very hard'];
    return labels[value] ?? 'Moyenne';
  }

  save(): void {
    this.dialogRef.close(this.complexityControl.value);
  }
}
