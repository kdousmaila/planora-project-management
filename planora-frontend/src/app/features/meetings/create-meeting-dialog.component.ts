import { Component, Inject, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { Subject, takeUntil } from 'rxjs';
import { MeetingService } from '../../core/services/meeting.service';
import { ApiResponse, PinnedMessage, MeetingEvent, CreateMeetingRequest } from '../../core/models';

interface DialogData {
  projectId: string;
  pinnedMessages: PinnedMessage[];
  date?: Date;
  projectMembers: { userId: string; fullName: string }[];
}

@Component({
  selector: 'app-create-meeting-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule],
  template: `
    <div class="dlg-wrap" [class.loaded]="isLoaded">

      <div class="dlg-banner">
        <div class="banner-orb orb-1"></div>
        <div class="banner-orb orb-2"></div>
        <div class="banner-orb orb-3"></div>
        <div class="banner-content">
          <div class="dlg-header-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M8 2v3M16 2v3M3 8h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" stroke="white" stroke-width="1.8" stroke-linecap="round"/>
              <circle cx="12" cy="14" r="2" fill="white" opacity=".7"/>
            </svg>
          </div>
          <div class="banner-text">
            <h2 class="dlg-title">Planifier une réunion</h2>
            <p class="dlg-sub">Configurez votre session en quelques secondes</p>
          </div>
          <button class="dlg-close" (click)="cancel()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
      </div>

      <div class="steps-bar">
        <div class="step" [class.active]="currentStep >= 1" [class.done]="currentStep > 1">
          <div class="step-dot"><span>1</span></div>
          <span class="step-label">Informations</span>
        </div>
        <div class="step-line" [class.active]="currentStep > 1"></div>
        <div class="step" [class.active]="currentStep >= 2" [class.done]="currentStep > 2">
          <div class="step-dot"><span>2</span></div>
          <span class="step-label">Participants</span>
        </div>
        <div class="step-line" [class.active]="currentStep > 2"></div>
        <div class="step" [class.active]="currentStep >= 3">
          <div class="step-dot"><span>3</span></div>
          <span class="step-label">Messages</span>
        </div>
      </div>

      <div class="dlg-body">
        <form [formGroup]="form">

          <!-- STEP 1 -->
          <div class="step-panel" [class.visible]="currentStep === 1">
            <div class="field-group">
              <label class="field-label">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                Titre de la réunion
              </label>
              <div class="input-wrap">
                <input class="field-input" formControlName="title"
                       placeholder="Ex : Daily standup, Sprint review…"
                       (focus)="onFocus('title')" (blur)="onBlur('title')" />
                <div class="input-bar" [class.active]="focused['title']"></div>
              </div>
            </div>

            <div class="field-group">
              <label class="field-label">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M12 6v6l4 2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                Date &amp; heure
              </label>
              <div class="input-wrap">
                <input class="field-input" type="datetime-local"
                       formControlName="scheduledAt" [min]="minDateTime"
                       (focus)="onFocus('date')" (blur)="onBlur('date')" />
                <div class="input-bar" [class.active]="focused['date']"></div>
              </div>
              @if (form.get('scheduledAt')?.errors?.['pastDate']) {
              <div class="field-error">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#ef4444" stroke-width="2"/><path d="M12 8v4M12 16h.01" stroke="#ef4444" stroke-width="2" stroke-linecap="round"/></svg>
                Impossible de planifier dans le passé
              </div>
              }
            </div>

            <div class="field-group">
              <label class="field-label">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><polygon points="23 7 16 12 23 17 23 7" stroke="currentColor" stroke-width="2"/><rect x="1" y="5" width="15" height="14" rx="2" stroke="currentColor" stroke-width="2"/></svg>
                Mode de réunion
              </label>
              <div class="mode-grid">
                <div class="mode-card" [class.active]="form.get('withMeet')?.value === true"
                     (click)="form.get('withMeet')?.setValue(true)">
                  <div class="mode-icon meet">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><polygon points="23 7 16 12 23 17 23 7" stroke="currentColor" stroke-width="2"/><rect x="1" y="5" width="15" height="14" rx="2" stroke="currentColor" stroke-width="2"/></svg>
                  </div>
                  <div>
                    <div class="mode-name">Avec Meet</div>
                    <div class="mode-desc">Lien Jitsi généré auto</div>
                  </div>
                  <div class="mode-check">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
                  </div>
                </div>
                <div class="mode-card" [class.active]="form.get('withMeet')?.value === false"
                     (click)="form.get('withMeet')?.setValue(false)">
                  <div class="mode-icon task">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/><path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                  </div>
                  <div>
                    <div class="mode-name">Sans Meet</div>
                    <div class="mode-desc">Calendrier uniquement</div>
                  </div>
                  <div class="mode-check">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- STEP 2 -->
          <div class="step-panel" [class.visible]="currentStep === 2">
            <div class="field-group">
              <label class="field-label">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" stroke-width="2"/><circle cx="9" cy="7" r="4" stroke="currentColor" stroke-width="2"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                Qui peut voir cette réunion ?
              </label>
              <div class="visibility-cards">
                <div class="vis-card" [class.active]="form.get('visibleToAll')?.value"
                     (click)="form.get('visibleToAll')?.setValue(true)">
                  <div class="vis-icon">🌐</div>
                  <div>
                    <div class="vis-title">Tout le groupe</div>
                    <div class="vis-sub">Visible par tous les membres</div>
                  </div>
                  @if (form.get('visibleToAll')?.value) {
                  <div class="vis-check">✓</div>
                  }
                </div>
                <div class="vis-card" [class.active]="!form.get('visibleToAll')?.value"
                     (click)="form.get('visibleToAll')?.setValue(false)">
                  <div class="vis-icon">🎯</div>
                  <div>
                    <div class="vis-title">Sélection manuelle</div>
                    <div class="vis-sub">Choisir des membres précis</div>
                  </div>
                  @if (!form.get('visibleToAll')?.value) {
                  <div class="vis-check">✓</div>
                  }
                </div>
              </div>
            </div>

            @if (!form.get('visibleToAll')?.value) {
            <div class="field-group">
              <label class="field-label">
                Membres ({{ selectedMemberIds.size }} sélectionné{{ selectedMemberIds.size !== 1 ? 's' : '' }})
              </label>
              <div class="members-list">
                @if (data.projectMembers.length === 0) {
                  <p class="empty-hint">Aucun membre dans ce projet.</p>
                }
                @for (member of data.projectMembers; track member.userId) {
                <div class="member-row" [class.selected]="selectedMemberIds.has(member.userId)"
                     (click)="toggleMember(member.userId)">
                  <div class="member-av" [style.background]="getMemberColor(member.fullName)">
                    {{ member.fullName[0].toUpperCase() }}
                  </div>
                  <span class="member-name">{{ member.fullName }}</span>
                  <div class="member-check" [class.visible]="selectedMemberIds.has(member.userId)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="white" stroke-width="2.5" stroke-linecap="round"/></svg>
                  </div>
                </div>
                }
              </div>
            </div>
            }
          </div>

          <!-- STEP 3 -->
          <div class="step-panel" [class.visible]="currentStep === 3">
            <div class="field-group">
              <label class="field-label">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>
                Messages à traiter
                <span class="count-pill">{{ selectedIds.size }} / {{ data.pinnedMessages.length }}</span>
              </label>

              @if (data.pinnedMessages.length === 0) {
              <div class="empty-pins">
                <div class="empty-pins-icon">📌</div>
                <p>Aucun message épinglé</p>
                <span>Épinglez des messages depuis le chat pour les retrouver ici</span>
              </div>
              }

              <div class="pins-list">
                @for (msg of data.pinnedMessages; track msg.id) {
                <div class="pin-row" [class.selected]="isSelected(msg.id)"
                     (click)="toggleMessage(msg.id)">
                  <div class="pin-checkbox" [class.checked]="isSelected(msg.id)">
                    @if (isSelected(msg.id)) {
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="white" stroke-width="3" stroke-linecap="round"/></svg>
                    }
                  </div>
                  <div class="pin-av">{{ (msg.senderName || '?')[0].toUpperCase() }}</div>
                  <div class="pin-info">
                    <span class="pin-sender">{{ msg.senderName }}</span>
                    <span class="pin-text">{{ msg.content }}</span>
                  </div>
                </div>
                }
              </div>
            </div>
          </div>

        </form>
      </div>

      <div class="dlg-footer">
        <button class="btn-back" (click)="prevStep()" [class.hidden]="currentStep === 1">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          Retour
        </button>
        <button class="btn-cancel" (click)="cancel()">Annuler</button>
        @if (currentStep < 3) {
        <button class="btn-next" (click)="nextStep()" [disabled]="!canProceed()">
          Continuer
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        </button>
        } @else {
        <button class="btn-create" [disabled]="form.invalid || saving" (click)="submit()">
          @if (saving) {
            <div class="spinner"></div> Création…
          } @else {
            @if (form.get('withMeet')?.value) {
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><polygon points="23 7 16 12 23 17 23 7" stroke="white" stroke-width="2"/><rect x="1" y="5" width="15" height="14" rx="2" stroke="white" stroke-width="2"/></svg>
              Créer avec Meet
            } @else {
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" stroke="white" stroke-width="2"/><path d="M16 2v4M8 2v4M3 10h18" stroke="white" stroke-width="2" stroke-linecap="round"/></svg>
              Ajouter au calendrier
            }
          }
        </button>
        }
      </div>

    </div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }

    :host {
      display: block;
      width: 100%;
    }

    .dlg-wrap {
      width: 100%;
      min-height: 500px;
      display: flex; flex-direction: column;
      background: #fafbff; border-radius: 24px; overflow: hidden;
      font-family: 'Sora', 'Segoe UI', sans-serif;
      opacity: 0; transform: translateY(16px) scale(.97);
      transition: opacity .35s ease, transform .35s ease;
    }
    .dlg-wrap.loaded { opacity: 1; transform: translateY(0) scale(1); }

    .dlg-banner {
      position: relative; padding: 22px 24px 20px;
      background: linear-gradient(135deg, #4338ca 0%, #6366f1 50%, #818cf8 100%);
      overflow: hidden; flex-shrink: 0;
    }
    .banner-orb {
      position: absolute; border-radius: 50%; opacity: .18;
      animation: float 6s ease-in-out infinite;
    }
    .orb-1 { width: 120px; height: 120px; background: #fff; top: -40px; right: -20px; }
    .orb-2 { width: 80px; height: 80px; background: #c7d2fe; bottom: -20px; left: 60px; animation-delay: 2s; }
    .orb-3 { width: 50px; height: 50px; background: #fff; top: 10px; left: 40%; animation-delay: 4s; }
    @keyframes float {
      0%, 100% { transform: translateY(0) scale(1); }
      50% { transform: translateY(-10px) scale(1.05); }
    }
    .banner-content { position: relative; z-index: 1; display: flex; align-items: center; gap: 16px; }
    .dlg-header-icon {
      width: 52px; height: 52px;
      background: rgba(255,255,255,.2); border: 1.5px solid rgba(255,255,255,.35);
      border-radius: 16px; display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; backdrop-filter: blur(8px);
    }
    .banner-text { flex: 1; }
    .dlg-title { font-size: 18px; font-weight: 700; color: #fff; letter-spacing: -.3px; }
    .dlg-sub { font-size: 12px; color: rgba(255,255,255,.7); margin-top: 2px; }
    .dlg-close {
      width: 36px; height: 36px; background: rgba(255,255,255,.15);
      border: 1px solid rgba(255,255,255,.25); border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; color: rgba(255,255,255,.9); transition: background .2s; flex-shrink: 0;
    }
    .dlg-close:hover { background: rgba(255,255,255,.3); }

    .steps-bar {
      display: flex; align-items: center; padding: 14px 28px;
      background: #fff; border-bottom: 1px solid #e8ecf8;
      flex-shrink: 0;
    }
    .step { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
    .step-dot {
      width: 28px; height: 28px; border-radius: 50%;
      border: 2px solid #d1d5db;
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 700; color: #9ca3af;
      transition: all .3s ease; background: #fff;
    }
    .step.active .step-dot {
      border-color: #4f46e5; background: #4f46e5; color: #fff;
      box-shadow: 0 0 0 4px rgba(79,70,229,.15); transform: scale(1.1);
    }
    .step.done .step-dot { border-color: #10b981; background: #10b981; color: #fff; }
    .step-label { font-size: 11px; font-weight: 600; color: #9ca3af; transition: color .3s; }
    .step.active .step-label { color: #4f46e5; }
    .step.done .step-label { color: #10b981; }
    .step-line {
      flex: 1; height: 2px; background: #e5e7eb; margin: 0 8px;
      border-radius: 1px; transition: background .4s ease;
    }
    .step-line.active { background: linear-gradient(90deg, #10b981, #4f46e5); }

    .dlg-body {
      flex: 1;
      overflow: hidden;
      position: relative;
      min-height: 320px;
    }

    form { height: 100%; }

    .step-panel {
      position: absolute; inset: 0; padding: 20px 24px;
      overflow-y: auto; display: flex; flex-direction: column; gap: 16px;
      opacity: 0; transform: translateX(30px); pointer-events: none;
      transition: opacity .28s ease, transform .28s ease;
    }
    .step-panel.visible { opacity: 1; transform: translateX(0); pointer-events: all; }
    .step-panel::-webkit-scrollbar { width: 4px; }
    .step-panel::-webkit-scrollbar-thumb { background: #c7d2fe; border-radius: 2px; }

    .field-group { display: flex; flex-direction: column; gap: 8px; }
    .field-label {
      display: flex; align-items: center; gap: 6px;
      font-size: 11px; font-weight: 700; text-transform: uppercase;
      letter-spacing: .7px; color: #64748b;
    }
    .count-pill {
      margin-left: auto; background: #eef2ff; color: #4f46e5;
      font-size: 10px; font-weight: 700; padding: 2px 8px;
      border-radius: 20px; text-transform: none; letter-spacing: 0;
    }
    .input-wrap { position: relative; }
    .field-input {
      width: 100%; padding: 11px 14px;
      border: 1.5px solid #e2e8f0; border-radius: 12px;
      font-size: 14px; font-family: inherit; color: #0f172a;
      background: #fff; outline: none;
      transition: border-color .2s, box-shadow .2s;
    }
    .field-input:focus { border-color: #4f46e5; box-shadow: 0 0 0 3px rgba(79,70,229,.1); }
    .input-bar {
      position: absolute; bottom: 0; left: 14px; right: 14px;
      height: 2px; background: linear-gradient(90deg, #4f46e5, #818cf8);
      border-radius: 1px; transform: scaleX(0); transform-origin: left;
      transition: transform .25s ease;
    }
    .input-bar.active { transform: scaleX(1); }
    .field-error { display: flex; align-items: center; gap: 5px; font-size: 12px; color: #ef4444; font-weight: 500; }

    .mode-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .mode-card {
      display: flex; align-items: center; gap: 12px; padding: 14px;
      border: 1.5px solid #e2e8f0; border-radius: 14px; cursor: pointer;
      background: #fff; transition: all .2s; position: relative; overflow: hidden;
    }
    .mode-card:hover { border-color: #a5b4fc; transform: translateY(-1px); box-shadow: 0 4px 16px rgba(79,70,229,.1); }
    .mode-card.active { border-color: #4f46e5; background: linear-gradient(135deg, #eef2ff, #e0e7ff); box-shadow: 0 4px 20px rgba(79,70,229,.15); }
    .mode-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .mode-icon.meet { background: #d1fae5; color: #059669; }
    .mode-icon.task { background: #dbeafe; color: #2563eb; }
    .mode-name { font-size: 13px; font-weight: 600; color: #0f172a; }
    .mode-desc { font-size: 11px; color: #94a3b8; margin-top: 1px; }
    .mode-check {
      margin-left: auto; width: 22px; height: 22px; background: #4f46e5;
      border-radius: 50%; display: flex; align-items: center; justify-content: center;
      opacity: 0; transform: scale(0); transition: all .2s; flex-shrink: 0;
    }
    .mode-card.active .mode-check { opacity: 1; transform: scale(1); }

    .visibility-cards { display: flex; flex-direction: column; gap: 8px; }
    .vis-card {
      display: flex; align-items: center; gap: 14px; padding: 14px 16px;
      border: 1.5px solid #e2e8f0; border-radius: 14px; cursor: pointer;
      background: #fff; transition: all .2s;
    }
    .vis-card:hover { border-color: #a5b4fc; background: #fafbff; }
    .vis-card.active { border-color: #4f46e5; background: linear-gradient(135deg, #eef2ff, #e0e7ff); }
    .vis-icon { font-size: 22px; flex-shrink: 0; }
    .vis-title { font-size: 13px; font-weight: 600; color: #0f172a; }
    .vis-sub { font-size: 11px; color: #94a3b8; margin-top: 1px; }
    .vis-check {
      margin-left: auto; width: 24px; height: 24px; background: #4f46e5; color: #fff;
      border-radius: 50%; display: flex; align-items: center; justify-content: center;
      font-size: 13px; font-weight: 700; flex-shrink: 0;
    }

    .members-list { display: flex; flex-direction: column; gap: 6px; max-height: 220px; overflow-y: auto; }
    .members-list::-webkit-scrollbar { width: 4px; }
    .members-list::-webkit-scrollbar-thumb { background: #c7d2fe; border-radius: 2px; }
    .member-row {
      display: flex; align-items: center; gap: 10px; padding: 10px 12px;
      border: 1.5px solid #e2e8f0; border-radius: 12px; cursor: pointer;
      background: #fff; transition: all .15s;
    }
    .member-row:hover { background: #f8faff; border-color: #a5b4fc; }
    .member-row.selected { background: #eef2ff; border-color: #4f46e5; }
    .member-av {
      width: 32px; height: 32px; border-radius: 50%; color: #fff;
      font-size: 13px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .member-name { flex: 1; font-size: 13px; color: #0f172a; font-weight: 500; }
    .member-check {
      width: 22px; height: 22px; background: #4f46e5; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      opacity: 0; transform: scale(0); transition: all .2s; flex-shrink: 0;
    }
    .member-check.visible { opacity: 1; transform: scale(1); }
    .empty-hint { font-size: 13px; color: #94a3b8; }

    .empty-pins {
      display: flex; flex-direction: column; align-items: center;
      padding: 24px 20px; text-align: center; gap: 6px;
      background: #f8faff; border-radius: 14px; border: 1.5px dashed #c7d2fe;
    }
    .empty-pins-icon { font-size: 32px; }
    .empty-pins p { font-size: 13px; font-weight: 600; color: #475569; }
    .empty-pins span { font-size: 11px; color: #94a3b8; }

    .pins-list { display: flex; flex-direction: column; gap: 6px; }
    .pin-row {
      display: flex; align-items: center; gap: 10px; padding: 12px 14px;
      border: 1.5px solid #e2e8f0; border-radius: 12px; cursor: pointer;
      background: #fff; transition: all .15s;
    }
    .pin-row:hover { background: #f8faff; border-color: #a5b4fc; }
    .pin-row.selected { background: #eef2ff; border-color: #4f46e5; }
    .pin-checkbox {
      width: 20px; height: 20px; border: 2px solid #d1d5db; border-radius: 6px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; transition: all .2s; background: #fff;
    }
    .pin-checkbox.checked { background: #4f46e5; border-color: #4f46e5; }
    .pin-av {
      width: 28px; height: 28px; background: linear-gradient(135deg, #4f46e5, #818cf8);
      color: #fff; border-radius: 50%; font-size: 11px; font-weight: 700;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .pin-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .pin-sender { font-size: 11px; font-weight: 600; color: #6366f1; }
    .pin-text { font-size: 12px; color: #334155; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    .dlg-footer {
      display: flex; align-items: center; gap: 8px; padding: 14px 24px;
      background: #fff; border-top: 1px solid #e8ecf8; flex-shrink: 0;
    }
    .btn-back {
      display: flex; align-items: center; gap: 6px; padding: 9px 14px;
      background: none; border: 1.5px solid #e2e8f0; border-radius: 10px;
      font-size: 13px; font-weight: 500; color: #64748b; cursor: pointer; font-family: inherit; transition: all .2s;
    }
    .btn-back:hover { background: #f8faff; border-color: #a5b4fc; color: #4f46e5; }
    .btn-back.hidden { visibility: hidden; pointer-events: none; }
    .btn-cancel {
      padding: 9px 16px; background: #f1f5f9; border: none; border-radius: 10px;
      font-size: 13px; font-weight: 500; color: #64748b; cursor: pointer; font-family: inherit; transition: background .2s;
    }
    .btn-cancel:hover { background: #e2e8f0; }
    .btn-next {
      display: flex; align-items: center; gap: 6px; margin-left: auto; padding: 10px 20px;
      background: linear-gradient(135deg, #4f46e5, #6366f1); color: #fff; border: none;
      border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit;
      box-shadow: 0 4px 14px rgba(79,70,229,.3); transition: all .2s;
    }
    .btn-next:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(79,70,229,.4); }
    .btn-next:disabled { opacity: .4; cursor: not-allowed; transform: none; box-shadow: none; }
    .btn-create {
      display: flex; align-items: center; gap: 8px; margin-left: auto; padding: 10px 20px;
      background: linear-gradient(135deg, #059669, #10b981); color: #fff; border: none;
      border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit;
      box-shadow: 0 4px 14px rgba(16,185,129,.3); transition: all .2s;
    }
    .btn-create:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(16,185,129,.4); }
    .btn-create:disabled { opacity: .45; cursor: not-allowed; transform: none; box-shadow: none; }
    .spinner {
      width: 16px; height: 16px; border: 2px solid rgba(255,255,255,.3);
      border-top-color: #fff; border-radius: 50%; animation: spin 1s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class CreateMeetingDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<CreateMeetingDialogComponent>);
  private meetingService = inject(MeetingService);
  private destroy$ = new Subject<void>();

  saving = false;
  isLoaded = false;
  currentStep = 1;
  focused: Record<string, boolean> = {};
  selectedIds = new Set<string>();
  selectedMemberIds = new Set<string>();

  form = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    scheduledAt: [
      this.formatDateForInput(this.data?.date),
      [
        Validators.required,
        (control: AbstractControl) => {
          if (!control.value) return null;
          return new Date(control.value) < new Date() ? { pastDate: true } : null;
        }
      ]
    ],
    withMeet: [true],
    visibleToAll: [true]
  });

  constructor(@Inject(MAT_DIALOG_DATA) public data: DialogData) { }

  ngOnInit(): void {
    setTimeout(() => this.isLoaded = true, 50);
  }

  get minDateTime(): string {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  }

  onFocus(field: string): void { this.focused[field] = true; }
  onBlur(field: string): void { this.focused[field] = false; }

  canProceed(): boolean {
    if (this.currentStep === 1) {
      return !!this.form.get('title')?.valid && !!this.form.get('scheduledAt')?.valid;
    }
    return true;
  }

  nextStep(): void { if (this.canProceed() && this.currentStep < 3) this.currentStep++; }
  prevStep(): void { if (this.currentStep > 1) this.currentStep--; }

  getMemberColor(name: string): string {
    const colors = ['#7C3AED', '#DB2777', '#0891B2', '#059669', '#D97706', '#DC2626'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  }

  isSelected(id: string): boolean { return this.selectedIds.has(id); }

  toggleMessage(id: string): void {
    this.selectedIds.has(id) ? this.selectedIds.delete(id) : this.selectedIds.add(id);
  }

  toggleMember(userId: string): void {
    this.selectedMemberIds.has(userId) ? this.selectedMemberIds.delete(userId) : this.selectedMemberIds.add(userId);
  }

  submit(): void {
    if (this.form.invalid || this.saving) return;
    this.saving = true;
    const visibleToAll = this.form.value.visibleToAll;
    const dto: CreateMeetingRequest = {
      title: this.form.value.title!.trim(),
      scheduledAt: this.form.value.scheduledAt!,
      pinnedMessageIds: Array.from(this.selectedIds),
      withMeet: this.form.value.withMeet!,
      visibleMemberIds: visibleToAll ? [] : Array.from(this.selectedMemberIds)
    };
    this.meetingService.createMeeting(this.data.projectId, dto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: ApiResponse<MeetingEvent>) => {
          this.saving = false;
          if (res.success) this.dialogRef.close(res.data);
        },
        error: () => { this.saving = false; }
      });
  }

  cancel(): void { this.dialogRef.close(); }

  private formatDateForInput(date?: Date): string {
    if (!date) return '';
    const pad = (n: number): string => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
}
