// src/app/features/backlog/view/backlog-view.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';
import { BacklogService } from '../../../core/services/backlog.service';
import { SprintService } from '../../../core/services/sprint.service';
import { AuthService } from '../../../core/services/auth.service';
import { ProjectService } from '../../../core/services/project.service';
import { ApiResponse, BacklogItem, TaskPriority, TaskStatus, Sprint, SprintStatus } from '../../../core/models';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { AssignUserDialogComponent } from './assign-user-dialog.component';
import { StoryPointsDialogComponent } from './story-points-dialog.component';
import { BacklogCreateDialogComponent } from '../create/backlog-create-dialog.component';
import { CreateSprintDialogComponent } from './create-sprint-dialog.component';
import { ComplexityDialogComponent } from './complexity-dialog.component';
import { TaskDetailPanelComponent } from './task-detail-panel/task-detail-panel.component';
import { ChatBubbleComponent } from './chat-bubble/chat-bubble.component';
import { MeetingCalendarComponent } from '../../meetings/meeting-calendar.component';

@Component({
  selector: 'app-backlog-view',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    MatTooltipModule,
    MatMenuModule,
    MatDividerModule,
    DragDropModule,
    LoadingComponent,
    TaskDetailPanelComponent,
    ChatBubbleComponent
  ],
  templateUrl: './backlog-view.component.html',
  styleUrls: ['./backlog-view.component.scss']
})
export class BacklogViewComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private backlogService = inject(BacklogService);
  private sprintService = inject(SprintService);
  private authService = inject(AuthService);
  private projectService = inject(ProjectService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  projectId = '';
  backlogItems: BacklogItem[] = [];
  sprints: Sprint[] = [];
  sprintItemsMap: Map<string, BacklogItem[]> = new Map();
  loading = true;

  selectedTaskId: string | null = null;
  isPanelOpen = false;

  private openSections = new Set<string>(['backlog']);

  get canManage(): boolean {
    return this.authService.hasRole(['Admin', 'ProjectManager']);
  }

  ngOnInit(): void {
    this.projectId = this.route.snapshot.paramMap.get('projectId')!;
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.sprintService.getSprintsByProject(this.projectId).subscribe({
      next: (response: ApiResponse<Sprint[]>) => {
        if (response.success) {
          this.sprints = response.data.filter((s: Sprint) => s.status === SprintStatus.Planning);
          this.sprints.forEach(s => {
            this.sprintItemsMap.set(s.id, []);
            this.openSections.add(s.id);
          });
        }
        this.loadBacklogItems();
      },
      error: () => this.loadBacklogItems()
    });
  }

  loadBacklogItems(): void {
    this.backlogService.getBacklogByProject(this.projectId).subscribe({
      next: (response: ApiResponse<BacklogItem[]>) => {
        this.loading = false;
        if (response.success) {
          this.projectService.getProject(this.projectId).subscribe({
            next: (r: ApiResponse<any>) => {
              const members = r.success ? (r.data.members ?? []) : [];

              const enriched = response.data.map((item: BacklogItem) => ({
                ...item,
                assignedToName: members.find((m: any) => m.userId === item.assignedToId)?.fullName ?? undefined
              }));

              this.backlogItems = enriched
                .filter((item: BacklogItem) => !item.sprintId)
                .sort((a: BacklogItem, b: BacklogItem) =>
                  new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
                );

              this.sprints.forEach(sprint => {
                this.sprintItemsMap.set(
                  sprint.id,
                  enriched.filter((item: BacklogItem) => item.sprintId === sprint.id)
                );
              });
            },
            error: () => {
              this.backlogItems = response.data
                .filter((item: BacklogItem) => !item.sprintId)
                .sort((a: BacklogItem, b: BacklogItem) =>
                  new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
                );
              this.sprints.forEach(sprint => {
                this.sprintItemsMap.set(
                  sprint.id,
                  response.data.filter((item: BacklogItem) => item.sprintId === sprint.id)
                );
              });
            }
          });
        }
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Loading error', 'Close', { duration: 3000 });
      }
    });
  }

  // ===== PANEL =====
  openTaskPanel(item: BacklogItem): void {
    this.selectedTaskId = item.id;
    this.isPanelOpen = true;
  }

  closeTaskPanel(): void {
    this.isPanelOpen = false;
    this.selectedTaskId = null;
  }

  onTaskDeleted(taskId: string): void {
    this.backlogItems = this.backlogItems.filter(i => i.id !== taskId);
    this.sprints.forEach(s => {
      const list = this.sprintItemsMap.get(s.id);
      if (list) this.sprintItemsMap.set(s.id, list.filter(i => i.id !== taskId));
    });
    this.sprintItemsMap = new Map(this.sprintItemsMap);
  }

  // ===== MEETING CALENDAR =====
  openMeetingCalendar(): void {
    this.dialog.open(MeetingCalendarComponent, {
      width: '1000px',
      maxWidth: '95vw',
      panelClass: 'meeting-calendar-dialog',
      data: { projectId: this.projectId }
    });
  }

  // ===== SECTION TOGGLE =====
  toggleSprint(id: string): void {
    if (this.openSections.has(id)) {
      this.openSections.delete(id);
    } else {
      this.openSections.add(id);
    }
  }

  isSectionOpen(id: string): boolean {
    return this.openSections.has(id);
  }

  // ===== SPRINT HELPERS =====
  getSprintItems(sprintId: string): BacklogItem[] {
    return this.sprintItemsMap.get(sprintId) ?? [];
  }

  getSprintListIds(): string[] {
    return this.sprints.map(s => 'sprint-' + s.id);
  }

  getSprintTicketsByStatus(sprintId: string, status: number): number {
    return this.getSprintItems(sprintId).filter(i => i.status === status).length;
  }

  getBacklogTicketsByStatus(status: number): number {
    return this.backlogItems.filter(i => i.status === status).length;
  }

  getSprintDotClass(status: number): string {
    return ['dot-planning', 'dot-active', 'dot-closed'][status] ?? 'dot-planning';
  }

  // ===== DRAG & DROP =====
  onDrop(event: CdkDragDrop<BacklogItem[]>, targetId: string): void {
    if (event.previousContainer === event.container) return;

    const item: BacklogItem = event.item.data;
    const isMovingToBacklog = targetId === 'backlog-list';
    const destinationSprintId = isMovingToBacklog ? null : targetId.replace('sprint-', '');

    if (event.previousContainer.id === 'backlog-list') {
      this.backlogItems = this.backlogItems.filter(i => i.id !== item.id);
    } else {
      const sourceSprintId = event.previousContainer.id.replace('sprint-', '');
      const sourceList = this.sprintItemsMap.get(sourceSprintId);
      if (sourceList) {
        const idx = sourceList.findIndex(i => i.id === item.id);
        if (idx !== -1) sourceList.splice(idx, 1);
      }
    }

    if (isMovingToBacklog) {
      item.sprintId = null;
      this.backlogItems = [...this.backlogItems, item]
        .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
    } else {
      item.sprintId = destinationSprintId;
      item.status = TaskStatus.Todo;
      const destList = this.sprintItemsMap.get(destinationSprintId!);
      if (destList) destList.push(item);
    }

    this.sprintItemsMap = new Map(this.sprintItemsMap);

    const call$ = isMovingToBacklog
      ? this.backlogService.removeFromSprint(item.id)
      : this.backlogService.moveToSprint(item.id, destinationSprintId!);

    call$.subscribe({
      error: () => {
        this.loadData();
        this.snackBar.open('Sync error', 'Close', { duration: 3000 });
      }
    });

    if (isMovingToBacklog) {
      this.snackBar.open('↩️ Moved back to backlog', 'Close', { duration: 2000 });
    } else {
      const sprint = this.sprints.find(s => s.id === destinationSprintId);
      this.snackBar.open(`✅ Moved to ${sprint?.name}`, 'Close', { duration: 2000 });
    }
  }

  // ===== STATUS =====
  changeStatus(item: BacklogItem, status: number): void {
    item.status = status;
    this.backlogService.updateBacklogItemStatus(item.id, status).subscribe({
      error: () => this.snackBar.open('Status update error', 'Close', { duration: 3000 })
    });
  }

  getStatusLabel(status: number): string {
    return ['TO DO', 'IN PROGRESS', 'DONE'][status] ?? 'TO DO';
  }

  getStatusPillClass(status: number): string {
    return ['status-todo', 'status-inprogress', 'status-done'][status] ?? 'status-todo';
  }

  // ===== PRIORITY =====
  getPriorityLabel(priority: TaskPriority): string {
    return ['Low', 'Medium', 'High', 'Critical'][priority] ?? '';
  }

  getPriorityDotClass(priority: TaskPriority): string {
    return ['dot-low', 'dot-medium', 'dot-high', 'dot-critical'][priority] ?? 'dot-low';
  }

  // ===== COMPLEXITY =====
  getPriorityClass(priority: TaskPriority): string {
    return ['priority-low', 'priority-medium', 'priority-high', 'priority-critical'][priority] ?? '';
  }

  getComplexityLabel(complexity: number): string {
    return ['XS', 'S', 'M', 'L', 'XL'][complexity] ?? 'M';
  }

  getComplexityClass(complexity: number): string {
    return ['complexity-xs', 'complexity-s', 'complexity-m', 'complexity-l', 'complexity-xl'][complexity] ?? 'complexity-m';
  }

  getComplexityTextLabel(complexity: number): string {
    return ['Very Easy', 'Easy', 'Medium', 'Hard', 'Very Hard'][complexity] ?? 'Medium';
  }

  getComplexityTextClass(complexity: number): string {
    return ['complexity-xs', 'complexity-s', 'complexity-m', 'complexity-l', 'complexity-xl'][complexity] ?? 'complexity-m';
  }

  // ===== STORY POINTS =====
  setStoryPoints(item: BacklogItem): void {
    const ref = this.dialog.open(StoryPointsDialogComponent, {
      width: '380px',
      data: { currentPoints: item.storyPoints ?? null }
    });
    ref.afterClosed().subscribe((points: number | null | undefined) => {
      if (points === undefined) return;
      this.backlogService.updateComplexity(item.id, points ?? 0).subscribe({
        next: (response: ApiResponse<BacklogItem>) => {
          if (response.success) {
            item.storyPoints = points;
            const label = points === -1 ? 'Not estimated' : `${points} pts`;
            this.snackBar.open(`⏱️ Estimate: ${label}`, 'Close', { duration: 2000 });
          }
        },
        error: () => this.snackBar.open('❌ Update error', 'Close', { duration: 3000 })
      });
    });
  }

  getStoryPointsLabel(item: BacklogItem): string {
    const pts = item.storyPoints;
    if (pts === null || pts === undefined) return '';
    if (pts === -1) return '?';
    return `${pts} pts`;
  }

  // ===== COMPLEXITY DIALOG =====
  openSetComplexity(item: BacklogItem): void {
    const ref = this.dialog.open(ComplexityDialogComponent, {
      width: '380px',
      data: { currentComplexity: item.complexity ?? 2 }
    });
    ref.afterClosed().subscribe((complexity: number | null | undefined) => {
      if (complexity === undefined) return;
      this.backlogService.updateComplexity(item.id, complexity ?? 0).subscribe({
        next: (response: ApiResponse<BacklogItem>) => {
          if (response.success) {
            item.complexity = complexity ?? 0;
            this.snackBar.open(`📊 Complexity: ${this.getComplexityTextLabel(item.complexity)}`, 'Close', { duration: 2000 });
            this.loadData();
          }
        },
        error: () => this.snackBar.open('❌ Complexity update error', 'Close', { duration: 3000 })
      });
    });
  }

  // ===== SPRINT STATUS =====
  getSprintStatusLabel(status: number): string {
    return ['Planning', 'Active', 'Closed'][status] ?? '';
  }

  getSprintStatusClass(status: number): string {
    return ['status-planning', 'status-active', 'status-closed'][status] ?? '';
  }

  // ===== AVATAR =====
  getInitials(item: BacklogItem): string {
    if (item.assignedToName) {
      const parts = item.assignedToName.trim().split(' ');
      const first = parts[0]?.[0] ?? '';
      const last = parts[1]?.[0] ?? '';
      return (first + last).toUpperCase();
    }
    return item.assignedToId?.slice(0, 2).toUpperCase() ?? '';
  }

  // ===== ACTIONS =====
  createNewSprint(): void {
    const ref = this.dialog.open(CreateSprintDialogComponent, {
      width: '550px',
      data: { projectId: this.projectId }
    });
    ref.afterClosed().subscribe((result: boolean | undefined) => {
      if (result) {
        this.loadData();
        this.snackBar.open('Sprint created!', 'Close', { duration: 3000 });
      }
    });
  }

  startSprint(sprintId: string): void {
    this.sprintService.startSprint(sprintId).subscribe({
      next: (response: ApiResponse<Sprint>) => {
        if (response.success) {
          this.router.navigate(['/projects', this.projectId, 'board'], { queryParams: { sprintId } });
          this.snackBar.open('Sprint started!', 'Close', { duration: 3000 });
        } else {
          this.snackBar.open('Error starting sprint', 'Close', { duration: 3000 });
        }
      },
      error: () => this.snackBar.open('Error starting sprint', 'Close', { duration: 3000 })
    });
  }

  openCreate(sprintId?: string): void {
    const ref = this.dialog.open(BacklogCreateDialogComponent, {
      width: '550px',
      data: { projectId: this.projectId, sprintId: sprintId ?? null }
    });
    ref.afterClosed().subscribe((result: boolean | undefined) => {
      if (result) this.loadData();
    });
  }

  editItem(item: BacklogItem): void {
    const ref = this.dialog.open(BacklogCreateDialogComponent, {
      width: '550px',
      data: { projectId: this.projectId, item }
    });
    ref.afterClosed().subscribe((result: boolean | undefined) => {
      if (result) this.loadData();
    });
  }

  deleteItem(item: BacklogItem): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: { title: 'Delete', message: `Delete "${item.title}"?`, confirmLabel: 'Delete', danger: true }
    });
    ref.afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed) return;
      this.backlogService.deleteBacklogItem(item.id).subscribe({
        next: (response: ApiResponse<boolean>) => {
          if (response.success) {
            this.backlogItems = this.backlogItems.filter(i => i.id !== item.id);
            this.snackBar.open('Ticket deleted', 'Close', { duration: 2000 });
          }
        },
        error: () => this.snackBar.open('Error deleting ticket', 'Close', { duration: 3000 })
      });
    });
  }

  assignTask(item: BacklogItem): void {
    const ref = this.dialog.open(AssignUserDialogComponent, {
      width: '400px',
      data: { itemId: item.id, projectId: this.projectId, currentUserId: item.assignedToId }
    });
    ref.afterClosed().subscribe((userId: string | null | undefined) => {
      if (userId !== undefined) {
        this.backlogService.assignToUser(item.id, userId).subscribe({
          next: (response: ApiResponse<BacklogItem>) => {
            if (response.success) {
              item.assignedToId = userId || undefined;
              this.projectService.getProject(this.projectId).subscribe({
                next: (r: ApiResponse<any>) => {
                  if (r.success) {
                    const member = r.data.members?.find((m: any) => m.userId === userId);
                    item.assignedToName = member?.fullName ?? undefined;
                  }
                }
              });
              this.snackBar.open('✅ Task assigned!', 'Close', { duration: 2000 });
            }
          },
          error: () => this.snackBar.open('❌ Assignment error', 'Close', { duration: 3000 })
        });
      }
    });
  }

  getBacklogStoryPointsByStatus(status: number): number {
    return this.backlogItems
      .filter(i => i.status === status)
      .reduce((sum, item) => sum + (item.storyPoints ?? item.complexity ?? 0), 0);
  }

  getSprintStoryPointsByStatus(sprintId: string, status: number): number {
    return this.getSprintItems(sprintId)
      .filter(i => i.status === status)
      .reduce((sum, item) => sum + (item.storyPoints ?? item.complexity ?? 0), 0);
  }

  getSprintTotalStoryPoints(sprintId: string): number {
    return this.getSprintItems(sprintId)
      .reduce((sum, item) => sum + (item.storyPoints ?? item.complexity ?? 0), 0);
  }

  getBacklogTotalStoryPoints(): number {
    return this.backlogItems
      .reduce((sum, item) => sum + (item.storyPoints ?? item.complexity ?? 0), 0);
  }

  goToHistory(): void {
    this.router.navigate(['/projects', this.projectId, 'history']);
  }
}
