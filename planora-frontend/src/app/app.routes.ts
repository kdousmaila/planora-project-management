import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },

  // Auth routes
  {
    path: 'auth',
    loadComponent: () => import('./shared/layouts/auth-layout/auth-layout.component').then(m => m.AuthLayoutComponent),
    children: [
      { path: 'login', loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent) },
      { path: 'register', loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent) }
    ]
  },

  // Main app routes (avec MainLayout qui contient navbar + sidebar)
  {
    path: '',
    loadComponent: () => import('./shared/layouts/main-layout/main-layout.component').then(m => m.MainLayoutComponent),
    canActivate: [authGuard],
    children: [
      // Dashboard
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },

      // Projects list
      {
        path: 'projects',
        loadComponent: () => import('./features/projects/list/projects-list.component').then(m => m.ProjectsListComponent)
      },

      // Workspaces list
      {
        path: 'workspaces',
        loadComponent: () => import('./features/workspaces/workspaces.component').then(m => m.WorkspacesComponent)
      },

      // ✅ AJOUTER CETTE ROUTE - Workspace detail (DOIT être AVANT projects/:projectId)
      {
        path: 'workspaces/:id',
        loadComponent: () => import('./features/workspaces/workspace-detail.component').then(m => m.WorkspaceDetailComponent)
      },

      // Project detail (page d'accueil du projet)
      {
        path: 'projects/:projectId',
        loadComponent: () => import('./features/projects/detail/project-detail.component').then(m => m.ProjectDetailComponent)
      },

      // Backlog (vue améliorée)
      {
        path: 'projects/:projectId/backlog',
        loadComponent: () => import('./features/backlog/view/backlog-view.component').then(m => m.BacklogViewComponent)
      },

      {
        path: 'projects/:projectId/inbox',
        loadComponent: () => import('./features/projects/inbox/project-inbox.component').then(m => m.ProjectInboxComponent)
      },

      // Tasks
      {
        path: 'projects/:projectId/tasks',
        loadComponent: () => import('./features/tasks/list/tasks-list.component').then(m => m.TasksListComponent)
      },
      {
        path: 'projects/:projectId/tasks/:id',
        loadComponent: () => import('./features/tasks/detail/task-detail.component').then(m => m.TaskDetailComponent)
      },

      // Sprints
      {
        path: 'projects/:projectId/sprints',
        loadComponent: () => import('./features/sprints/list/sprints-list.component').then(m => m.SprintsListComponent)
      },

      // Sprint Board (vue kanban)
      {
        path: 'projects/:projectId/board',
        loadComponent: () => import('./features/sprints/board/sprint-board.component').then(m => m.SprintBoardComponent)
      },

      // Sprint History (liste des sprints terminés)
      {
        path: 'projects/:projectId/history',
        loadComponent: () => import('./features/sprints/history/sprint-history.component').then(m => m.SprintHistoryComponent)
      },

      // Sprint Detail (détails d'un sprint terminé avec tableau des tickets)
      {
        path: 'projects/:projectId/history/:sprintId',
        loadComponent: () => import('./features/sprints/history/details/sprint-detail.component').then(m => m.SprintDetailComponent)
      },

      {
        path: 'tasks',
        loadComponent: () => import('./features/tasks/list/tasks-list.component').then(m => m.TasksListComponent)
      },

      // Users (admin only)
      {
        path: 'users',
        loadComponent: () => import('./features/users/list/users-list.component').then(m => m.UsersListComponent),
        canActivate: [roleGuard],
        data: { roles: ['Admin'] }
      },
      {
        path: 'projects/:projectId/calendar',
        loadComponent: () => import('./features/meetings/meeting-calendar.component').then(m => m.MeetingCalendarComponent)
      },
    ]
  },

  // Fallback
  { path: '**', redirectTo: '/dashboard' }
];
