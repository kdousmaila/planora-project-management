// workspaces/modal/invite-workspace-dialog.component.ts
import { Component, OnInit, Inject, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { WorkspaceService } from '../../../core/services/workspace.service';
import { WorkspaceInviteableUser } from '../../../core/models';

@Component({
  selector: 'app-invite-workspace-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDividerModule
  ],
  template: `
    <!-- titre caché pour l'accessibilité -->
    <h2 mat-dialog-title style="display:none">Invite to workspace</h2>

    <!-- En-tête visuel -->
    <div style="padding: 24px 24px 0;">
     <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#ede9fe,#c7d2fe);display:flex;align-items:center;justify-content:center;margin-bottom:14px;">
  <mat-icon style="color:#4f46e5;font-size:20px;width:20px;height:20px;">person_add</mat-icon>
</div>
      <p style="font-size:17px;font-weight:600;margin:0 0 4px;color:#1e293b">Invite to workspace</p>
      <p style="font-size:13px;color:#6b7280;margin:0 0 20px">Add a member and assign their role in this workspace.</p>
    </div>

    <mat-divider></mat-divider>

    <mat-dialog-content style="padding: 20px 24px; min-width: 460px;">

      @if (loadingUsers) {
        <div class="loading-state">
          <mat-spinner diameter="32"></mat-spinner>
          <p>Loading users...</p>
        </div>
      }

      @if (!loadingUsers) {
        <form [formGroup]="inviteForm" style="display:flex;flex-direction:column;gap:16px;">

          <!-- Sélecteur d'utilisateur -->
          <div>
            <label class="field-label">User</label>
            <mat-form-field appearance="outline" class="full-width">
<mat-select formControlName="userId" (selectionChange)="onUserChange()">
                @for (user of inviteableUsers; track user.userId) {
                  <mat-option [value]="user.userId">
                    {{ user.fullName }} — {{ user.email }}
                  </mat-option>
                }
                @if (inviteableUsers.length === 0) {
                  <mat-option disabled>No users available to invite</mat-option>
                }
              </mat-select>
              <mat-error>Please select a user</mat-error>
            </mat-form-field>
          </div>

          <!-- Sélecteur de rôle -->
<div>
  <label class="field-label">Role</label>
  <div style="display:flex;flex-direction:column;gap:8px;">

    <!-- Option Project Manager (cachée si déjà assigné) -->
    @if (!isPMDisabled) {
      <div
        (click)="selectRole('ProjectManager')"
        [class.role-selected]="inviteForm.value.role === 'ProjectManager'"
        class="role-option">
        <div class="radio-dot" [class.radio-dot-on]="inviteForm.value.role === 'ProjectManager'">
          @if (inviteForm.value.role === 'ProjectManager') {
            <div class="radio-inner"></div>
          }
        </div>
        <div style="flex:1">
          <div style="font-size:14px;font-weight:500;margin-bottom:2px">Project Manager</div>
          <div style="font-size:12px;color:#6b7280">Can create and manage projects in this workspace</div>
        </div>
        <span class="badge badge-pm">1 max</span>
      </div>
    }

    <!-- Option Member -->
    <div
      (click)="selectRole('Member')"
      [class.role-selected]="inviteForm.value.role === 'Member'"
      class="role-option">
      <div class="radio-dot" [class.radio-dot-on]="inviteForm.value.role === 'Member'">
        @if (inviteForm.value.role === 'Member') {
          <div class="radio-inner"></div>
        }
      </div>
      <div style="flex:1">
        <div style="font-size:14px;font-weight:500;margin-bottom:2px">Member</div>
        <div style="font-size:12px;color:#6b7280">Can view and participate in assigned projects</div>
      </div>
      <span class="badge badge-member">Default</span>
    </div>

  </div>
</div>
        </form>
      }

    </mat-dialog-content>

    <mat-divider></mat-divider>

    <mat-dialog-actions align="end" style="padding:16px 24px 20px;gap:10px">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button
        mat-raised-button
        class="btn-invite"
        [disabled]="inviteForm.invalid || loadingUsers || inviting || inviteableUsers.length === 0"
        (click)="onSubmit()">
        {{ inviting ? 'Sending...' : 'Send invitation' }}
      </button>
    </mat-dialog-actions>
  `,
  // Dans InviteWorkspaceDialogComponent — remplacer styles: [`...`] par :
  styles: [`
  .full-width { width: 100%; }
  .loading-state {
    display: flex; flex-direction: column; align-items: center;
    gap: 12px; padding: 40px 0; color: #64748b;
  }
  .field-label {
    font-size: 12px; font-weight: 700; color: #64748b;
    text-transform: uppercase; letter-spacing: 0.04em;
    display: block; margin-bottom: 6px;
  }
  .role-option {
    border: 1px solid #c7d2fe; border-radius: 10px;
    padding: 12px 14px; display: flex; align-items: flex-start;
    gap: 12px; cursor: pointer; background: transparent;
    transition: all 0.15s ease;
  }
  .role-option:hover { background: #f5f3ff; }
  .role-selected { border: 1.5px solid #4f46e5 !important; background: #f5f3ff !important; }
  .radio-dot {
    width: 16px; height: 16px; border-radius: 50%; margin-top: 2px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    border: 1.5px solid #a5b4fc; background: transparent; transition: all 0.15s ease;
  }
  .radio-dot-on { background: #4f46e5 !important; border-color: #4f46e5 !important; }
  .radio-inner { width: 6px; height: 6px; border-radius: 50%; background: white; }
  .badge {
    font-size: 10px; font-weight: 600; padding: 2px 8px;
    border-radius: 20px; flex-shrink: 0; align-self: flex-start; margin-top: 2px;
  }
  .badge-pm { background: #ede9fe; color: #4338ca; }
  .badge-member { background: #f1f5f9; color: #475569; }
  .btn-invite {
    background: linear-gradient(135deg, #4f46e5, #4338ca) !important;
    color: white !important; border-radius: 10px !important;
    font-weight: 700 !important; padding: 0 20px !important;
    box-shadow: 0 4px 12px rgba(79,70,229,0.3) !important;
  }
  .btn-invite:disabled { background: #a5b4fc !important; box-shadow: none !important; }
`]
})
export class InviteWorkspaceDialogComponent implements OnInit {
  constructor(
    @Inject(MAT_DIALOG_DATA) public dialogData: { workspaceId: string; hasProjectManager: boolean }
  ) { }

  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<InviteWorkspaceDialogComponent>);
  private workspaceService = inject(WorkspaceService);
  private snackBar = inject(MatSnackBar);

  inviteableUsers: WorkspaceInviteableUser[] = [];
  loadingUsers = true;
  inviting = false;

  // Raccourci pour le template
  get isPMDisabled(): boolean {
    const userId = this.inviteForm.value.userId;
    const selectedUser = this.inviteableUsers.find(u => u.userId === userId);
    const userIsProjectManager = selectedUser?.roles?.includes('ProjectManager') ?? false;
    return this.dialogData.hasProjectManager || !userIsProjectManager;
  }

  inviteForm = this.fb.group({
    userId: ['', Validators.required],
    role: ['Member', Validators.required]
  });

  ngOnInit(): void {
    this.loadInviteableUsers();
  }

  selectRole(role: string): void {
    this.inviteForm.patchValue({ role });
  }

  loadInviteableUsers(): void {
    this.workspaceService.getInviteableUsers(this.dialogData.workspaceId).subscribe({
      next: (response) => {
        this.loadingUsers = false;
        if (response.success) {
          this.inviteableUsers = response.data;
          if (this.inviteableUsers.length > 0) {
            this.inviteForm.patchValue({ userId: this.inviteableUsers[0].userId });
          }
        }
      },
      error: () => {
        this.loadingUsers = false;
        this.snackBar.open('Failed to load users', 'Close', { duration: 3000 });
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
  onUserChange(): void {
    if (this.isPMDisabled && this.inviteForm.value.role === 'ProjectManager') {
      this.inviteForm.patchValue({ role: 'Member' });
    }
  }
  onSubmit(): void {
    if (this.inviteForm.invalid) return;

    // Double-check in the logic layer
    if (this.inviteForm.value.role === 'ProjectManager' && this.isPMDisabled) {
      this.snackBar.open(
        'This workspace already has a Project Manager.',
        'Close',
        { duration: 4000 }
      );
      return;
    }

    const { userId, role } = this.inviteForm.value;
    this.inviting = true;

    this.workspaceService.inviteUser(this.dialogData.workspaceId, {
      userId: userId!,
      role: role as 'Member' | 'ProjectManager'
    }).subscribe({
      next: (response) => {
        this.inviting = false;
        if (response.success) {
          this.snackBar.open('Invitation sent!', 'Close', { duration: 3000 });
          this.dialogRef.close(true);
        } else {
          this.snackBar.open(response.message || 'Failed to send invitation', 'Close', { duration: 4000 });
        }
      },
      error: (err) => {
        this.inviting = false;
        const msg = err?.error?.message || 'Failed to send invitation';
        this.snackBar.open(msg, 'Close', { duration: 4000 });
      }
    });
  }
}
