import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ProjectService } from './project.service';
import { Project } from './project.model';

const API = 'http://localhost:8082/api';

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 1,
    title: 'Test Project',
    description: 'A test project',
    author: { id: 1, name: 'Alice', role: 'dev' },
    techStack: ['Angular', 'TypeScript'],
    status: 'IN_PROGRESS',
    stars: 0,
    forks: 0,
    comments: 0,
    createdAt: 'just now',
    ...overrides,
  };
}

describe('ProjectService', () => {
  let service: ProjectService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    service = TestBed.inject(ProjectService);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ── mapDto ─────────────────────────────────────────────────────────────

  describe('mapDto', () => {
    const fullDto = {
      id: 5,
      title: 'KonKat',
      description: 'Community platform',
      imageUrl: 'https://img.example.com/1.png',
      githubUrl: 'https://github.com/example/konkat',
      liveUrl: 'https://konkat.dev',
      techStack: ['Kotlin', 'Angular'],
      status: 'COMPLETED',
      ownerId: 42,
      ownerName: 'Diana',
      ownerRole: 'Full Stack Dev',
      ownerAvatarUrl: 'https://img.example.com/diana.jpg',
      createdAt: new Date(Date.now() - 30 * 60_000).toISOString(),
    };

    it('maps all DTO fields to the Project shape', () => {
      const p = service.mapDto(fullDto);
      expect(p.id).toBe(5);
      expect(p.title).toBe('KonKat');
      expect(p.description).toBe('Community platform');
      expect(p.thumbnail).toBe('https://img.example.com/1.png');
      expect(p.githubUrl).toBe('https://github.com/example/konkat');
      expect(p.liveUrl).toBe('https://konkat.dev');
      expect(p.techStack).toEqual(['Kotlin', 'Angular']);
      expect(p.status).toBe('COMPLETED');
      expect(p.author.id).toBe(42);
      expect(p.author.name).toBe('Diana');
      expect(p.author.role).toBe('Full Stack Dev');
      expect(p.author.avatar).toBe('https://img.example.com/diana.jpg');
    });

    it('returns "just now" for very recent items', () => {
      const dto = { ...fullDto, createdAt: new Date().toISOString() };
      expect(service.mapDto(dto).createdAt).toBe('just now');
    });

    it('returns "30m ago" for items 30 minutes old', () => {
      const dto = { ...fullDto, createdAt: new Date(Date.now() - 30 * 60_000).toISOString() };
      expect(service.mapDto(dto).createdAt).toBe('30m ago');
    });

    it('returns "3d ago" for items 3 days old', () => {
      const dto = { ...fullDto, createdAt: new Date(Date.now() - 3 * 86_400_000).toISOString() };
      expect(service.mapDto(dto).createdAt).toBe('3d ago');
    });

    it('defaults missing optional fields gracefully', () => {
      const minimalDto = { id: 2, title: 'Min', techStack: [], status: 'IN_PROGRESS', ownerId: 3, ownerName: 'Bob' };
      const p = service.mapDto(minimalDto);
      expect(p.description).toBe('');
      expect(p.thumbnail).toBeUndefined();
      expect(p.githubUrl).toBeUndefined();
      expect(p.liveUrl).toBeUndefined();
      expect(p.author.role).toBe('');
      expect(p.author.avatar).toBeUndefined();
    });

    it('initialises stars, forks, and comments to 0', () => {
      const p = service.mapDto(fullDto);
      expect(p.stars).toBe(0);
      expect(p.forks).toBe(0);
      expect(p.comments).toBe(0);
    });
  });

  // ── filterByTech ───────────────────────────────────────────────────────

  describe('filterByTech', () => {
    beforeEach(() => {
      service['projects'].set([
        makeProject({ id: 1, techStack: ['Angular', 'TypeScript'] }),
        makeProject({ id: 2, techStack: ['React', 'JavaScript'] }),
        makeProject({ id: 3, techStack: ['Vue', 'TypeScript'] }),
      ]);
    });

    it('returns all projects for an empty tech string', () => {
      expect(service.filterByTech('').length).toBe(3);
    });

    it('matches case-insensitively across the tech stack', () => {
      const results = service.filterByTech('typescript');
      expect(results.length).toBe(2);
      expect(results.map(p => p.id).sort()).toEqual([1, 3]);
    });

    it('returns an empty array when nothing matches', () => {
      expect(service.filterByTech('Rust').length).toBe(0);
    });

    it('performs partial matching within tech names', () => {
      const results = service.filterByTech('script');
      expect(results.length).toBe(3); // Angular+TypeScript, React+JavaScript, Vue+TypeScript
    });
  });

  // ── sortBy ─────────────────────────────────────────────────────────────

  describe('sortBy', () => {
    const projects = [
      makeProject({ id: 3, stars: 10, comments: 1 }),
      makeProject({ id: 1, stars: 50, comments: 5 }),
      makeProject({ id: 2, stars: 30, comments: 3 }),
    ];

    it('sorts by id desc for "newest"', () => {
      expect(service.sortBy(projects, 'newest').map(p => p.id)).toEqual([3, 2, 1]);
    });

    it('sorts by stars desc for "popular"', () => {
      expect(service.sortBy(projects, 'popular').map(p => p.stars)).toEqual([50, 30, 10]);
    });

    it('sorts by comments desc for "discussed"', () => {
      expect(service.sortBy(projects, 'discussed').map(p => p.comments)).toEqual([5, 3, 1]);
    });

    it('returns the array unchanged for an unknown sort key', () => {
      const sorted = service.sortBy(projects, 'unknown');
      expect(sorted).toEqual(projects);
    });

    it('does not mutate the input array', () => {
      const copy = [...projects];
      service.sortBy(projects, 'newest');
      expect(projects).toEqual(copy);
    });
  });

  // ── getFeatured ────────────────────────────────────────────────────────

  describe('getFeatured', () => {
    it('returns only featured projects', () => {
      service['projects'].set([
        makeProject({ id: 1, featured: true }),
        makeProject({ id: 2, featured: false }),
        makeProject({ id: 3, featured: true }),
      ]);
      const featured = service.getFeatured();
      expect(featured.length).toBe(2);
      expect(featured.map(p => p.id).sort()).toEqual([1, 3]);
    });

    it('returns empty array when none are featured', () => {
      service['projects'].set([makeProject({ featured: false })]);
      expect(service.getFeatured()).toEqual([]);
    });
  });

  // ── deleteProject ──────────────────────────────────────────────────────

  describe('deleteProject', () => {
    it('removes the deleted project from the signal', () => {
      service['projects'].set([makeProject({ id: 1 }), makeProject({ id: 2 })]);

      service.deleteProject(1).subscribe();
      httpMock.expectOne(`${API}/projects/1`).flush(null);

      const remaining = service.getProjects();
      expect(remaining.length).toBe(1);
      expect(remaining[0].id).toBe(2);
    });

    it('keeps other projects after deletion', () => {
      service['projects'].set([
        makeProject({ id: 1 }),
        makeProject({ id: 2 }),
        makeProject({ id: 3 }),
      ]);

      service.deleteProject(2).subscribe();
      httpMock.expectOne(`${API}/projects/2`).flush(null);

      expect(service.getProjects().map(p => p.id).sort()).toEqual([1, 3]);
    });
  });

  // ── createProject ──────────────────────────────────────────────────────

  describe('createProject', () => {
    it('prepends the created project to the list', () => {
      service['projects'].set([makeProject({ id: 1 })]);

      const dto = {
        id: 99, title: 'New', description: 'desc',
        techStack: ['Kotlin'], status: 'IN_PROGRESS',
        ownerId: 1, ownerName: 'Alice', createdAt: new Date().toISOString(),
      };
      service.createProject({ title: 'New', description: 'desc', techStack: ['Kotlin'], status: 'IN_PROGRESS' }).subscribe();
      httpMock.expectOne(`${API}/projects`).flush(dto);

      const projects = service.getProjects();
      expect(projects[0].id).toBe(99);
      expect(projects.length).toBe(2);
    });
  });
});
