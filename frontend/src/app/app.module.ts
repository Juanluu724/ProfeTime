import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { LoginComponent } from './auth/pages/login/login.component';

// COMPONENTES CLÁSICOS
import { DashboardComponent } from './dashboard/dashboard.component';
import { CreateEventComponent } from './events/create-event.component';

// COMPONENTE STANDALONE
import { NotificationsComponent } from './dashboard/components/notifications/notifications.component';

// MÓDULOS
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    DashboardComponent,
    CreateEventComponent
    // ❌ NO NotificationsComponent aquí
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule,
    CommonModule,

    // ✅ STANDALONE AQUÍ
    NotificationsComponent
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
