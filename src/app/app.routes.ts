import { Routes } from '@angular/router';
import { LoginComponent } from './Componentes/login/login.component';
import { CadastroComponent } from './Componentes/cadastro/cadastro.component';
import { ChatComponent } from './Componentes/chat/chat.component';
import { authGuard } from './guards/auth.guard';
import { loginGuard } from './guards/login.guard';

export const routes: Routes = [
    { path: '', component: LoginComponent, canActivate: [loginGuard] },
    { path: 'cadastro', component: CadastroComponent, canActivate: [loginGuard] },
    { path: 'chat', component: ChatComponent, canActivate: [authGuard] },
    { path: '**', redirectTo: '' }
];
