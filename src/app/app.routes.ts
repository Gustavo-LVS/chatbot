import { Routes } from '@angular/router';
import { LoginComponent } from './Componentes/login/login.component';
import { ChatComponent } from './Componentes/chat/chat.component';

export const routes: Routes = [
    { path: '', component: LoginComponent },
    { path: 'chat', component: ChatComponent }
];
