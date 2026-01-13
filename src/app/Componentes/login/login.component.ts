import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, FontAwesomeModule],
  templateUrl: './login.component.html'
})
export class LoginComponent {
  username: string = '';

  constructor(
    private router: Router,
    private authService: AuthService
  ) { }

  login() {
    if (this.authService.login(this.username)) {
      this.router.navigate(['/chat']);
      console.log('Login realizado com sucesso');
    }
  }
}
