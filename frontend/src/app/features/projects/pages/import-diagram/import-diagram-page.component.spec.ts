import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../../auth/services/auth.service';
import { DiagramDetail, DiagramSummary } from '../../../editor/models/diagram.model';
import { XmiImportResponse } from '../../../editor/models/xmi-import.model';
import { DiagramService } from '../../../editor/services/diagram.service';
import { XmiImportService } from '../../../editor/services/xmi-import.service';
import { ProjectService } from '../../services/project.service';
import { ImportDiagramPageComponent } from './import-diagram-page.component';

describe('ImportDiagramPageComponent', () => {
  const project = { id: 'p1', name: 'Proyecto de prueba' } as never;
  const model = { id: 'preview', name: 'Modelo', version: 0, classes: [{ id: 'c1', name: 'Cliente', isAbstract: null, abstract: null, attributes: [{ id: 'a1', name: 'id', type: 'Object', visibility: 'PRIVATE', isStatic: null, static: null, isFinal: null, final: null, defaultValue: null, primaryKey: null }], methods: [] }], relations: [], associationClassLinks: [] } as never;
  const viewState = { diagramId: 'preview', nodes: [], relations: [] } as never;
  const preview = { canonicalModel: model, viewState, warnings: [], statistics: { classes: 1, attributes: 0, methods: 0, relations: 0, associationClasses: 0 } } as XmiImportResponse;

  function setup(diagrams: DiagramSummary[] = []) {
    const projectService = {
      getProjectsByOwner: vi.fn(() => of([project])),
      getSharedProjects: vi.fn(() => of([])),
      getMyRole: vi.fn(() => of({ role: 'OWNER' })),
    };
    const diagramService = {
      getDiagramsByProject: vi.fn(() => of(diagrams)),
      createDiagram: vi.fn(() => of({ id: 'new-diagram' } as DiagramDetail)),
    };
    const xmiService = { preview: vi.fn(() => of(preview)), apply: vi.fn(() => of(preview)) };
    const router = { navigate: vi.fn(() => Promise.resolve(true)) };
    TestBed.configureTestingModule({ providers: [
      { provide: AuthService, useValue: { currentUser: signal({ id: 'u1' }) } },
      { provide: ProjectService, useValue: projectService },
      { provide: DiagramService, useValue: diagramService },
      { provide: XmiImportService, useValue: xmiService },
      { provide: Router, useValue: router },
    ] });
    const component = TestBed.runInInjectionContext(() => new ImportDiagramPageComponent());
    return { component, projectService, diagramService, xmiService, router };
  }

  function chooseFile(component: ImportDiagramPageComponent, name = 'ModeloEA.xmi') {
    const file = new File(['<xmi:XMI/>'], name, { type: 'application/xml' });
    component.selectFile({ target: { files: { item: () => file }, value: name } } as unknown as Event);
    return file;
  }

  it('rejects native EA project files and requires XMI/XML export', () => {
    const { component } = setup();
    component.selectFile({ target: { files: { item: () => new File(['db'], 'Modelo.qea') }, value: 'Modelo.qea' } } as unknown as Event);
    expect(component.file()).toBeNull();
    expect(component.error()).toContain('Exporta el modelo');
  });

  it('previews an Enterprise Architect XMI and creates a new diagram with the canonical model', () => {
    const { component, diagramService, xmiService, router } = setup();
    const file = chooseFile(component);
    component.analyze();
    expect(xmiService.preview).toHaveBeenCalledWith(file);
    expect(component.preview()).toEqual(preview);
    component.importModel();
    expect(diagramService.createDiagram).toHaveBeenCalledWith('p1', 'ModeloEA', expect.objectContaining({ classes: [expect.objectContaining({ isAbstract: false, abstract: false, attributes: [expect.objectContaining({ isStatic: false, static: false, isFinal: false, final: false, primaryKey: false })] })] }), viewState);
    expect(router.navigate).toHaveBeenCalledWith(['/editor', 'new-diagram']);
  });

  it('requires explicit confirmation before replacing an existing diagram', () => {
    const target = { id: 'd1', projectId: 'p1', name: 'Existente', version: 4 } as DiagramSummary;
    const { component, xmiService, router } = setup([target]);
    const file = chooseFile(component);
    component.analyze();
    component.selectDiagram('d1');
    component.importModel();
    expect(xmiService.apply).not.toHaveBeenCalled();
    component.replaceConfirmed.set(true);
    component.importModel();
    expect(xmiService.apply).toHaveBeenCalledWith('d1', 4, file);
    expect(router.navigate).toHaveBeenCalledWith(['/editor', 'd1']);
  });
});