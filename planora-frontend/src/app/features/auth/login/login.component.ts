import { Component, inject, signal } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="auth-card">

      <!-- ✅ Popup d'erreur inline -->
      @if (errorMessage()) {
        <div class="error-banner">
          <mat-icon class="error-icon">error_outline</mat-icon>
          <span>{{ errorMessage() }}</span>
          <button class="error-close" (click)="errorMessage.set('')">✕</button>
        </div>
      }

      <div class="auth-card-header">
        <h2>Welcome back</h2>
        <p>Sign in to your Planora account</p>
      </div>

      <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="auth-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Email address</mat-label>
          <input matInput type="email" formControlName="email"
            placeholder="you@example.com" autocomplete="email">
          <mat-icon matPrefix class="field-icon">mail_outline</mat-icon>
          @if (loginForm.get('email')?.hasError('required')) {
            <mat-error>Email is required</mat-error>
          }
          @if (loginForm.get('email')?.hasError('email')) {
            <mat-error>Enter a valid email address</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Password</mat-label>
          <input matInput [type]="showPassword() ? 'text' : 'password'"
            formControlName="password" autocomplete="current-password">
          <mat-icon matPrefix class="field-icon">lock_outline</mat-icon>
          <button type="button" mat-icon-button matSuffix
            (click)="showPassword.set(!showPassword())" tabindex="-1">
            <mat-icon>{{ showPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
          </button>
          @if (loginForm.get('password')?.hasError('required')) {
            <mat-error>Password is required</mat-error>
          }
        </mat-form-field>

        <button mat-raised-button class="submit-btn" type="submit"
          [disabled]="loginForm.invalid || loading">
          @if (loading) {
            <mat-spinner diameter="18"></mat-spinner>
          } @else {
            <span>Sign In</span>
          }
        </button>
      </form>

      <p class="auth-footer">Don't have an account?
        <a routerLink="/auth/register">Create one</a>
      </p>
    </div>
  `,
  styles: [`
    .auth-card {
      background: #fff;
      border-radius: 16px;
      padding: 40px 36px;
      box-shadow: 0 20px 40px rgba(0,0,0,.15);
    }

    /* ✅ Error banner */
    .error-banner {
      display: flex;
      align-items: center;
      gap: 10px;
      background: #fef2f2;
      border: 1.5px solid #fca5a5;
      border-radius: 10px;
      padding: 12px 14px;
      margin-bottom: 20px;
      font-size: 13px;
      font-weight: 600;
      color: #dc2626;
      animation: shake .3s ease;
    }
    @keyframes shake {
      0%,100%{transform:translateX(0)}
      25%{transform:translateX(-6px)}
      75%{transform:translateX(6px)}
    }
    .error-icon { font-size: 18px; width: 18px; height: 18px; flex-shrink: 0; }
    .error-close {
      margin-left: auto; background: none; border: none;
      color: #dc2626; cursor: pointer; font-size: 14px; padding: 0 4px;
    }

    .auth-card-header {
      text-align: center;
      margin-bottom: 32px;
    }
    .auth-card-header h2 {
      font-size: 1.625rem; font-weight: 700; color: #111827; margin-bottom: 4px;
    }
    .auth-card-header p { color: #6b7280; font-size: 0.9375rem; }

    .auth-form { display: flex; flex-direction: column; gap: 4px; }
    .full-width { width: 100%; }
    .field-icon { color: #9ca3af; margin-right: 4px; font-size: 18px; width: 18px; height: 18px; }

    .submit-btn {
      width: 100%; height: 44px; margin-top: 8px;
      background: linear-gradient(135deg, #4f46e5, #4338ca) !important;
      color: #fff !important;
      font-size: 0.9375rem; font-weight: 600;
      border-radius: 8px !important;
      display: flex; align-items: center; justify-content: center; gap: 8px;
    }

    .auth-footer {
      text-align: center; margin-top: 24px;
      color: #6b7280; font-size: 0.875rem;
    }
    .auth-footer a { color: #4f46e5; font-weight: 600; text-decoration: none; }
    .auth-footer a:hover { text-decoration: underline; }
  `]
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  loading = false;
  showPassword = signal(false);
  errorMessage = signal('');   // ✅ message d'erreur réactif

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });

  onSubmit(): void {
    if (this.loginForm.invalid) return;

    this.loading = true;
    this.errorMessage.set('');  // reset l'erreur précédente

    const { email, password } = this.loginForm.value;

    this.authService.login({ email: email!, password: password! }).subscribe({
      next: response => {
        this.loading = false;
        if (response.success) {
          this.router.navigate(['/dashboard']);
        } else {
          // ✅ Affiche le message sans rediriger
          this.errorMessage.set(response.message || 'Email ou mot de passe incorrect.');
        }
      },
      error: err => {
        this.loading = false;
        // ✅ Détecte le type d'erreur pour un message clair
        const status = err?.status;
        if (status === 401 || status === 400) {
          this.errorMessage.set('Email ou mot de passe incorrect.');
        } else if (status === 0) {
          this.errorMessage.set('Unable to contact the server. Check your connection.');
        } else {
          this.errorMessage.set(err?.error?.message || 'An error occurred. Try again.');
        }
      }
    });
  }
}
