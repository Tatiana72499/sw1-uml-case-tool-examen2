import { Component, HostListener, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { catchError, merge, of, switchMap } from 'rxjs';
import { AuthService } from '../../features/auth/services/auth.service';
import { ProjectService } from '../../features/projects/services/project.service';

@Component({
  selector: 'app-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
})
export class AppShellComponent {
  readonly auth = inject(AuthService);
  readonly projectCount = signal<number | null>(null);
  private readonly projectService = inject(ProjectService);
  collapsed = false;
  userMenuOpen = false;
  get initials(): string { const user = this.auth.currentUser(); return user ? `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase() : ''; }
  toggleUserMenu(): void { this.userMenuOpen = !this.userMenuOpen; }
  closeMobileMenu(): void { this.collapsed = false; }
  @HostListener('document:keydown.escape')
  closeMenus(): void { this.userMenuOpen = false; this.closeMobileMenu(); }
  nav = [
    { label: 'Dashboard', icon: '▦', link: '/dashboard' },
    { label: 'Mis proyectos', icon: '▱', link: '/projects' },
    { label: 'Compartidos conmigo', icon: '♧', link: '/shared' },
    { label: 'Plantillas', icon: '◇', link: '/templates' },
  ];

  constructor() {
    toObservable(this.auth.currentUser).pipe(
      switchMap((user) => {
        if (!user) return of([]);
        this.projectCount.set(null);
        return merge(of(undefined), this.projectService.projectChanges$).pipe(
          switchMap(() => this.projectService.getProjectsByOwner(user.id).pipe(catchError(() => of(null)))),
        );
      }),
      takeUntilDestroyed(),
    ).subscribe((projects) => this.projectCount.set(projects?.length ?? null));
  }
}
