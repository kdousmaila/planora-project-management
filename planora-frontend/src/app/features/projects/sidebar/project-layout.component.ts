import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { ProjectService } from '../../../core/services/project.service';
import { ApiResponse, Project } from '../../../core/models';

@Component({
  selector: 'app-project-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './project-sidebar.component.html',
  styleUrls: ['./project-sidebar.component.scss']
})
export class ProjectSidebarComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private projectService = inject(ProjectService);
  private router = inject(Router);
  private userSub?: Subscription;

  currentProject: Project | null = null;
  userName = '';
  userEmail = '';
  userInitials = '';
  collapsed = false;

  isAdmin = false;
  isPM = false;
  canSeeHealth = false;

  ngOnInit(): void {
    // ✅ FIX — lire directement localStorage
    try {
      const raw = localStorage.getItem('user_data');
      if (raw) {
        const stored = JSON.parse(raw);
        const roles: string[] = Array.isArray(stored.roles) ? stored.roles : [];
        this.userName = stored.fullName || 'Utilisateur';
        this.userEmail = stored.email || '';
        this.userInitials = this.userName.charAt(0).toUpperCase();
        this.isAdmin = roles.includes('Admin');
        this.isPM = roles.includes('ProjectManager');
        this.canSeeHealth = this.isAdmin || this.isPM;
      }
    } catch { }

    // ✅ S'abonner à user$ pour les mises à jour en temps réel
    this.userSub = this.authService.user$.subscribe(user => {
      if (user) {
        const roles: string[] = Array.isArray(user.roles) ? user.roles : [];
        this.userName = user.fullName || 'Utilisateur';
        this.userEmail = user.email || '';
        this.userInitials = this.userName.charAt(0).toUpperCase();
        this.isAdmin = roles.includes('Admin');
        this.isPM = roles.includes('ProjectManager');
        this.canSeeHealth = this.isAdmin || this.isPM;
      }
    });

    // Charge le projet dès le démarrage
    const projectId = this.extractProjectId(this.router.url);
    if (projectId) {
      this.loadProject(projectId);
    }

    // Écoute les navigations
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      const id = this.extractProjectId(event.urlAfterRedirects || event.url);
      if (id) {
        this.loadProject(id);
      } else {
        this.currentProject = null;
      }
    });
  }
  ngOnDestroy(): void {
    this.userSub?.unsubscribe();
  }

  private extractProjectId(url: string): string | null {
    const match = url.match(/\/projects\/([^\/]+)/);
    const id = match ? match[1] : null;
    if (!id || id === 'null' || id === 'undefined') return null;
    return id;
  }

  private loadProject(projectId: string): void {
    if (this.currentProject?.id === projectId) return;
    this.projectService.getProject(projectId).subscribe({
      next: (response: ApiResponse<Project>) => {
        if (response.success) this.currentProject = response.data;
      },
      error: () => { this.currentProject = null; }
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
