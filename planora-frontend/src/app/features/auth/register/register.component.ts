import { Component, inject, signal } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

// ✅ Validator personnalisé — exige format xxx@xxx.xxx
function strictEmailValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (!value) return null;
  // Regex stricte : doit avoir @ + domaine + . + extension (min 2 chars)
  const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(value) ? null : { invalidEmail: true };
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule, RouterLink, ReactiveFormsModule, MatCardModule, MatFormFieldModule,
    MatInputModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule
  ],
  template: `
    @if (errorMessage()) {
      <div class="modal-overlay" (click)="errorMessage.set('')">
        <div class="modal-box" (click)="$event.stopPropagation()">
          <div class="modal-icon-wrap">
            <mat-icon class="modal-icon">error_outline</mat-icon>
          </div>
          <h3 class="modal-title">Erreur d'inscription</h3>
          <p class="modal-msg">{{ errorMessage() }}</p>
          <button class="modal-close-icon" (click)="errorMessage.set('')" aria-label="Fermer">
            <mat-icon>close</mat-icon>
          </button>
        </div>
      </div>
    }

    <div class="auth-card">
      <div class="auth-card-header">
        <h2>Create your account</h2>
        <p>Join Planora and start managing projects</p>
      </div>

      <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="auth-form">
        <div class="field-row">
          <mat-form-field appearance="outline">
            <mat-label>First Name</mat-label>
            <input matInput formControlName="firstName" autocomplete="given-name">
            @if (registerForm.get('firstName')?.hasError('required')) {
              <mat-error>Required</mat-error>
            }
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Last Name</mat-label>
            <input matInput formControlName="lastName" autocomplete="family-name">
            @if (registerForm.get('lastName')?.hasError('required')) {
              <mat-error>Required</mat-error>
            }
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Email address</mat-label>
          <input matInput type="email" formControlName="email" autocomplete="email">
          <mat-icon matPrefix class="field-icon">mail_outline</mat-icon>
          @if (registerForm.get('email')?.hasError('required')) {
            <mat-error>L'email est requis</mat-error>
          }
          @if (registerForm.get('email')?.hasError('invalidEmail')) {
            <mat-error>Adresse email invalide (ex: nom&#64;domaine.com)</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Username</mat-label>
          <input matInput formControlName="userName" autocomplete="username">
          <mat-icon matPrefix class="field-icon">alternate_email</mat-icon>
          @if (registerForm.get('userName')?.hasError('required')) {
            <mat-error>Required</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Password</mat-label>
          <input matInput [type]="showPassword() ? 'text' : 'password'"
                 formControlName="password" autocomplete="new-password">
          <mat-icon matPrefix class="field-icon">lock_outline</mat-icon>
          <button type="button" mat-icon-button matSuffix
                  (click)="showPassword.set(!showPassword())" tabindex="-1">
            <mat-icon>{{ showPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
          </button>
          @if (registerForm.get('password')?.hasError('required')) {
            <mat-error>Required</mat-error>
          }
          @if (registerForm.get('password')?.hasError('minlength')) {
            <mat-error>Minimum 8 characters</mat-error>
          }
        </mat-form-field>

        <button mat-raised-button class="submit-btn" type="submit"
                [disabled]="registerForm.invalid || loading">
          @if (loading) { <mat-spinner diameter="18"></mat-spinner> }
          @else { <span>Create Account</span> }
        </button>
      </form>

      <p class="auth-footer">
        Already have an account? <a routerLink="/auth/login">Sign in</a>
      </p>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed; inset: 0; background: rgba(15,23,42,0.55);
      backdrop-filter: blur(4px); display: flex; align-items: center;
      justify-content: center; z-index: 9999; animation: fadeIn .2s ease;
    }
    @keyframes fadeIn { from{opacity:0} to{opacity:1} }
    .modal-box {
      background: #fff; border-radius: 20px; padding: 36px 32px;
      width: 90%; max-width: 400px; text-align: center;
      box-shadow: 0 24px 60px rgba(0,0,0,.2); position: relative;
      animation: popIn .25s cubic-bezier(.34,1.56,.64,1);
    }
    @keyframes popIn { from{transform:scale(.85);opacity:0} to{transform:scale(1);opacity:1} }
    .modal-icon-wrap {
      width: 64px; height: 64px; border-radius: 50%; background: #fee2e2;
      display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;
    }
    .modal-icon { font-size: 32px; width: 32px; height: 32px; color: #dc2626; }
    .modal-title { font-size: 18px; font-weight: 800; color: #111827; margin: 0 0 10px; }
    .modal-msg { font-size: 14px; color: #6b7280; margin: 0 0 24px; line-height: 1.6; }
    .modal-close-icon {
      position: absolute; top: 14px; right: 14px;
      background: #f1f5f9; border: none; border-radius: 50%;
      width: 36px; height: 36px;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: background .15s; color: #64748b;
    }
    .modal-close-icon:hover { background: #e2e8f0; color: #1e293b; }
    .auth-card { background:#fff;border-radius:16px;padding:40px 36px;box-shadow:0 20px 40px rgba(0,0,0,.15); }
    .auth-card-header { text-align:center;margin-bottom:28px; }
    .auth-card-header h2 { font-size:1.5rem;font-weight:700;color:#111827;margin-bottom:4px; }
    .auth-card-header p { color:#6b7280;font-size:0.9375rem; }
    .auth-form { display:flex;flex-direction:column;gap:4px; }
    .field-row { display:flex;gap:12px; }
    .field-row mat-form-field { flex:1; }
    .full-width { width:100%; }
    .field-icon { color:#9ca3af;margin-right:4px;font-size:18px;width:18px;height:18px; }
    .submit-btn {
      width:100%;height:44px;margin-top:8px;
      background:#4f46e5 !important;color:#fff !important;
      font-size:0.9375rem;font-weight:600;border-radius:8px !important;
      display:flex;align-items:center;justify-content:center;gap:8px;
    }
    .auth-footer { text-align:center;margin-top:24px;color:#6b7280;font-size:0.875rem; }
    .auth-footer a { color:#4f46e5;font-weight:600;text-decoration:none; }
    .auth-footer a:hover { text-decoration:underline; }
  `]
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  loading = false;
  showPassword = signal(false);
  errorMessage = signal('');

  registerForm = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    // ✅ strictEmailValidator remplace Validators.email
    email: ['', [Validators.required, strictEmailValidator]],
    userName: ['', Validators.required],
    password: ['', [Validators.required, Validators.minLength(8)]]
  });

  onSubmit(): void {
    if (this.registerForm.invalid) return;
    this.loading = true;
    this.errorMessage.set('');
    const value = this.registerForm.value;

    this.authService.register({
      firstName: value.firstName!,
      lastName: value.lastName!,
      email: value.email!,
      userName: value.userName!,
      password: value.password!
    }).subscribe({
      next: response => {
        this.loading = false;
        if (response.success) {
          this.router.navigate(['/dashboard']);
        } else {
          this.errorMessage.set(response.message || 'Registration failed.');
        }
      },
      error: err => {
        this.loading = false;
        this.errorMessage.set(this.extractErrorMessage(err));
      }
    });
  }

  private extractErrorMessage(err: any): string {
    if (err?.error?.message) return err.error.message;
    if (err?.error?.errors) {
      const errors = err.error.errors;
      if (typeof errors === 'object') {
        const messages = Object.values(errors).flat() as string[];
        if (messages.length > 0) return messages[0];
      }
    }
    if (Array.isArray(err?.error)) {
      return err.error.map((e: any) => e.description || e.message || e).join(', ');
    }
    if (err?.error?.title) return err.error.title;
    const status = err?.status;
    if (status === 400) return 'Données invalides. Vérifie les champs.';
    if (status === 409) return 'Un compte avec cet email existe déjà.';
    if (status === 0) return 'Impossible de contacter le serveur.';
    return 'Inscription échouée. Réessaie.';
  }
}
