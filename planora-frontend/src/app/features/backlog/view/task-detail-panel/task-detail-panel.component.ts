import {
  Component, Input, Output, EventEmitter, OnChanges, SimpleChanges,
  inject, ViewChild, ElementRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { BacklogService } from '../../../../core/services/backlog.service';
import { TaskService } from '../../../../core/services/task.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ProjectService } from '../../../../core/services/project.service';
import { BacklogExtrasService } from '../../../../core/services/backlog-extras.service';
import { BacklogItem, TaskComment, ProjectMember } from '../../../../core/models';
import { BacklogExtrasPanelComponent } from './backlog-extras-panel.component';
import { RichCommentEditorComponent, RichComment } from './rich-comment-editor.component';

interface SubTask {
  id: string;
  title: string;
  completed: boolean;
  status: 0 | 1 | 2;
  createdAt: Date;
}

interface ActivityEntry {
  id: string;
  type: 'status_change' | 'priority_change' | 'comment' | 'subtask' | 'description' | 'created';
  message: string;
  authorName: string;
  createdAt: Date;
}

interface BacklogBranch {
  id: string;
  branchName: string;
  createdByName: string;
  createdAt: string | Date;
  commits: BacklogCommit[];
}

interface BacklogCommit {
  id: string;
  hash: string;
  message: string;
  createdByName: string;
  createdAt: string | Date;
}

@Component({
  selector: 'app-task-detail-panel',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatIconModule, MatButtonModule, MatSelectModule,
    MatTooltipModule, MatProgressBarModule,
    BacklogExtrasPanelComponent,
    RichCommentEditorComponent
  ],
  templateUrl: './task-detail-panel.component.html',
  styleUrls: ['./task-detail-panel.component.scss']
})
export class TaskDetailPanelComponent implements OnChanges {
  @Input() taskId: string | null = null;
  @Input() visible = false;
  @Input() projectId = '';
  @Output() closed = new EventEmitter<void>();
  @Output() taskUpdated = new EventEmitter<void>();
  @Output() taskDeleted = new EventEmitter<string>();
  @ViewChild(RichCommentEditorComponent) richEditorRef?: RichCommentEditorComponent;
  @ViewChild('panelEl') panelEl!: ElementRef<HTMLElement>;

  private backlogService = inject(BacklogService);
  private taskService = inject(TaskService);
  private authService = inject(AuthService);
  private projectService = inject(ProjectService);
  private snackBar = inject(MatSnackBar);
  private extrasService = inject(BacklogExtrasService);

  task: BacklogItem | null = null;
  richComments: RichComment[] = [];
  subTasks: SubTask[] = [];
  activity: ActivityEntry[] = [];
  projectMembers: ProjectMember[] = [];
  membersLoading = false;

  editTitle = '';
  editDescription = '';
  editStoryPoints: number | null = null;
  descSaving = false;
  editingDesc = false;

  subtasksExpanded = true;
  detailsExpanded = true;

  addingSubTask = false;
  newSubTaskTitle = '';
  editingSubTaskId: string | null = null;
  editSubTaskTitle = '';

  newComment = '';
  addingComment = false;
  commentsLoading = false;
  composerFocused = false;

  activeTab: 'subtasks' | 'comments' = 'comments';
  activityTab: 'all' | 'comments' | 'history' = 'all';
  statusMenuOpen = false;
  priorityMenuOpen = false;
  assignMenuOpen = false;
  storyPointsMenuOpen = false;

  // Modals
  assignModalOpen = false;
  storyPointsModalOpen = false;

  devAction: 'branch' | 'commit' | null = null;
  devBranches: BacklogBranch[] = [];
  devModalType: 'branch' | 'commit' | null = null;
  selectedBranch: BacklogBranch | null = null;
  newBranchName = '';
  newCommitHash = '';
  newCommitMsg = '';
  savingBranch = false;
  savingCommit = false;

  readonly fibPoints = [1, 2, 3, 5, 8, 13, 21];

  readonly priorities = [
    { value: 0, label: 'Low', icon: 'arrow_downward' },
    { value: 1, label: 'Medium', icon: 'arrow_upward' },
    { value: 2, label: 'High', icon: 'priority_high' },
    { value: 3, label: 'Critical', icon: 'error_outline' },
  ];

  get currentUserId(): string { return this.authService.currentUser?.userId ?? ''; }

  get doneSubTasks(): number { return this.subTasks.filter(s => s.status === 2).length; }

  get subTaskProgress(): number {
    return !this.subTasks.length ? 0
      : Math.round((this.doneSubTasks / this.subTasks.length) * 100);
  }

  get currentUserInitial(): string {
    return this.authService.currentUser?.fullName?.charAt(0)?.toUpperCase() ?? 'U';
  }

  get currentUserName(): string {
    return this.authService.currentUser?.fullName ?? 'You';
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.taskId && (changes['taskId'] || (changes['visible'] && this.visible))) {
      this.loadAll(this.taskId);
    }
    if (changes['visible'] && !this.visible) {
      this.statusMenuOpen = false;
      this.priorityMenuOpen = false;
      this.assignMenuOpen = false;
      this.storyPointsMenuOpen = false;
      this.assignModalOpen = false;
      this.storyPointsModalOpen = false;
    }
  }

  private loadAll(id: string): void {
    this.task = null;
    this.backlogService.getBacklogItem(id).subscribe({
      next: (r: any) => {
        if (r.success) {
          this.task = r.data;
          this.editTitle = r.data.title;
          this.editDescription = r.data.description ?? '';
          this.editStoryPoints = r.data.storyPoints ?? null;
          this.loadComments(id);
          this.loadSubTasks(id);
          this.buildActivity();
          this.loadMembers();
          this.loadDevData(id);
        }
      }
    });
  }

  private loadDevData(id: string): void {
    this.extrasService.getBranches(id).subscribe({
      next: (r: any) => {
        if (r.success && r.data) {
          this.devBranches = r.data.map((branch: any) => ({
            id: branch.id,
            branchName: branch.branchName,
            createdByName: branch.createdByName,
            createdAt: branch.createdAt,
            commits: branch.commits?.map((commit: any) => ({
              id: commit.id,
              hash: commit.hash,
              message: commit.message,
              createdByName: commit.createdByName,
              createdAt: commit.createdAt
            })) || []
          }));
        }
      },
      error: (err: any) => console.error('Error loading branches:', err)
    });
  }

  private loadComments(id: string): void {
    this.commentsLoading = true;
    this.taskService.getComments(id).subscribe({
      next: (r: any) => {
        this.commentsLoading = false;
        if (r.success) {
          this.richComments = r.data.map((c: any) => ({
            id: c.id,
            content: c.content,
            authorId: c.authorId,
            authorName: c.authorName,
            authorInitial: c.authorName?.charAt(0)?.toUpperCase() ?? '?',
            createdAt: new Date(c.createdAt),
          }));
        }
      },
      error: () => { this.commentsLoading = false; }
    });
  }

  private loadSubTasks(id: string): void {
    this.backlogService.getSubTasks(id).subscribe({
      next: (r: any) => {
        if (r.success) {
          this.subTasks = r.data.map((s: any) => ({
            id: s.id,
            title: s.title,
            completed: s.isCompleted,
            status: s.status ?? (s.isCompleted ? 2 : 0),
            createdAt: new Date(s.createdAt)
          }));
        }
      },
      error: () => { this.subTasks = []; }
    });
  }

  private buildActivity(): void {
    this.activity = [];
    if (this.task) {
      this.activity.push({
        id: '0',
        type: 'created',
        message: 'created this task',
        authorName: this.task.assignedToName ?? 'System',
        createdAt: new Date(this.task.createdAt ?? Date.now())
      });
    }
  }

  private loadMembers(): void {
    if (!this.projectId || this.projectMembers.length) return;
    this.membersLoading = true;
    this.projectService.getProject(this.projectId).subscribe({
      next: (r: any) => {
        this.membersLoading = false;
        if (r.success) this.projectMembers = r.data.members ?? [];
      },
      error: () => { this.membersLoading = false; }
    });
  }

  // ── Modals assignee & story points ──────────────────────────

  openAssignModal(): void {
    this.assignModalOpen = true;
    this.loadMembers();
  }

  openStoryPointsModal(): void {
    this.storyPointsModalOpen = true;
  }

  // ── Dev ──────────────────────────────────────────────────────

  openDevAction(action: 'branch' | 'commit'): void {
    this.devAction = null;
    setTimeout(() => this.devAction = action, 0);
  }

  onDevUpdated(): void { if (this.task) this.loadDevData(this.task.id); }

  openDevModal(type: 'branch' | 'commit'): void {
    this.newBranchName = '';
    this.newCommitHash = '';
    this.newCommitMsg = '';
    this.devModalType = type;
    this.selectedBranch = null;
  }

  openCommitModal(branch: BacklogBranch): void {
    this.selectedBranch = branch;
    this.newCommitHash = '';
    this.newCommitMsg = '';
    this.devModalType = 'commit';
  }

  closeDevModal(): void { this.devModalType = null; this.selectedBranch = null; }

  submitBranch(): void {
    if (!this.newBranchName.trim() || !this.task) return;
    this.savingBranch = true;
    this.extrasService.addBranch(this.task.id, { branchName: this.newBranchName.trim() }).subscribe({
      next: (r: any) => {
        this.savingBranch = false;
        if (r.success) {
          this.devBranches = [{ ...r.data, commits: [] }, ...this.devBranches];
          this.snackBar.open('Branch created', 'Close', { duration: 2000 });
          this.closeDevModal();
        }
      },
      error: () => { this.savingBranch = false; this.snackBar.open('Error', 'Close', { duration: 3000 }); }
    });
  }

  submitCommit(): void {
    if (!this.newCommitHash.trim() || !this.newCommitMsg.trim() || !this.task || !this.selectedBranch) return;
    this.savingCommit = true;
    this.extrasService.addCommit(this.task.id, this.selectedBranch.id, {
      hash: this.newCommitHash.trim(),
      message: this.newCommitMsg.trim()
    }).subscribe({
      next: (r: any) => {
        this.savingCommit = false;
        if (r.success) {
          const branch = this.devBranches.find(b => b.id === this.selectedBranch?.id);
          if (branch) branch.commits = [r.data, ...(branch.commits || [])];
          this.snackBar.open('Commit added', 'Close', { duration: 2000 });
          this.closeDevModal();
        }
      },
      error: () => { this.savingCommit = false; this.snackBar.open('Error', 'Close', { duration: 3000 }); }
    });
  }

  deleteBranch(branch: BacklogBranch): void {
    if (!this.task || !confirm(`Delete branch "${branch.branchName}"?`)) return;
    this.extrasService.deleteBranch(this.task.id, branch.id).subscribe({
      next: (r: any) => {
        if (r.success) {
          this.devBranches = this.devBranches.filter(b => b.id !== branch.id);
          this.snackBar.open('Branch deleted', 'Close', { duration: 2000 });
        }
      }
    });
  }

  deleteCommit(branch: BacklogBranch, commit: BacklogCommit): void {
    if (!this.task) return;
    this.extrasService.deleteCommit(this.task.id, branch.id, commit.id).subscribe({
      next: (r: any) => {
        if (r.success) {
          branch.commits = branch.commits.filter((c: BacklogCommit) => c.id !== commit.id);
          this.snackBar.open('Commit deleted', 'Close', { duration: 2000 });
        }
      }
    });
  }

  // ── Assignee ─────────────────────────────────────────────────

  selectAssignee(member: ProjectMember | null): void {
    if (!this.task) return;
    this.assignMenuOpen = false;
    const prevId = this.task.assignedToId;
    const prevName = this.task.assignedToName;
    this.task.assignedToId = member?.userId ?? '';
    this.task.assignedToName = member?.fullName ?? '';

    this.backlogService.assignToUser(this.task.id, member?.userId ?? null).subscribe({
      next: (r: any) => {
        if (r.success) {
          this.pushActivity('status_change', `assigned the task to ${member?.fullName ?? 'nobody'}`);
          this.snackBar.open(member ? `Assigned to ${member.fullName}` : 'Unassigned', 'Close', { duration: 2000 });
          this.taskUpdated.emit();
          if (this.task) this.loadAll(this.task.id);
        } else if (this.task) {
          this.task.assignedToId = prevId;
          this.task.assignedToName = prevName;
        }
      },
      error: () => {
        if (this.task) { this.task.assignedToId = prevId; this.task.assignedToName = prevName; }
        this.snackBar.open('Error', 'Close', { duration: 3000 });
      }
    });
  }

  // ── Story points ──────────────────────────────────────────────

  selectStoryPoints(pts: number): void {
    if (!this.task) return;
    this.storyPointsMenuOpen = false;
    const prevPts = this.task.storyPoints ?? null;
    const storyPointsToSave = pts === -1 ? null : pts;
    this.editStoryPoints = storyPointsToSave;
    this.task.storyPoints = storyPointsToSave ?? undefined;
    const pointsToSend = storyPointsToSave === null ? 0 : storyPointsToSave;

    this.backlogService.updateComplexity(this.task.id, pointsToSend).subscribe({
      next: (r: any) => {
        if (r.success && this.task) {
          this.snackBar.open(`Story points: ${pts === -1 ? '?' : pts + ' pts'}`, 'Close', { duration: 2000 });
          this.taskUpdated.emit();
          if (this.task) this.loadAll(this.task.id);
        } else {
          this.editStoryPoints = prevPts;
          if (this.task) this.task.storyPoints = prevPts ?? undefined;
        }
      },
      error: () => {
        this.editStoryPoints = prevPts;
        if (this.task) this.task.storyPoints = prevPts ?? undefined;
        this.snackBar.open('Error', 'Close', { duration: 3000 });
      }
    });
  }

  // ── Status & Priority ─────────────────────────────────────────

  toggleStatusMenu(): void {
    this.statusMenuOpen = !this.statusMenuOpen;
    this.priorityMenuOpen = false;
  }

  selectStatus(status: number): void {
    if (!this.task) return;
    this.statusMenuOpen = false;
    const prev = this.task.status;
    this.task.status = status;

    this.backlogService.updateBacklogItemStatus(this.task.id, status).subscribe({
      next: (r: any) => {
        if (r.success) {
          this.pushActivity('status_change', `changed status → ${this.getStatusLabel(status)}`);
          this.snackBar.open(`Status: ${this.getStatusLabel(status)}`, 'Close', { duration: 2000 });
          this.taskUpdated.emit();
        } else if (this.task) { this.task.status = prev; }
      },
      error: () => {
        if (this.task) this.task.status = prev;
        this.snackBar.open('Error', 'Close', { duration: 3000 });
      }
    });
  }

  selectPriority(priority: number): void {
    if (!this.task) return;
    this.priorityMenuOpen = false;
    const prev = this.task.priority;
    this.task.priority = priority;

    this.backlogService.updatePriority(this.task.id, priority).subscribe({
      next: (r: any) => {
        if (r.success) {
          this.pushActivity('priority_change', `changed priority → ${this.getPrioLabel(priority)}`);
          this.snackBar.open(`Priority: ${this.getPrioLabel(priority)}`, 'Close', { duration: 2000 });
          this.taskUpdated.emit();
        } else if (this.task) { this.task.priority = prev; }
      },
      error: () => {
        if (this.task) this.task.priority = prev;
        this.snackBar.open('Error', 'Close', { duration: 3000 });
      }
    });
  }

  // ── Title & Description ───────────────────────────────────────

  saveTitle(): void {
    if (!this.task || this.editTitle.trim() === this.task.title) return;
    const t = this.editTitle.trim();
    if (!t) { this.editTitle = this.task.title; return; }

    this.backlogService.updateBacklogItem(this.task.id, {
      title: t, priority: this.task.priority, description: this.task.description ?? ''
    }).subscribe({
      next: (r: any) => {
        if (r.success && this.task) {
          this.task.title = t;
          this.pushActivity('description', 'updated the title');
          this.taskUpdated.emit();
        }
      },
      error: () => this.snackBar.open('Error', 'Close', { duration: 3000 })
    });
  }

  startEditDesc(): void { if (!this.editingDesc) this.editingDesc = true; }

  saveDescription(): void {
    this.editingDesc = false;
    if (!this.task || this.editDescription === (this.task.description ?? '')) return;
    this.descSaving = true;

    this.backlogService.updateBacklogItem(this.task.id, {
      title: this.task.title, priority: this.task.priority, description: this.editDescription
    }).subscribe({
      next: (r: any) => {
        this.descSaving = false;
        if (r.success && this.task) {
          this.task.description = this.editDescription;
          this.pushActivity('description', 'updated the description');
          this.taskUpdated.emit();
        }
      },
      error: () => { this.descSaving = false; this.snackBar.open('Error', 'Close', { duration: 3000 }); }
    });
  }

  // ── SubTasks ──────────────────────────────────────────────────

  createSubTask(): void {
    if (!this.newSubTaskTitle.trim() || !this.task) return;
    this.backlogService.createSubTask(this.task.id, { title: this.newSubTaskTitle.trim() }).subscribe({
      next: (r: any) => {
        if (r.success) {
          this.subTasks = [...this.subTasks, {
            id: r.data.id,
            title: r.data.title,
            completed: false,
            status: 0,
            createdAt: new Date(r.data.createdAt)
          }];
          this.pushActivity('subtask', `added subtask "${r.data.title}"`);
          this.newSubTaskTitle = '';
          this.addingSubTask = false;
          this.snackBar.open('Subtask created', 'Close', { duration: 2000 });
        }
      },
      error: () => this.snackBar.open('Error', 'Close', { duration: 3000 })
    });
  }

  cycleSubTaskStatus(st: SubTask): void {
    if (!this.task) return;
    const nextStatus = ((st.status ?? 0) + 1) % 3 as 0 | 1 | 2;
    const isCompleted = nextStatus === 2;

    this.backlogService.updateSubTask(this.task.id, st.id, {
      isCompleted,
      status: nextStatus
    } as any).subscribe({
      next: (r: any) => {
        if (r.success) {
          st.status = nextStatus;
          st.completed = isCompleted;
          const labels = ['To do', 'In progress', 'Done'];
          this.pushActivity('subtask', `set "${st.title}" → ${labels[nextStatus]}`);
        }
      },
      error: () => this.snackBar.open('Error', 'Close', { duration: 3000 })
    });
  }

  getSubTaskStatusLabel(st: SubTask): string {
    return ['TO DO', 'IN PROGRESS', 'DONE'][st.status ?? 0];
  }

  getSubTaskStatusClass(st: SubTask): string {
    return ['st-tag--todo', 'st-tag--inprogress', 'st-tag--done'][st.status ?? 0];
  }

  startEditSubTask(st: SubTask): void {
    this.editingSubTaskId = st.id;
    this.editSubTaskTitle = st.title;
  }

  cancelSubTaskEdit(): void { this.editingSubTaskId = null; }

  saveSubTaskEdit(st: SubTask): void {
    const t = this.editSubTaskTitle.trim();
    if (t && t !== st.title && this.task) {
      this.backlogService.updateSubTask(this.task.id, st.id, { title: t }).subscribe({
        next: (r: any) => { if (r.success) st.title = t; },
        error: () => this.snackBar.open('Error', 'Close', { duration: 3000 })
      });
    }
    this.editingSubTaskId = null;
  }

  deleteSubTask(st: SubTask): void {
    if (!this.task) return;
    this.backlogService.deleteSubTask(this.task.id, st.id).subscribe({
      next: (r: any) => {
        if (r.success) {
          this.subTasks = this.subTasks.filter(s => s.id !== st.id);
          this.pushActivity('subtask', `deleted subtask "${st.title}"`);
          this.snackBar.open('Deleted', 'Close', { duration: 2000 });
        }
      },
      error: () => this.snackBar.open('Error', 'Close', { duration: 3000 })
    });
  }

  // ── Comments ──────────────────────────────────────────────────

  onCommentSaved(htmlContent: string): void {
    if (!this.task) return;
    this.taskService.addComment(this.task.id, htmlContent).subscribe({
      next: (r: any) => {
        if (r.success) {
          this.richComments = [...this.richComments, {
            id: r.data.id,
            content: htmlContent,
            authorId: this.currentUserId,
            authorName: this.currentUserName,
            authorInitial: this.currentUserInitial,
            createdAt: new Date(),
          }];
          this.richEditorRef?.resetEditor();
        }
      },
      error: () => this.snackBar.open('Error', 'Close', { duration: 3000 })
    });
  }

  onCommentDeleted(comment: RichComment): void {
    if (!this.task || !confirm('Delete this comment?')) return;
    this.taskService.deleteComment(this.task.id, comment.id).subscribe({
      next: (r: any) => {
        if (r.success) this.richComments = this.richComments.filter(c => c.id !== comment.id);
      }
    });
  }

  canDeleteComment(c: TaskComment): boolean {
    const u = this.authService.currentUser;
    return !!(u && (u.userId === c.authorId || this.authService.hasRole(['Admin'])));
  }

  // ── Delete task ───────────────────────────────────────────────

  confirmDelete(): void {
    if (!this.task || !confirm(`Delete "${this.task.title}"?`)) return;
    this.backlogService.deleteBacklogItem(this.task.id).subscribe({
      next: (r: any) => {
        if (r.success && this.task) {
          const id = this.task.id;
          this.snackBar.open('Task deleted', 'Close', { duration: 2000 });
          this.taskDeleted.emit(id);
          this.close();
        }
      },
      error: () => this.snackBar.open('Error', 'Close', { duration: 3000 })
    });
  }

  // ── Resize ────────────────────────────────────────────────────

  startResize(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();

    const panel = this.panelEl.nativeElement;
    const startX = event.clientX;
    const startWidth = panel.getBoundingClientRect().width;

    const onMove = (e: MouseEvent) => {
      e.preventDefault();
      const delta = startX - e.clientX;
      const newWidth = Math.min(Math.max(startWidth + delta, 380), window.innerWidth - 40);
      panel.style.width = newWidth + 'px';
      panel.style.transition = 'none';
    };

    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      panel.style.transition = 'transform .3s cubic-bezier(.4,0,.2,1)';
    };

    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  // ── Helpers ───────────────────────────────────────────────────

  private pushActivity(type: ActivityEntry['type'], message: string): void {
    this.activity.unshift({
      id: Date.now().toString(), type, message,
      authorName: this.currentUserName, createdAt: new Date()
    });
  }

  getStatusLabel(s: number): string { return ['TO DO', 'IN PROGRESS', 'DONE'][s] ?? 'TO DO'; }
  getPrioLabel(p: number): string { return this.priorities[p]?.label ?? 'Low'; }
  getPrioIcon(p: number): string { return this.priorities[p]?.icon ?? 'arrow_downward'; }
  close(): void { this.closed.emit(); }
  updateStatus(s: number): void { this.selectStatus(s); }
  updatePriority(p: number): void { this.selectPriority(p); }
}
