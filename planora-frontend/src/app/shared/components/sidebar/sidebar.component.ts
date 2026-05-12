import { Component, OnInit, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd, RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { ProjectService } from '../../../core/services/project.service';
import { ApiResponse, Project } from '../../../core/models';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule
  ],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit {
  @Input() collapsed = false;

  authService = inject(AuthService);
  private projectService = inject(ProjectService);
  private router = inject(Router);

  currentProject: Project | null = null;
  showProjectNav = false;
  userName = '';
  userEmail = '';
  userInitials = '';
  backlogCount = 0;
  canSeeHealth = false; // ✅ AJOUT

  ngOnInit(): void {
    // ✅ Lire les rôles depuis localStorage
    try {
      const raw = localStorage.getItem('user_data');
      if (raw) {
        const stored = JSON.parse(raw);
        const roles: string[] = Array.isArray(stored.roles) ? stored.roles : [];
        this.canSeeHealth = roles.includes('Admin') || roles.includes('ProjectManager');
        this.userName = stored.fullName || 'Utilisateur';
        this.userEmail = stored.email || '';
        this.userInitials = this.userName.charAt(0).toUpperCase();
      }
    } catch { }

    // Check immédiat au chargement
    this.checkUrl(this.router.url);

    // Check à chaque navigation
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.checkUrl(this.router.url); // ← cette ligne manquait !
    });
  }
  // ← AJOUTE cette méthode
  private checkUrl(url: string): void {
    this.showProjectNav = url.includes('/projects/') &&
      !url.includes('/projects/list') &&
      !url.match(/\/projects\/?$/);

    if (this.showProjectNav) {
      const projectId = this.extractProjectId(url);
      if (projectId) {
        this.loadProject(projectId);
      }
    } else {
      this.currentProject = null;
    }
  }
  private extractProjectId(url: string): string | null {
    const match = url.match(/\/projects\/([^\/]+)/);
    const projectId = match ? match[1] : null;
    if (!projectId || projectId === 'null' || projectId === 'undefined') {
      return null;
    }
    return projectId;
  }

  private loadProject(projectId: string): void {
    this.projectService.getProject(projectId).subscribe({
      next: (response: ApiResponse<Project>) => {
        if (response.success) {
          this.currentProject = response.data;
        }
      },
      error: (err: unknown) => {
        console.error('Erreur chargement projet', err);
      }
    });
  }

  getProjectColor(): string {
    return '#dc2626';
  }

  goToAllTasks(): void {
    this.router.navigate(['/tasks/all']);
  }

  logout(): void {
    this.authService.logout();
  }
}
