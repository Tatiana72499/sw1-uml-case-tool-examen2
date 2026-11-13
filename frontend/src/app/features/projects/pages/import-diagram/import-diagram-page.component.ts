import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { AuthService } from '../../../auth/services/auth.service';
import { DiagramSummary, UmlDiagram } from '../../../editor/models/diagram.model';
import { XmiImportResponse } from '../../../editor/models/xmi-import.model';
import { DiagramService } from '../../../editor/services/diagram.service';
import { XmiImportService } from '../../../editor/services/xmi-import.service';
import { Project, ProjectMemberRole } from '../../models/project.model';
import { ProjectService } from '../../services/project.service';

@Component({ selector: 'app-import-diagram-page', imports: [RouterLink], templateUrl: './import-diagram-page.component.html', styleUrl: './import-diagram-page.component.scss' })
export class ImportDiagramPageComponent {
  private readonly auth = inject(AuthService);
  private readonly projectService = inject(ProjectService);
  private readonly diagramService = inject(DiagramService);
  private readonly xmiImportService = inject(XmiImportService);
  private readonly router = inject(Router);
  readonly projects = signal<Project[]>([]);
  readonly diagrams = signal<DiagramSummary[]>([]);
  readonly selectedProjectId = signal('');
  readonly selectedDiagramId = signal('NEW');
  readonly newDiagramName = signal('');
  readonly file = signal<File | null>(null);
  readonly preview = signal<XmiImportResponse | null>(null);
  readonly loadingProjects = signal(true);
  readonly loadingDiagrams = signal(false);
  readonly analyzing = signal(false);
  readonly importing = signal(false);
  readonly replaceConfirmed = signal(false);
  readonly error = signal('');

  constructor() { this.loadProjects(); }

  get canImport(): boolean { return !!this.preview() && !!this.selectedProjectId() && (this.selectedDiagramId() === 'NEW' || this.replaceConfirmed()); }

  private loadProjects(): void {
    const user = this.auth.currentUser();
    if (!user) { this.error.set('Inicia sesión para importar un modelo UML.'); this.loadingProjects.set(false); return; }
    forkJoin({
      owned: this.projectService.getProjectsByOwner(user.id).pipe(catchError(() => of([] as Project[]))),
      shared: this.projectService.getSharedProjects().pipe(catchError(() => of([] as Project[]))),
    }).pipe(
      map(({ owned, shared }) => [...new Map([...owned, ...shared].map(project => [project.id, project])).values()]),
      switchMap(projects => projects.length ? forkJoin(projects.map(project => this.projectService.getMyRole(project.id).pipe(
        map(({ role }) => ({ project, role })),
        catchError(() => of({ project, role: 'VIEWER' as ProjectMemberRole })),
      ))) : of([])),
      map(items => items.filter(item => item.role === 'OWNER' || item.role === 'EDITOR').map(item => item.project)),
    ).subscribe({
      next: projects => { this.projects.set(projects); this.loadingProjects.set(false); if (projects.length) this.selectProject(projects[0].id); else this.error.set('No tienes proyectos con permiso de edición. Crea un proyecto o solicita acceso de editor.'); },
      error: () => { this.loadingProjects.set(false); this.error.set('No se pudieron cargar tus proyectos. Vuelve a intentarlo.'); },
    });
  }

  selectProject(projectId: string): void {
    this.error.set(''); this.selectedProjectId.set(projectId); this.selectedDiagramId.set('NEW'); this.replaceConfirmed.set(false); this.diagrams.set([]);
    if (!projectId) return;
    this.loadingDiagrams.set(true);
    this.diagramService.getDiagramsByProject(projectId).pipe(catchError(() => { this.error.set('No se pudieron cargar los diagramas del proyecto.'); return of([] as DiagramSummary[]); })).subscribe(diagrams => { this.diagrams.set(diagrams); this.loadingDiagrams.set(false); });
  }

  selectDiagram(diagramId: string): void { this.selectedDiagramId.set(diagramId); this.replaceConfirmed.set(false); }

  selectFile(event: Event): void {
    const input = event.target as HTMLInputElement, file = input.files?.item(0) ?? null;
    this.error.set(''); this.preview.set(null); this.replaceConfirmed.set(false);
    if (!file) { this.file.set(null); return; }
    const extension = file.name.toLowerCase().split('.').pop();
    if (extension !== 'xmi' && extension !== 'xml') { this.file.set(null); input.value = ''; this.error.set('Exporta el modelo de Enterprise Architect como XMI y selecciona un archivo .xmi o .xml.'); return; }
    if (file.size > 10 * 1024 * 1024) { this.file.set(null); input.value = ''; this.error.set('El archivo supera el límite de 10 MB. Exporta solo el paquete UML que necesitas.'); return; }
    this.file.set(file); this.newDiagramName.set(file.name.replace(/\.(xmi|xml)$/i, '').replace(/[_-]+/g, ' ').trim() || 'Diagrama importado');
  }

  analyze(): void {
    const file = this.file(); if (!file || this.analyzing()) return;
    this.analyzing.set(true); this.error.set(''); this.preview.set(null);
    this.xmiImportService.preview(file).subscribe({
      next: result => { this.preview.set(result); this.analyzing.set(false); },
      error: err => { this.error.set(err?.error?.message ?? 'No se pudo leer el XMI de Enterprise Architect. Comprueba que sea una exportación UML/XMI válida.'); this.analyzing.set(false); },
    });
  }

  importModel(): void {
    const projectId = this.selectedProjectId(), file = this.file(), preview = this.preview();
    if (!projectId || !file || !preview || !this.canImport || this.importing()) return;
    this.importing.set(true); this.error.set('');
    if (this.selectedDiagramId() === 'NEW') {
      const name = this.newDiagramName().trim();
      if (!name) { this.error.set('Escribe un nombre para el nuevo diagrama.'); this.importing.set(false); return; }
      this.diagramService.createDiagram(projectId, name, this.normalizeImportedModel(preview.canonicalModel), preview.viewState).subscribe({ next: diagram => this.openImportedDiagram(diagram.id), error: err => this.failImport(err) });
      return;
    }
    const target = this.diagrams().find(diagram => diagram.id === this.selectedDiagramId());
    if (!target) { this.error.set('Selecciona un diagrama válido para reemplazar.'); this.importing.set(false); return; }
    this.xmiImportService.apply(target.id, target.version, file).subscribe({ next: () => this.openImportedDiagram(target.id), error: err => this.failImport(err) });
  }

  private normalizeImportedModel(model: UmlDiagram): UmlDiagram {
    return {
      ...model,
      classes: (model.classes ?? []).map(umlClass => {
        const isAbstract = Boolean(umlClass.isAbstract ?? umlClass.abstract ?? false);
        return {
          ...umlClass,
          isAbstract,
          abstract: isAbstract,
          attributes: (umlClass.attributes ?? []).map(attribute => {
            const isStatic = Boolean(attribute.isStatic ?? attribute.static ?? false);
            const isFinal = Boolean(attribute.isFinal ?? attribute.final ?? false);
            const primaryKey = Boolean(attribute.primaryKey ?? false);
            return { ...attribute, isStatic, static: isStatic, isFinal, final: isFinal, primaryKey };
          }),
          methods: (umlClass.methods ?? []).map(method => {
            const isStatic = Boolean(method.isStatic ?? method.static ?? false);
            return { ...method, isStatic, static: isStatic, parameters: method.parameters ?? [] };
          }),
        };
      }),
      relations: (model.relations ?? []).map(relation => ({
        ...relation,
        sourceNavigable: Boolean(relation.sourceNavigable ?? false),
        targetNavigable: Boolean(relation.targetNavigable ?? false),
      })),
      associationClassLinks: model.associationClassLinks ?? [],
    };
  }
  private openImportedDiagram(diagramId: string): void { this.importing.set(false); void this.router.navigate(['/editor', diagramId]); }
  private failImport(error: { error?: { message?: string }; status?: number }): void {
    this.importing.set(false);
    this.error.set(error.status === 409 ? 'El diagrama cambió en otra sesión. Recarga la lista y vuelve a importar.' : error.error?.message ?? 'No se pudo guardar el diagrama importado.');
  }
}