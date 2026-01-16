import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

/** Tempo em ms antes de redirecionar após cadastro bem-sucedido */
const REDIRECT_DELAY_MS = 1200;

@Component({
  selector: 'app-cadastro',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, FontAwesomeModule],
  templateUrl: './cadastro.component.html',
})
export class CadastroComponent {
  username = '';
  password = '';
  confirmPassword = '';

  showPassword = false;
  showConfirmPassword = false;
  isSubmitting = false;
  isRedirecting = false;

  constructor(
    private authService: AuthService,
    private toastService: ToastService,
    private router: Router
  ) {}

  register(form: NgForm): void {
    if (this.isSubmitting) return;

    if (form.invalid) {
      form.control.markAllAsTouched();
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.toastService.error('Erro', 'As senhas não conferem.');
      return;
    }

    const credentials = {
      username: this.username.trim(),
      password: this.password,
    };

    // Limpa os campos imediatamente e desabilita o form
    this.isSubmitting = true;
    this.username = '';
    this.password = '';
    this.confirmPassword = '';

    this.authService
      .register(credentials)
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
          this.isRedirecting = true;

          setTimeout(() => {
            void this.router.navigate(['/']);
          }, REDIRECT_DELAY_MS);
        },
        error: () => {
          this.toastService.error('Erro', 'Falha ao cadastrar. Tente novamente.');
        },
      });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }
}

