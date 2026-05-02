import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, AuthResponse, LoginRequest, RegisterRequest, UserData } from '../models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private apiUrl = `${environment.apiUrl}/api/auth`;

  private userSubject = new BehaviorSubject<UserData | null>(this.getUserFromStorage());
  user$ = this.userSubject.asObservable();

  private getUserFromStorage(): UserData | null {
    try {
      const data = localStorage.getItem('user_data');
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  get currentUser(): UserData | null {
    return this.userSubject.value;
  }

  get isAuthenticated(): boolean {
    return !!this.getToken();
  }

  getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }

  // ✅ AJOUT — retourne l'ID de l'utilisateur connecté
  getCurrentUserId(): string | null {
    return this.currentUser?.userId ?? null;
  }

  hasRole(roles: string[]): boolean {
    const user = this.currentUser;
    if (!user) return false;
    return roles.some(role => user.roles.includes(role));
  }

  login(request: LoginRequest): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.apiUrl}/login`, request).pipe(
      tap(response => {
        if (response.success && response.data) {
          this.storeAuthData(response.data);
        }
      })
    );
  }

  register(request: RegisterRequest): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.apiUrl}/register`, request).pipe(
      tap(response => {
        if (response.success && response.data) {
          this.storeAuthData(response.data);
        }
      })
    );
  }

  refreshToken(): Observable<ApiResponse<AuthResponse>> {
    const token = this.getToken();
    const refreshToken = this.getRefreshToken();
    return this.http.post<ApiResponse<AuthResponse>>(`${this.apiUrl}/refresh`, { token, refreshToken }).pipe(
      tap(response => {
        if (response.success && response.data) {
          this.storeAuthData(response.data);
        }
      })
    );
  }

  logout(): void {
    this.http.post(`${this.apiUrl}/logout`, {}).subscribe({ error: () => { } });
    this.clearAuthData();
    this.router.navigate(['/auth/login']);
  }

  private storeAuthData(data: AuthResponse): void {
    localStorage.setItem('access_token', data.token);
    localStorage.setItem('refresh_token', data.refreshToken);
    const userData: UserData = {
      userId: data.userId,
      email: data.email,
      fullName: data.fullName,
      roles: data.roles,
      expiry: data.expiry
    };
    localStorage.setItem('user_data', JSON.stringify(userData));
    this.userSubject.next(userData);
  }

  private clearAuthData(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_data');
    this.userSubject.next(null);
  }
}
