import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { LoginComponent } from './auth/pages/login/login.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { CreateEventComponent } from './events/create-event.component';
import { NotificationsComponent } from './dashboard/components/notifications/notifications.component';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    DashboardComponent,
    CreateEventComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    HttpClientModule,
    NotificationsComponent
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
