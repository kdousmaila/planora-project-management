import { Component, Input, OnInit, inject, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CheckInService } from '../../../core/services/checkin.service';

@Component({
  selector: 'app-daily-checkin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (showPopup) {
      <div class="checkin-overlay">
        <div class="checkin-modal">
          <div class="modal-header">
            <span class="modal-emoji">☀️</span>
            <h2>Good morning! How are you feeling today?</h2>
            <p>2 minutes to help your PM better organize your day</p>
          </div>

          <div class="question-block">
            <label>Energy level</label>
            <div class="emoji-scale">
              @for (e of energyEmojis; track e.value) {
                <button
                  class="emoji-btn"
                  [class.selected]="energyLevel === e.value"
                  (click)="energyLevel = e.value">
                  <span class="emoji">{{ e.emoji }}</span>
                  <span class="label">{{ e.label }}</span>
                </button>
              }
            </div>
          </div>

          <div class="question-block">
            <label>How many hours can you be productive today?</label>
            <div class="hours-row">
              @for (h of [1,2,3,4,5,6,7,8]; track h) {
                <button
                  class="hour-btn"
                  [class.selected]="availableHours === h"
                  (click)="availableHours = h">
                  {{ h }}h
                </button>
              }
            </div>
          </div>

          <div class="question-block">
            <label>Do you have a blocker?</label>
            <div class="blocker-row">
              <button class="blocker-btn"
                [class.selected-no]="hasBlocker === false"
                (click)="hasBlocker = false">
                ✅ No, all good
              </button>
              <button class="blocker-btn"
                [class.selected-yes]="hasBlocker === true"
                (click)="hasBlocker = true">
                🚧 Yes, I have a blocker
              </button>
            </div>
            @if (hasBlocker) {
              <textarea
                [(ngModel)]="blockerNote"
                placeholder="Briefly describe the blocker..."
                class="blocker-note"
                rows="2">
              </textarea>
            }
          </div>

          <button class="submit-btn" (click)="submit()" [disabled]="!canSubmit || loading">
            @if (loading) { ⏳ Sending... }
            @else { 🚀 Submit my check-in }
          </button>
        </div>
      </div>
    }
  `,
  styles: [`
    .checkin-overlay {
      position: fixed; inset: 0;
      background: rgba(15,23,42,.55);
      display: flex; align-items: center; justify-content: center;
      z-index: 9999;
      backdrop-filter: blur(6px);
      animation: fadeIn .25s ease;
    }
    @keyframes fadeIn { from{opacity:0} to{opacity:1} }

    .checkin-modal {
      background: #fff;
      border-radius: 28px;
      padding: 40px;
      max-width: 520px;
      width: 90%;
      box-shadow: 0 32px 80px rgba(79,70,229,.18), 0 8px 24px rgba(0,0,0,.08);
      animation: slideUp .32s cubic-bezier(.34,1.56,.64,1);
      border: 1px solid #ede9fe;
      position: relative;
      overflow: hidden;
    }
    .checkin-modal::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 4px;
      background: linear-gradient(90deg, #4f46e5, #818cf8, #06b6d4);
    }
    @keyframes slideUp {
      from { transform: translateY(40px); opacity: 0; }
      to   { transform: none; opacity: 1; }
    }

    .modal-header { text-align: center; margin-bottom: 30px; }
    .modal-emoji  { font-size: 44px; display: block; margin-bottom: 12px; }
    .modal-header h2 {
      font-size: 20px; font-weight: 800; color: #0f172a;
      margin: 0 0 6px; letter-spacing: -.3px;
    }
    .modal-header p { font-size: 13px; color: #94a3b8; margin: 0; }

    .question-block { margin-bottom: 24px; }
    .question-block label {
      display: block; font-size: 12px; font-weight: 700;
      color: #64748b; margin-bottom: 10px;
      text-transform: uppercase; letter-spacing: .5px;
    }

    .emoji-scale { display: flex; gap: 8px; }
    .emoji-btn {
      flex: 1; padding: 12px 4px;
      border: 2px solid #e2e8f0;
      border-radius: 16px; background: #fff;
      cursor: pointer; text-align: center;
      transition: all .18s;
    }
    .emoji-btn:hover  { border-color: #c7d2fe; background: #f5f3ff; transform: translateY(-2px); }
    .emoji-btn.selected {
      border-color: #4f46e5; background: #ede9fe;
      box-shadow: 0 4px 12px rgba(79,70,229,.2);
      transform: translateY(-2px);
    }
    .emoji-btn .emoji { font-size: 24px; display: block; }
    .emoji-btn .label {
      font-size: 10px; color: #64748b;
      display: block; margin-top: 5px; font-weight: 600;
    }

    .hours-row { display: flex; gap: 8px; flex-wrap: wrap; }
    .hour-btn {
      width: 48px; height: 40px;
      border: 2px solid #e2e8f0;
      border-radius: 12px; background: #fff;
      cursor: pointer; font-size: 13px;
      font-weight: 700; color: #334155; transition: all .15s;
    }
    .hour-btn:hover { border-color: #c7d2fe; background: #f5f3ff; }
    .hour-btn.selected {
      border-color: #4f46e5; background: #ede9fe;
      color: #4f46e5;
      box-shadow: 0 2px 8px rgba(79,70,229,.2);
    }

    .blocker-row { display: flex; gap: 10px; }
    .blocker-btn {
      flex: 1; padding: 11px;
      border: 2px solid #e2e8f0;
      border-radius: 14px; background: #fff;
      cursor: pointer; font-size: 12px;
      font-weight: 600; color: #334155; transition: all .15s;
    }
    .blocker-btn:hover { border-color: #c7d2fe; background: #fafbff; }
    .blocker-btn.selected-no  {
      border-color: #10b981; background: #d1fae5; color: #059669;
      box-shadow: 0 2px 8px rgba(16,185,129,.15);
    }
    .blocker-btn.selected-yes {
      border-color: #f97316; background: #fff7ed; color: #ea580c;
      box-shadow: 0 2px 8px rgba(249,115,22,.15);
    }

    .blocker-note {
      width: 100%; margin-top: 10px; padding: 10px 14px;
      border: 1.5px solid #e2e8f0; border-radius: 12px;
      font-size: 13px; resize: none; outline: none;
      font-family: inherit; color: #334155;
      transition: border-color .15s;
      box-sizing: border-box;
    }
    .blocker-note:focus { border-color: #4f46e5; }

    .submit-btn {
      width: 100%; padding: 15px;
      background: linear-gradient(135deg, #4f46e5, #818cf8);
      color: #fff; border: none; border-radius: 16px;
      font-size: 15px; font-weight: 700; cursor: pointer;
      transition: all .2s;
      box-shadow: 0 6px 20px rgba(79,70,229,.3);
      letter-spacing: .2px;
    }
    .submit-btn:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 8px 28px rgba(79,70,229,.4);
    }
    .submit-btn:active:not(:disabled) { transform: none; }
    .submit-btn:disabled { opacity: .5; cursor: not-allowed; box-shadow: none; }
  `]
})
export class DailyCheckInComponent implements OnInit {
  @Input() projectId!: string;
  @Output() checkInDone = new EventEmitter<void>();

  private checkInService = inject(CheckInService);

  showPopup = false;
  energyLevel = 0;
  availableHours = 0;
  hasBlocker: boolean | null = null;
  blockerNote = '';
  loading = false;

  energyEmojis = [
    { value: 1, emoji: '😴', label: 'Exhausted' },
    { value: 2, emoji: '😔', label: 'Tired' },
    { value: 3, emoji: '😐', label: 'Neutral' },
    { value: 4, emoji: '😊', label: 'Good' },
    { value: 5, emoji: '🚀', label: 'Great!' }
  ];

  get canSubmit(): boolean {
    return this.energyLevel > 0 &&
      this.availableHours > 0 &&
      this.hasBlocker !== null;
  }

  // ✅ ngOnInit — checks if check-in was already done today
  ngOnInit(): void {
    this.checkInService.getTodayCheckIn(this.projectId).subscribe({
      next: (res: any) => {
        if (!res.data?.hasCheckedIn) {
          setTimeout(() => this.showPopup = true, 2000);
        }
      },
      error: () => { }
    });
  }

  // ✅ submit() — called only by the button
  submit(): void {
    if (!this.canSubmit) return;
    this.loading = true;
    this.checkInService.submitCheckIn(this.projectId, {
      projectId: this.projectId,
      energyLevel: this.energyLevel,
      availableHours: this.availableHours,
      hasBlocker: this.hasBlocker!,
      blockerNote: this.blockerNote || undefined
    }).subscribe({
      next: () => {
        this.showPopup = false;
        this.loading = false;
        this.checkInDone.emit();
      },
      error: () => { this.loading = false; }
    });
  }
}
