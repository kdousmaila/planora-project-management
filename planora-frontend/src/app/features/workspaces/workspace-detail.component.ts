import { Component, OnInit, inject, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDividerModule } from '@angular/material/divider';
import { WorkspaceService } from '../../core/services/workspace.service';
import { ProjectService } from '../../core/services/project.service';
import { AuthService } from '../../core/services/auth.service';
import { Workspace, Project, WorkspaceInviteableUser, WorkspaceMember } from '../../core/models';
import { LoadingComponent } from '../../shared/components/loading/loading.component';
import { ProjectFormDialogComponent } from '../projects/list/project-form-dialog.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { ErrorDialogComponent } from '../../shared/components/error-dialog/error-dialog.component';
import { InviteWorkspaceDialogComponent } from './modal/invite-workspace-dialog.component';

@Component({
  selector: 'app-workspace-detail',
  standalone: true,
  imports: [
    CommonModule, RouterLink, ReactiveFormsModule,
    MatCardModule, MatButtonModule, MatIconModule, MatTableModule,
    MatProgressBarModule, MatSnackBarModule, MatDialogModule,
    MatTooltipModule, MatTabsModule, MatFormFieldModule,
    MatSelectModule, MatDividerModule, LoadingComponent, ErrorDialogComponent
  ],
  templateUrl: './workspace-detail.component.html',
  styleUrls: ['./workspace-detail.component.scss']
})
export class WorkspaceDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private workspaceService = inject(WorkspaceService);
  private projectService = inject(ProjectService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  workspace: Workspace | null = null;
  projects: Project[] = [];
  members: WorkspaceMember[] = [];
  loading = true;
  projectsLoading = false;
  membersLoading = false;

  get isOwner(): boolean {
    if (!this.authService.currentUser || !this.workspace) return false;
    return this.authService.currentUser.userId === this.workspace.ownerId;
  }

  get canCreateProject(): boolean {
    if (!this.authService.currentUser || !this.workspace) return false;
    const user = this.authService.currentUser;
    const isWorkspacePM = this.workspace.projectManagerId === user.userId;
    // Only the workspace Owner, Admin, and PM can create projects
    return this.isOwner
      || user.roles.includes('Admin')
      || isWorkspacePM;
  }

  get canInvite(): boolean {
    return this.isOwner;
  }

  ngOnInit(): void {
    const workspaceId = this.route.snapshot.paramMap.get('id');
    if (workspaceId) {
      this.loadWorkspace(workspaceId);
      this.loadProjects(workspaceId);
      this.loadMembers(workspaceId);
    } else {
      this.loading = false;
      this.snackBar.open('Invalid workspace ID', 'Close', { duration: 3000 });
    }
  }

  loadWorkspace(id: string): void {
    this.workspaceService.getWorkspace(id).subscribe({
      next: (response) => {
        if (response.success) {
          this.workspace = response.data;
        } else {
          this.snackBar.open('Workspace not found', 'Close', { duration: 3000 });
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Failed to load workspace', 'Close', { duration: 3000 });
      }
    });
  }

  loadProjects(workspaceId: string): void {
    this.projectsLoading = true;
    this.projectService.getProjects(1, 100).subscribe({
      next: (response) => {
        this.projectsLoading = false;
        if (response.success) {
          this.projects = response.data.items.filter(p => p.workspaceId === workspaceId);
        }
      },
      error: () => {
        this.projectsLoading = false;
        this.snackBar.open('Failed to load projects', 'Close', { duration: 3000 });
      }
    });
  }

  loadMembers(workspaceId: string): void {
    this.membersLoading = true;
    this.workspaceService.getMembers(workspaceId).subscribe({
      next: (response) => {
        this.membersLoading = false;
        if (response.success) {
          this.members = response.data;
        }
      },
      error: () => {
        this.membersLoading = false;
      }
    });
  }

  openInviteDialog(): void {
    const dialogRef = this.dialog.open(InviteWorkspaceMemberDialogComponent, {

      width: '500px',
      data: {
        workspaceId: this.workspace!.id,
        hasProjectManager: !!this.workspace!.projectManagerId || this.workspace!.hasPendingPMInvitation
      }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadMembers(this.workspace!.id);
        this.loadWorkspace(this.workspace!.id); // ← add this line
      }
    });
  }

  createProject(): void {
    const user = this.authService.currentUser;

    if (!this.workspace?.projectManagerId) {
      this.snackBar.open(
        'Please assign a Project Manager to this workspace before creating a project.',
        'Close',
        { duration: 5000 }
      );
      return;
    }

    const dialogRef = this.dialog.open(ProjectFormDialogComponent, {
      width: '600px',
      data: {
        workspaceId: this.workspace!.id,
        projectManagerId: this.workspace!.projectManagerId  // ← this was missing
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadProjects(this.workspace!.id);
        this.snackBar.open('Project created successfully!', 'Close', { duration: 3000 });
      }
    });
  } editProject(project: Project): void {
    const dialogRef = this.dialog.open(ProjectFormDialogComponent, {
      width: '600px',
      data: project
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadProjects(this.workspace!.id);
      }
    });
  }

  viewProject(projectId: string): void {
    this.router.navigate(['/projects', projectId]);
  }

  goBackToProjects(): void {
    this.router.navigate(['/projects']);
  }

  canManageProject(project: Project): boolean {
    const user = this.authService.currentUser;
    if (!user) return false;
    return user.userId === project.projectManagerId ||
      user.userId === this.workspace?.ownerId ||
      user.roles.includes('Admin');
  }

  canRemoveMember(member: WorkspaceMember): boolean {
    const user = this.authService.currentUser;
    if (!user) return false;
    if (member.role === 'Owner' || (member.role === 'ProjectManager' && !this.isOwner)) return false;
    return this.isOwner && member.userId !== this.workspace?.ownerId;
  }

  removeMember(member: WorkspaceMember): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Remove Member',
        message: `Are you sure you want to remove ${member.fullName} from this workspace?`,
        confirmLabel: 'Remove',
        cancelLabel: 'Cancel',
        danger: true
      }
    });
    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed && this.workspace) {
        this.workspaceService.removeMember(this.workspace.id, member.userId).subscribe({
          next: (response) => {
            if (response.success) {
              this.snackBar.open('Member removed successfully', 'Close', { duration: 3000 });
              this.loadMembers(this.workspace!.id);
              this.loadWorkspace(this.workspace!.id);
            }
          },
          error: () => {
            this.snackBar.open('Failed to remove member', 'Close', { duration: 3000 });
          }
        });
      }
    });
  }
}

// ==================== DIALOGUE D'INVITATION ====================
@Component({
  selector: 'app-invite-workspace-member-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatSnackBarModule,
    MatIconModule,
    MatDividerModule
  ],
  template: `
    <h2 mat-dialog-title style="display:none">Invite to workspace</h2>
    <div style="padding: 24px 24px 0;">
      <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#ede9fe,#c7d2fe);display:flex;align-items:center;justify-content:center;margin-bottom:14px;">
  <mat-icon style="color:#4f46e5;font-size:20px;width:20px;height:20px;">person_add</mat-icon>
</div>
      <p style="font-size:17px;font-weight:500;margin:0 0 4px;color:inherit">Invite to workspace</p>
      <p style="font-size:13px;color:#6b7280;margin:0 0 20px">Add a member and assign their role in this workspace.</p>
    </div>

    <mat-divider></mat-divider>

    <mat-dialog-content style="padding: 20px 24px;">
      <form [formGroup]="form" style="display:flex;flex-direction:column;gap:16px;">

        <div>
          <label style="font-size:12px;font-weight:500;color:#6b7280;text-transform:uppercase;letter-spacing:0.04em;display:block;margin-bottom:6px;">User</label>
          <mat-form-field appearance="outline" class="full-width">
<mat-select formControlName="userId" (selectionChange)="onUserChange()">              @for (user of users; track user.userId) {
                <mat-option [value]="user.userId">
                  {{ user.fullName }} — {{ user.email }}
                </mat-option>
              }
              @if (users.length === 0 && !loading) {
                <mat-option disabled>No users available to invite</mat-option>
              }
            </mat-select>
          </mat-form-field>
        </div>

        <div>
          <label style="font-size:12px;font-weight:500;color:#6b7280;text-transform:uppercase;letter-spacing:0.04em;display:block;margin-bottom:8px;">Role</label>
          <div style="display:flex;flex-direction:column;gap:8px;">
            @for (opt of roleOptions; track opt.value) {
@if (opt.value !== 'ProjectManager' || canBeProjectManager) {
                <div
                  (click)="form.patchValue({role: opt.value})"
                  [style.border]="form.value.role === opt.value ? '1.5px solid #dc2626' : '0.5px solid #fecaca'"
                  [style.background]="form.value.role === opt.value ? '#fff5f5' : 'transparent'"
                  style="border-radius:8px;padding:12px 14px;display:flex;align-items:flex-start;gap:12px;cursor:pointer;">
                  <div style="width:16px;height:16px;border-radius:50%;margin-top:2px;flex-shrink:0;display:flex;align-items:center;justify-content:center;"
                    [style.background]="form.value.role === opt.value ? '#dc2626' : 'transparent'"
                    [style.border]="form.value.role === opt.value ? '1.5px solid #dc2626' : '1.5px solid #fca5a5'">
                    @if (form.value.role === opt.value) {
                      <div style="width:6px;height:6px;border-radius:50%;background:white"></div>
                    }
                  </div>
                  <div style="flex:1">
                    <div style="font-size:14px;font-weight:500;margin-bottom:2px">{{ opt.label }}</div>
                    <div style="font-size:12px;color:#6b7280">{{ opt.description }}</div>
                  </div>
                  <span style="font-size:10px;font-weight:500;padding:2px 8px;border-radius:20px;flex-shrink:0;"
                    [style.background]="opt.value === 'ProjectManager' ? '#fee2e2' : '#f3f4f6'"
                    [style.color]="opt.value === 'ProjectManager' ? '#b91c1c' : '#6b7280'">
                    {{ opt.badge }}
                  </span>
                </div>
              }
            }
          </div>
        </div>

        @if (loading) {
          <p style="font-size:13px;color:#6b7280">Loading users...</p>
        }

      </form>
    </mat-dialog-content>

    <mat-divider></mat-divider>

    <mat-dialog-actions align="end" style="padding:16px 24px 20px;gap:10px">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button class="invite-btn"
        (click)="invite()"
        [disabled]="form.invalid || inviting || users.length === 0 || loading">
        {{ inviting ? 'Sending...' : 'Send invitation' }}
      </button>
    </mat-dialog-actions>
  `, styles: [`
    .full-width { width: 100%; }
.invite-btn {
  background: linear-gradient(135deg, #4f46e5, #4338ca) !important;
  color: white !important;
  border-radius: 8px !important;
}
  `]
})
export class InviteWorkspaceMemberDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private workspaceService = inject(WorkspaceService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private dialogRef = inject(MatDialogRef<InviteWorkspaceMemberDialogComponent>);

  users: WorkspaceInviteableUser[] = [];
  inviting = false;
  loading = true;

  form = this.fb.group({
    userId: ['', Validators.required],
    role: ['Member', Validators.required]
  });

  roleOptions = [
    {
      value: 'ProjectManager',
      label: 'Project Manager',
      description: 'Can create and manage projects in this workspace',
      badge: '1 max'
    },
    {
      value: 'Member',
      label: 'Member',
      description: 'Can view and participate in assigned projects',
      badge: 'Default'
    }
  ];

  constructor(@Inject(MAT_DIALOG_DATA) public data: {
    workspaceId: string;
    hasProjectManager: boolean;
  }) { }

  isOptionDisabled(role: string): boolean {
    return role === 'ProjectManager' && this.data.hasProjectManager;
  }

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading = true;
    this.workspaceService.getInviteableUsers(this.data.workspaceId).subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success) {
          this.users = response.data;
          if (this.users.length > 0) {
            this.form.patchValue({ userId: this.users[0].userId });
          }
        }
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Failed to load users', 'Close', { duration: 3000 });
      }
    });
  }

  showErrorDialog(message: string): void {
    this.dialog.open(ErrorDialogComponent, {
      width: '400px',
      data: { message }
    });
  }

  invite(): void {
    if (this.form.invalid) return;

    if (this.form.value.role === 'ProjectManager' && this.data.hasProjectManager) {
      this.showErrorDialog('This workspace already has a Project Manager. Only one Project Manager is allowed per workspace.');
      return;
    }

    this.inviting = true;
    this.workspaceService.inviteUser(this.data.workspaceId, {
      userId: this.form.value.userId!,
      role: this.form.value.role! as 'ProjectManager' | 'Member'
    }).subscribe({
      next: (response) => {
        this.inviting = false;
        if (response.success) {
          this.dialogRef.close(true);
        } else {
          this.showErrorDialog(response.message || 'Failed to send invitation');
        }
      },
      error: (err) => {
        this.inviting = false;
        const errorMessage = err?.error?.message || err?.message || 'Failed to send invitation';
        this.showErrorDialog(errorMessage);
      }
    });
  }
  get canBeProjectManager(): boolean {
    const userId = this.form.value.userId;
    const selectedUser = this.users.find(u => u.userId === userId);
    const userIsProjectManager = selectedUser?.roles?.includes('ProjectManager') ?? false;
    return !this.data.hasProjectManager && userIsProjectManager;
  }
  onUserChange(): void {
    if (!this.canBeProjectManager && this.form.value.role === 'ProjectManager') {
      this.form.patchValue({ role: 'Member' });
    }
  }
}
