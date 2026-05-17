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

  // Main app routes
  {
    path: '',
    loadComponent: () => import('./shared/layouts/main-layout/main-layout.component').then(m => m.MainLayoutComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'projects',
        loadComponent: () => import('./features/projects/list/projects-list.component').then(m => m.ProjectsListComponent)
      },
      {
        path: 'workspaces',
        loadComponent: () => import('./features/workspaces/workspaces.component').then(m => m.WorkspacesComponent)
      },
      {
        path: 'workspaces/:id',
        loadComponent: () => import('./features/workspaces/workspace-detail.component').then(m => m.WorkspaceDetailComponent)
      },
      {
        path: 'projects/:projectId',
        loadComponent: () => import('./features/projects/detail/project-detail.component').then(m => m.ProjectDetailComponent)
      },
      {
        path: 'projects/:projectId/backlog',
        loadComponent: () => import('./features/backlog/view/backlog-view.component').then(m => m.BacklogViewComponent)
      },
      {
        path: 'projects/:projectId/inbox',
        loadComponent: () => import('./features/projects/inbox/project-inbox.component').then(m => m.ProjectInboxComponent)
      },
      {
        path: 'projects/:projectId/tasks',
        loadComponent: () => import('./features/tasks/list/tasks-list.component').then(m => m.TasksListComponent)
      },
      {
        path: 'projects/:projectId/tasks/:id',
        loadComponent: () => import('./features/tasks/detail/task-detail.component').then(m => m.TaskDetailComponent)
      },
      {
        path: 'projects/:projectId/sprints',
        loadComponent: () => import('./features/sprints/list/sprints-list.component').then(m => m.SprintsListComponent)
      },
      {
        path: 'projects/:projectId/board',
        loadComponent: () => import('./features/sprints/board/sprint-board.component').then(m => m.SprintBoardComponent)
      },
      {
        path: 'projects/:projectId/history',
        loadComponent: () => import('./features/sprints/history/sprint-history.component').then(m => m.SprintHistoryComponent)
      },
      {
        path: 'projects/:projectId/history/:sprintId',
        loadComponent: () => import('./features/sprints/history/details/sprint-detail.component').then(m => m.SprintDetailComponent)
      },
      {
        path: 'projects/:projectId/calendar',
        loadComponent: () => import('./features/meetings/meeting-calendar.component').then(m => m.MeetingCalendarComponent)
      },

      // ✅ NEW - Project team health page
      {
        path: 'projects/:projectId/team-health',
        loadComponent: () => import('./features/projects/team-health/team-health-page.component').then(m => m.TeamHealthPageComponent)
      },

      {
        path: 'tasks',
        loadComponent: () => import('./features/tasks/list/tasks-list.component').then(m => m.TasksListComponent)
      },
      {
        path: 'users',
        loadComponent: () => import('./features/users/list/users-list.component').then(m => m.UsersListComponent),
        canActivate: [roleGuard],
        data: { roles: ['Admin'] }
      },
    ]
  },

  { path: '**', redirectTo: '/dashboard' }
];
