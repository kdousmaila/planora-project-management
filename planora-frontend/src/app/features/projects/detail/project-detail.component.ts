import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { WorkspaceService } from '../../../core/services/workspace.service';
import { ProjectService } from '../../../core/services/project.service';
import { AuthService } from '../../../core/services/auth.service';
import { Project, WorkspaceMember, ProjectMember } from '../../../core/models';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';
import { DailyCheckInComponent } from '../daily-checkin/daily-checkin.component';

@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [
    CommonModule, RouterLink, MatCardModule, MatButtonModule,
    MatIconModule, MatChipsModule, MatProgressBarModule, MatFormFieldModule,
    MatSelectModule, ReactiveFormsModule, MatSnackBarModule, LoadingComponent,
    DailyCheckInComponent,
  ],
  templateUrl: './project-detail.component.html',
  styleUrls: ['./project-detail.component.css']
})
export class ProjectDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  private projectService = inject(ProjectService);
  private workspaceService = inject(WorkspaceService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);

  loading = true;
  project: Project | null = null;
  workspaceMembers: WorkspaceMember[] = [];
  addingMember = false;

  // ✅ Added
  projectId = '';

  memberForm = this.fb.group({
    userId: ['', Validators.required]
  });

  // ✅ Added
  get isPM(): boolean {
    return this.authService.currentUser?.userId === this.project?.projectManagerId;
  }

  // ✅ Added
  get isAdmin(): boolean {
    return this.authService.hasRole(['Admin']);
  }

  get canManageMembers(): boolean {
    const currentUserId = this.authService.currentUser?.userId;
    if (!this.project || !currentUserId) return false;
    return currentUserId === this.project.projectManagerId ||
      currentUserId === this.project.workspaceOwnerId ||
      this.authService.hasRole(['Admin']);
  }

  get availableWorkspaceMembers(): WorkspaceMember[] {
    const projectMemberIds = new Set((this.project?.members || []).map(m => m.userId));
    return this.workspaceMembers.filter(m => !projectMemberIds.has(m.userId));
  }

  get canOpenInbox(): boolean {
    const currentUserId = this.authService.currentUser?.userId;
    if (!this.project || !currentUserId) return false;
    return (this.project.members || []).some(m => m.userId === currentUserId) ||
      currentUserId === this.project.projectManagerId;
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('projectId');
    if (!id || id === 'null' || id === 'undefined') {
      this.loading = false;
      this.snackBar.open('Invalid project id in URL', 'Close', { duration: 3000 });
      return;
    }
    this.projectId = id; // ✅ Stored here
    this.loadProject(id);
  }

  loadProject(projectId: string): void {
    this.loading = true;
    this.projectService.getProject(projectId).subscribe({
      next: (response: any) => {
        this.loading = false;
        if (response.success) {
          this.project = response.data;
          this.loadWorkspaceMembers();
        } else {
          this.snackBar.open('Project not found', 'Close', { duration: 3000 });
        }
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Failed to load project', 'Close', { duration: 3000 });
      }
    });
  }

  loadWorkspaceMembers(): void {
    if (!this.project) return;
    this.workspaceService.getMembers(this.project.workspaceId).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.workspaceMembers = response.data;
          if (this.availableWorkspaceMembers.length > 0 && !this.memberForm.value.userId) {
            this.memberForm.patchValue({ userId: this.availableWorkspaceMembers[0].userId });
          }
        }
      },
      error: () => {
        this.snackBar.open('Failed to load workspace members', 'Close', { duration: 3000 });
      }
    });
  }

  canRemoveMember(member: ProjectMember): boolean {
    const currentUserId = this.authService.currentUser?.userId;
    if (!this.project || !currentUserId) return false;
    if (member.userId === this.project.projectManagerId) return false;
    return currentUserId === this.project.projectManagerId ||
      currentUserId === this.project.workspaceOwnerId ||
      this.authService.hasRole(['Admin']);
  }

  removeMember(member: ProjectMember): void {
    if (!this.project) return;
    if (!confirm(`Remove ${member.fullName} from this project?`)) return;
    this.projectService.removeMember(this.project.id, member.userId).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.snackBar.open('Member removed', 'Close', { duration: 3000 });
          this.loadProject(this.project!.id);
        }
      },
      error: (err: any) => {
        this.snackBar.open(err?.error?.message || 'Failed to remove', 'Close', { duration: 4000 });
      }
    });
  }

  addMember(): void {
    if (!this.project || this.memberForm.invalid) return;
    this.addingMember = true;
    const userId = this.memberForm.value.userId!;
    this.projectService.addMember(this.project.id, userId).subscribe({
      next: (response: any) => {
        this.addingMember = false;
        if (response.success) {
          this.snackBar.open('Member added!', 'Close', { duration: 3000 });
          this.loadProject(this.project!.id);
          this.memberForm.reset();
        } else {
          this.snackBar.open(response.message || 'Failed to add member', 'Close', { duration: 4000 });
        }
      },
      error: (err: any) => {
        this.addingMember = false;
        this.snackBar.open(err?.error?.message || 'Failed to add member', 'Close', { duration: 4000 });
      }
    });
  }

  trackByUserId(_: number, item: { userId: string }): string {
    return item.userId;
  }
}
