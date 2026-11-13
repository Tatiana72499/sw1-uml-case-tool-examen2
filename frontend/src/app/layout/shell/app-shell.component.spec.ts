import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { Subject, of } from 'rxjs';
import { TestBed } from '@angular/core/testing';

import { AuthService } from '../../features/auth/services/auth.service';
import { ProjectService } from '../../features/projects/services/project.service';
import { AppShellComponent } from './app-shell.component';

describe('AppShellComponent', () => {
  it('shows the authenticated user project count and refreshes after project changes', async () => {
    const user = signal({ id: 'user-1', firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.test' });
    const auth = { currentUser: user, authLoading: signal(false), logout: vi.fn() };
    const changes = new Subject<void>();
    let projects = [{ id: 'p1' }, { id: 'p2' }];
    const getProjectsByOwner = vi.fn(() => of(projects));
    await TestBed.configureTestingModule({
      imports: [AppShellComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        { provide: ProjectService, useValue: { getProjectsByOwner, projectChanges$: changes.asObservable() } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(AppShellComponent);
    await fixture.whenStable();
    fixture.detectChanges();
    const badge = () => fixture.nativeElement.querySelector('.nav-item small')?.textContent.trim();
    expect(badge()).toBe('2');
    expect(getProjectsByOwner).toHaveBeenCalledWith('user-1');

    projects = [...projects, { id: 'p3' }];
    changes.next();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(badge()).toBe('3');
  });

  it('does not render a project search box in the top bar', async () => {
    await TestBed.configureTestingModule({
      imports: [AppShellComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { currentUser: signal(null), authLoading: signal(false), logout: vi.fn() } },
        { provide: ProjectService, useValue: { getProjectsByOwner: () => of([]), projectChanges$: of() } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(AppShellComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.top-search')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Buscar proyectos...');
  });
  it('shows the full account details and actions when the menu opens', async () => {
    const user = signal({ id: 'user-1', firstName: 'Tatiana', lastName: 'Chavez', email: 'tatiana@example.test' });
    await TestBed.configureTestingModule({
      imports: [AppShellComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { currentUser: user, authLoading: signal(false), logout: vi.fn() } },
        { provide: ProjectService, useValue: { getProjectsByOwner: () => of([]), projectChanges$: of() } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(AppShellComponent);
    fixture.componentInstance.toggleUserMenu();
    fixture.detectChanges();
    const menu = fixture.nativeElement.querySelector('.account-menu');
    expect(menu).not.toBeNull();
    expect(menu.textContent).toContain('Tatiana Chavez');
    expect(menu.textContent).toContain('tatiana@example.test');
    expect(menu.textContent).toContain('Mis proyectos');
    expect(menu.textContent).toContain('Configuración de cuenta');
    expect(menu.textContent).toContain('Apariencia');
    expect(menu.textContent).toContain('Cerrar sesión');
  });

});
