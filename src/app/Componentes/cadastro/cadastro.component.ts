import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { finalize } from 'rxjs/operators';
import { ToastService } from '../../services/toast.service';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-cadastro',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, FontAwesomeModule],
  templateUrl: './cadastro.component.html',
  styles: [`
    @keyframes fade-in {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    .animate-fade-in {
      animation: fade-in 0.2s ease-out;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    .animate-spin {
      animation: spin 0.6s linear infinite;
    }
  `]
})
export class CadastroComponent {
  username: string = '';
  password: string = '';
  confirmPassword: string = '';

  showPassword: boolean = false;
  showConfirmPassword: boolean = false;

  isSubmitting: boolean = false;
  isRedirecting: boolean = false;

  constructor(
    private authService: AuthService,
    private toastService: ToastService,
    private router: Router
  ) { }

  register(form: NgForm): void {
    if (this.isSubmitting) return;

    if (form.invalid) {
      form.control.markAllAsTouched();
      return;
    }

    const username = this.username.trim();
    const password = this.password;
    const confirmPassword = this.confirmPassword;

    if (password !== confirmPassword) {
      this.toastService.error('Erro', 'As senhas não conferem.');
      return;
    }

    // Limpa os campos imediatamente e desabilita o form
    this.isSubmitting = true;
    this.username = '';
    this.password = '';
    this.confirmPassword = '';

    this.authService
      .register({ username, password })
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: (result) => {
          if (!result.success) {
            if (result.code === 'USER_EXISTS') {
              this.toastService.warn('Atenção', 'Já existe usuário cadastrado com esse nome.');
              return;
            }

            this.toastService.error('Erro', result.message ?? 'Não foi possível realizar o cadastro.');
            return;
          }

          this.toastService.success('Sucesso', 'Usuário criado com sucesso!');

          // Ativa loading de redirecionamento
          this.isRedirecting = true;

          // Redireciona rapidamente
          setTimeout(() => {
            void this.router.navigate(['/']);
          }, 1200);
        },
        error: () => {
          this.toastService.error('Erro', 'Falha ao cadastrar. Tente novamente.');
        }
      });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }
}

