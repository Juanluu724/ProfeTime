import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../../ui/toast.service';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let component: LoginComponent;

  const authServiceStub = {
    userValue: null as any,
    setUser: jasmine.createSpy('setUser'),
    loginWithFirebaseGoogle: jasmine.createSpy('loginWithFirebaseGoogle')
  };

  const routerStub = {
    parseUrl: jasmine.createSpy('parseUrl').and.callFake(() => ({ queryParams: {} })),
    navigateByUrl: jasmine.createSpy('navigateByUrl')
  };

  const toastStub = {
    error: jasmine.createSpy('error'),
    success: jasmine.createSpy('success'),
    warning: jasmine.createSpy('warning'),
    info: jasmine.createSpy('info')
  };

  beforeEach(() => {
    authServiceStub.userValue = null;
    authServiceStub.loginWithFirebaseGoogle.calls.reset();
    authServiceStub.setUser.calls.reset();
    routerStub.parseUrl.calls.reset();
    routerStub.navigateByUrl.calls.reset();
    toastStub.error.calls.reset();

    TestBed.configureTestingModule({
      imports: [CommonModule],
      declarations: [LoginComponent],
      providers: [
        { provide: AuthService, useValue: authServiceStub },
        { provide: Router, useValue: routerStub },
        { provide: ToastService, useValue: toastStub },
        { provide: ActivatedRoute, useValue: { queryParams: of({}) } }
      ]
    });

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call AuthService and navigate on successful login', () => {
    authServiceStub.loginWithFirebaseGoogle.and.returnValue(of({}));

    component.loginWithGoogle();

    expect(authServiceStub.loginWithFirebaseGoogle).toHaveBeenCalled();
    expect(routerStub.navigateByUrl).toHaveBeenCalled();
    expect(component.loading).toBeFalse();
  });

  it('should show a friendly message on forbidden domain', () => {
    authServiceStub.loginWithFirebaseGoogle.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 403 }))
    );

    component.loginWithGoogle();

    expect(component.mensaje).toContain('no está autorizada');
    expect(toastStub.error).toHaveBeenCalled();
    expect(component.loading).toBeFalse();
  });
});

