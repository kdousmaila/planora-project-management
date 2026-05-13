import { Component, EventEmitter, OnInit, inject, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router, NavigationEnd } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { WorkspaceInvitation } from '../../../core/models';
import { WorkspaceService } from '../../../core/services/workspace.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatTooltipModule,
    MatBadgeModule
  ],
  template: `
    <header class="navbar">

      <!-- LEFT -->
      <div class="navbar-left">
        <button class="toggle-btn" (click)="toggleSidebar.emit()" matTooltip="Toggle sidebar">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>

        <nav class="breadcrumb" aria-label="breadcrumb">
          @for (crumb of breadcrumbs; track crumb.label; let last = $last) {
            @if (!last) {
              <span class="crumb-item">{{ crumb.label }}</span>
              <svg class="crumb-sep" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            } @else {
              <span class="crumb-item crumb-active">{{ crumb.label }}</span>
            }
          }
        </nav>
      </div>

      <!-- RIGHT -->
      <div class="navbar-right">

        <!-- Search -->
      

        <!-- Notifications -->
        @if (authService.user$ | async; as user) {
          <div class="icon-btn" [matMenuTriggerFor]="invitationsMenu" matTooltip="Invitations">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            @if (pendingInvitations.length) {
              <span class="notif-dot">{{ pendingInvitations.length }}</span>
            }
          </div>
        }

        <div class="nav-divider"></div>

        <!-- User chip -->
        @if (authService.user$ | async; as user) {
          <div class="user-chip" [matMenuTriggerFor]="userMenu">
            <div class="user-avatar">{{ getInitials(user.fullName) }}</div>
            <div class="user-chip-info">
              <span class="user-chip-name">{{ user.fullName }}</span>
              @if (user.roles.length) {
                <span class="user-chip-role">{{ user.roles[0] }}</span>
              }
            </div>
            <svg class="chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
        }

        <!-- Invitations menu -->
        <mat-menu #invitationsMenu="matMenu" class="planora-menu">
          <div class="menu-header" (click)="$event.stopPropagation()">
            <span class="menu-title">Pending Invitations</span>
            @if (pendingInvitations.length) {
              <span class="menu-badge">{{ pendingInvitations.length }}</span>
            }
          </div>
          @if (pendingInvitations.length === 0) {
            <div class="menu-empty" (click)="$event.stopPropagation()">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07"/>
                <path d="M1 1l22 22"/>
              </svg>
              <span>No invitations</span>
            </div>
          }
          @for (invitation of pendingInvitations; track invitation.id) {
            <div class="invite-item" (click)="$event.stopPropagation()">
              <div class="invite-dot">{{ invitation.workspaceName?.charAt(0)?.toUpperCase() }}</div>
              <div class="invite-info">
                <strong>{{ invitation.workspaceName }}</strong>
                <span>{{ invitation.email }}</span>
              </div>
              <div class="invite-actions">
                <button class="btn-accept" (click)="acceptInvitation(invitation)">Accept</button>
                <button class="btn-reject" (click)="rejectInvitation(invitation)">Decline</button>
              </div>
            </div>
          }
        </mat-menu>

        <!-- User menu -->
        <mat-menu #userMenu="matMenu" class="planora-menu">
          <div class="menu-user-card" (click)="$event.stopPropagation()">
            @if (authService.user$ | async; as user) {
              <div class="menu-avatar">{{ getInitials(user.fullName) }}</div>
              <div>
                <div class="menu-user-name">{{ user.fullName }}</div>
                <div class="menu-user-email">{{ user.email }}</div>
              </div>
            }
          </div>
          <div class="menu-divider"></div>
          <button mat-menu-item class="menu-item menu-item--danger" (click)="logout()">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            <span>Sign out</span>
          </button>
        </mat-menu>

      </div>
    </header>
  `,
  styles: [`
    /* ── NAVBAR ── */
    .navbar {
      position: fixed; top: 0; left: 0; right: 0; z-index: 200;
      height: 60px;
      background: #ffffff;
      border-bottom: 1px solid #e8edf2;
      box-shadow: 0 1px 4px rgba(0,0,0,0.04);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 20px 0 16px;
      font-family: 'Segoe UI', system-ui, sans-serif;
    }

    /* LEFT */
    .navbar-left { display: flex; align-items: center; gap: 8px; }

    .toggle-btn {
      width: 34px; height: 34px;
      border-radius: 8px;
      border: none; background: transparent;
      display: flex; align-items: center; justify-content: center;
      color: #6b7280; cursor: pointer;
      transition: background 0.15s, color 0.15s;
      flex-shrink: 0;
    }
    .toggle-btn:hover { background: #f3f4f6; color: #374151; }

    .breadcrumb {
      display: flex; align-items: center; gap: 4px;
      font-size: 13px;
    }
    .crumb-item { color: #9ca3af; font-weight: 500; }
    .crumb-active { color: #0f172a; font-weight: 600; }
    .crumb-sep { color: #d1d5db; flex-shrink: 0; }

    /* RIGHT */
    .navbar-right { display: flex; align-items: center; gap: 8px; }

    .search-bar {
      display: flex; align-items: center; gap: 8px;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 0 10px 0 12px;
      height: 34px;
      font-size: 13px; color: #9ca3af;
      cursor: pointer;
      transition: border-color 0.15s, background 0.15s;
      min-width: 200px;
      user-select: none;
    }
    .search-bar:hover { border-color: #c7d2fe; background: #fafbff; color: #6b7280; }
    .search-bar span { flex: 1; }
    .search-bar kbd {
      font-size: 11px; color: #d1d5db;
      background: #f3f4f6;
      padding: 1px 6px; border-radius: 4px;
      font-family: inherit;
      border: 1px solid #e5e7eb;
    }

    .icon-btn {
      width: 34px; height: 34px; border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      color: #6b7280; cursor: pointer;
      transition: background 0.15s, color 0.15s;
      position: relative;
    }
    .icon-btn:hover { background: #f3f4f6; color: #374151; }

    .notif-dot {
      position: absolute; top: 4px; right: 4px;
      min-width: 14px; height: 14px;
      background: #ef4444; color: white;
      font-size: 9px; font-weight: 700;
      border-radius: 10px;
      border: 1.5px solid white;
      display: flex; align-items: center; justify-content: center;
      padding: 0 3px;
    }

    .nav-divider { width: 1px; height: 22px; background: #e5e7eb; margin: 0 4px; }

    .user-chip {
      display: flex; align-items: center; gap: 8px;
      padding: 4px 8px 4px 4px;
      border-radius: 10px; cursor: pointer;
      transition: background 0.15s;
      border: 1px solid transparent;
    }
    .user-chip:hover { background: #f3f4f6; border-color: #e5e7eb; }

    .user-avatar {
      width: 30px; height: 30px; border-radius: 50%;
      background: linear-gradient(135deg, #4f46e5, #06b6d4);
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 700; color: white;
      flex-shrink: 0;
    }

    .user-chip-info {
      display: flex; flex-direction: column;
      @media (max-width: 640px) { display: none; }
    }
    .user-chip-name { font-size: 12.5px; font-weight: 600; color: #0f172a; line-height: 1.25; }
    .user-chip-role {
      font-size: 10px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.06em;
      background: #ede9fe; color: #7c3aed;
      border-radius: 4px; padding: 1px 5px;
      width: fit-content; line-height: 1.5;
    }
    .chevron { color: #9ca3af; flex-shrink: 0; }

    /* ── MENUS ── */
    ::ng-deep .planora-menu {
      .mat-mdc-menu-panel {
        border-radius: 12px !important;
        box-shadow: 0 8px 30px rgba(0,0,0,0.12) !important;
        border: 1px solid #e8edf2 !important;
        min-width: 260px !important;
        padding: 0 !important;
        overflow: hidden !important;
      }
      .mat-mdc-menu-content { padding: 0 !important; }
    }

    .menu-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 16px;
      border-bottom: 1px solid #f1f5f9;
    }
    .menu-title { font-size: 12px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.06em; }
    .menu-badge {
      background: #fee2e2; color: #ef4444;
      font-size: 10px; font-weight: 700;
      padding: 1px 6px; border-radius: 10px;
    }

    .menu-empty {
      display: flex; flex-direction: column; align-items: center; gap: 8px;
      padding: 24px 16px;
      color: #9ca3af; font-size: 13px;
    }

    .invite-item {
      display: flex; align-items: center; gap: 10px;
      padding: 12px 16px;
      border-bottom: 1px solid #f8fafc;
      transition: background 0.12s;
    }
    .invite-item:hover { background: #fafbff; }

    .invite-dot {
      width: 32px; height: 32px; border-radius: 8px;
      background: linear-gradient(135deg, #4f46e5, #a855f7);
      color: white; font-size: 13px; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }

    .invite-info {
      flex: 1; min-width: 0;
      display: flex; flex-direction: column; gap: 1px;
      strong { font-size: 13px; font-weight: 600; color: #0f172a; }
      span { font-size: 11px; color: #94a3b8; }
    }

    .invite-actions { display: flex; gap: 6px; flex-shrink: 0; }
    .btn-accept, .btn-reject {
      padding: 4px 10px; border-radius: 6px; border: none;
      font-size: 11.5px; font-weight: 600; cursor: pointer;
      transition: opacity 0.15s;
    }
    .btn-accept { background: #d1fae5; color: #059669; }
    .btn-accept:hover { background: #a7f3d0; }
    .btn-reject { background: #fee2e2; color: #ef4444; }
    .btn-reject:hover { background: #fecaca; }

    .menu-user-card {
      display: flex; align-items: center; gap: 10px;
      padding: 14px 16px;
      border-bottom: 1px solid #f1f5f9;
    }
    .menu-avatar {
      width: 36px; height: 36px; border-radius: 50%;
      background: linear-gradient(135deg, #4f46e5, #06b6d4);
      display: flex; align-items: center; justify-content: center;
      font-size: 13px; font-weight: 700; color: white; flex-shrink: 0;
    }
    .menu-user-name { font-size: 13.5px; font-weight: 600; color: #0f172a; }
    .menu-user-email { font-size: 11.5px; color: #9ca3af; }

    .menu-divider { height: 1px; background: #f1f5f9; }

    .menu-item {
      display: flex !important; align-items: center !important; gap: 10px !important;
      padding: 10px 16px !important;
      font-size: 13.5px !important; font-weight: 500 !important; color: #374151 !important;
    }
    .menu-item:hover { background: #f9fafb !important; }
    .menu-item--danger { color: #ef4444 !important; }
    .menu-item--danger:hover { background: #fef2f2 !important; }
  `]
})
export class NavbarComponent implements OnInit {
  authService = inject(AuthService);
  private workspaceService = inject(WorkspaceService);
  private router = inject(Router);

  @Output() toggleSidebar = new EventEmitter<void>();

  pendingInvitations: WorkspaceInvitation[] = [];
  breadcrumbs: { label: string; url?: string }[] = [];

  private readonly routeLabels: Record<string, string> = {
    'dashboard': 'Dashboard',
    'workspaces': 'Workspaces',
    'projects': 'Projects',
    'users': 'Users',
    'backlog': 'Backlog',
    'board': 'Kanban Board',
    'tasks': 'Tasks',
    'history': 'History',
  };

  ngOnInit(): void {
    this.loadPendingInvitations();
    this.updateBreadcrumbs(this.router.url);

    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe((e: any) => this.updateBreadcrumbs(e.urlAfterRedirects));
  }

  private updateBreadcrumbs(url: string): void {
    const segments = url.split('/').filter(s => s && !this.isId(s));
    if (segments.length === 0) {
      this.breadcrumbs = [{ label: 'Dashboard' }];
      return;
    }
    this.breadcrumbs = segments.map(s => ({
      label: this.routeLabels[s.toLowerCase()] ?? this.capitalize(s)
    }));
  }

  private isId(segment: string): boolean {
    return /^[0-9a-f-]{8,}$/i.test(segment) || /^\d+$/.test(segment);
  }

  private capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  loadPendingInvitations(): void {
    this.workspaceService.getPendingInvitations().subscribe({
      next: response => {
        if (response.success) this.pendingInvitations = response.data;
      }
    });
  }

  logout(): void {
    this.authService.logout();
  }

  acceptInvitation(invitation: WorkspaceInvitation): void {
    this.workspaceService.acceptInvitation(invitation.id).subscribe({
      next: response => {
        if (response.success) {
          this.loadPendingInvitations();
          this.workspaceService.workspaceListChanged$.next();
        }
      }
    });
  }

  rejectInvitation(invitation: WorkspaceInvitation): void {
    this.workspaceService.rejectInvitation(invitation.id).subscribe({
      next: response => {
        if (response.success) this.loadPendingInvitations();
      }
    });
  }

  getInitials(name: string): string {
    if (!name) return '?';
    return name.split(' ').filter(n => n).map(n => n[0]).slice(0, 2).join('').toUpperCase();
  }
}
