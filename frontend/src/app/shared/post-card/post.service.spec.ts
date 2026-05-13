import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { PostService } from './post.service';

const API = 'http://localhost:8082/api';

const makeDto = (overrides: any = {}) => ({
  id: 1,
  author: { id: 10, name: 'Alice', username: 'alice', location: 'NY', avatarUrl: null },
  content: 'Hello world',
  type: 'TEXT',
  codeLanguage: null,
  codeSnippet: null,
  imageUrl: null,
  tags: ['#angular'],
  reactions: { likes: 5, shares: 2 },
  commentsCount: 3,
  liked: false,
  saved: false,
  createdAt: new Date().toISOString(),
  ...overrides,
});

describe('PostService', () => {
  let service: PostService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    service = TestBed.inject(PostService);
    // Flush the initial loadFeed() triggered by the constructor
    httpMock.expectOne(`${API}/posts`).flush([makeDto()]);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ── mapPost ────────────────────────────────────────────────────────────

  describe('mapPost', () => {
    it('maps type to lowercase', () => {
      expect(service.mapPost(makeDto({ type: 'CODE' })).type).toBe('code');
      expect(service.mapPost(makeDto({ type: 'MEDIA' })).type).toBe('media');
    });

    it('populates code block when codeLanguage is set', () => {
      const post = service.mapPost(makeDto({ codeLanguage: 'typescript', codeSnippet: 'const x = 1;' }));
      expect(post.code).toEqual({ language: 'typescript', snippet: 'const x = 1;' });
    });

    it('leaves code undefined when no codeLanguage', () => {
      expect(service.mapPost(makeDto({ codeLanguage: null })).code).toBeUndefined();
    });

    it('uses commentsCount for the comments reaction count', () => {
      const post = service.mapPost(makeDto({ reactions: { likes: 3, shares: 1 }, commentsCount: 7 }));
      expect(post.reactions.comments).toBe(7);
      expect(post.reactions.likes).toBe(3);
      expect(post.reactions.shares).toBe(1);
    });

    it('defaults missing reaction fields to 0', () => {
      const post = service.mapPost(makeDto({ reactions: undefined, commentsCount: undefined }));
      expect(post.reactions.likes).toBe(0);
      expect(post.reactions.shares).toBe(0);
      expect(post.reactions.comments).toBe(0);
    });

    it('maps author fields correctly', () => {
      const post = service.mapPost(makeDto());
      expect(post.author.name).toBe('Alice');
      expect(post.author.role).toBe('alice');   // username → role
      expect(post.author.location).toBe('NY');
      expect(post.author.avatarUrl).toBeUndefined();
    });

    it('maps liked and saved flags', () => {
      const post = service.mapPost(makeDto({ liked: true, saved: true }));
      expect(post.liked).toBe(true);
      expect(post.saved).toBe(true);
    });
  });

  // ── timeAgo (exercised via mapPost) ────────────────────────────────────

  describe('timeAgo', () => {
    const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

    it('returns "just now" for sub-minute posts', () => {
      expect(service.mapPost(makeDto({ createdAt: ago(30_000) })).author.time).toBe('just now');
    });

    it('returns minutes for posts under an hour', () => {
      expect(service.mapPost(makeDto({ createdAt: ago(30 * 60_000) })).author.time).toBe('30m ago');
    });

    it('returns hours for posts under a day', () => {
      expect(service.mapPost(makeDto({ createdAt: ago(5 * 3_600_000) })).author.time).toBe('5h ago');
    });

    it('returns days for posts under a week', () => {
      expect(service.mapPost(makeDto({ createdAt: ago(3 * 86_400_000) })).author.time).toBe('3d ago');
    });

    it('returns weeks for older posts', () => {
      expect(service.mapPost(makeDto({ createdAt: ago(14 * 86_400_000) })).author.time).toBe('2w ago');
    });
  });

  // ── toggleLike ─────────────────────────────────────────────────────────

  describe('toggleLike', () => {
    it('sets liked=true and increments likes for an unliked post', () => {
      service['_posts'].set([service.mapPost(makeDto({ liked: false, reactions: { likes: 0, shares: 0 } }))]);
      service.toggleLike(1);
      const p = service.getPosts()[0];
      expect(p.liked).toBe(true);
      expect(p.reactions.likes).toBe(1);
      httpMock.expectOne(`${API}/posts/1/react`).flush({});
    });

    it('sets liked=false and decrements likes for a liked post', () => {
      service['_posts'].set([service.mapPost(makeDto({ liked: true, reactions: { likes: 3, shares: 0 } }))]);
      service.toggleLike(1);
      const p = service.getPosts()[0];
      expect(p.liked).toBe(false);
      expect(p.reactions.likes).toBe(2);
      httpMock.expectOne(`${API}/posts/1/react`).flush({});
    });

    it('does not affect other posts', () => {
      service['_posts'].set([
        service.mapPost(makeDto({ id: 1, liked: false, reactions: { likes: 0, shares: 0 } })),
        service.mapPost(makeDto({ id: 2, liked: false, reactions: { likes: 10, shares: 0 } })),
      ]);
      service.toggleLike(1);
      expect(service.getPosts().find(p => p.id === 2)!.reactions.likes).toBe(10);
      httpMock.expectOne(`${API}/posts/1/react`).flush({});
    });
  });

  // ── toggleSave ─────────────────────────────────────────────────────────

  describe('toggleSave', () => {
    it('sets saved=true for an unsaved post', () => {
      service['_posts'].set([service.mapPost(makeDto({ saved: false }))]);
      service.toggleSave(1);
      expect(service.getPosts()[0].saved).toBe(true);
      httpMock.expectOne(`${API}/posts/1/react`).flush({});
    });

    it('sets saved=false for an already saved post', () => {
      service['_posts'].set([service.mapPost(makeDto({ saved: true }))]);
      service.toggleSave(1);
      expect(service.getPosts()[0].saved).toBe(false);
      httpMock.expectOne(`${API}/posts/1/react`).flush({});
    });
  });

  // ── addPost ────────────────────────────────────────────────────────────

  describe('addPost', () => {
    it('prepends the new post at the front of the feed', () => {
      const newDto = makeDto({ id: 99, content: 'Brand new', liked: false, saved: false });
      service.addPost({
        author: { name: 'Bob', role: '', location: '', time: '' },
        content: 'Brand new',
        type: 'text' as any,
        reactions: { likes: 0, comments: 0, shares: 0 },
      }).subscribe();

      httpMock.expectOne(`${API}/posts`).flush(newDto);

      const posts = service.getPosts();
      expect(posts[0].id).toBe(99);
      expect(posts[0].content).toBe('Brand new');
      expect(posts.length).toBe(2);
    });
  });

  // ── loadPostsByTag ─────────────────────────────────────────────────────

  describe('loadPostsByTag', () => {
    it('strips the leading # before hitting the API', () => {
      service.loadPostsByTag('#angular').subscribe();
      httpMock.expectOne(`${API}/posts/tag/angular`).flush([]);
    });

    it('works when the tag has no # prefix', () => {
      service.loadPostsByTag('typescript').subscribe();
      httpMock.expectOne(`${API}/posts/tag/typescript`).flush([]);
    });
  });
});
