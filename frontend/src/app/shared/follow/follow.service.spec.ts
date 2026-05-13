import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { FollowService, FollowResult, FollowStatus } from './follow.service';

const API = 'http://localhost:8082/api';

describe('FollowService', () => {
  let service: FollowService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    service = TestBed.inject(FollowService);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ── toggle ─────────────────────────────────────────────────────────────

  describe('toggle', () => {
    it('POSTs to the correct endpoint and returns FollowResult', () => {
      const expected: FollowResult = { following: true, followerCount: 5 };
      let result: FollowResult | undefined;

      service.toggle(42).subscribe(r => (result = r));

      const req = httpMock.expectOne(`${API}/users/42/follow`);
      expect(req.request.method).toBe('POST');
      req.flush(expected);

      expect(result).toEqual(expected);
    });

    it('returns following=false when the follow is removed', () => {
      const expected: FollowResult = { following: false, followerCount: 3 };
      let result: FollowResult | undefined;

      service.toggle(7).subscribe(r => (result = r));
      httpMock.expectOne(`${API}/users/7/follow`).flush(expected);

      expect(result?.following).toBe(false);
      expect(result?.followerCount).toBe(3);
    });
  });

  // ── getStatus ──────────────────────────────────────────────────────────

  describe('getStatus', () => {
    it('GETs from the correct endpoint and returns FollowStatus', () => {
      const expected: FollowStatus = { following: true, followerCount: 10, followingCount: 4 };
      let result: FollowStatus | undefined;

      service.getStatus(99).subscribe(r => (result = r));

      const req = httpMock.expectOne(`${API}/users/99/follow`);
      expect(req.request.method).toBe('GET');
      req.flush(expected);

      expect(result).toEqual(expected);
    });

    it('handles a user with no followers or following', () => {
      const expected: FollowStatus = { following: false, followerCount: 0, followingCount: 0 };
      let result: FollowStatus | undefined;

      service.getStatus(1).subscribe(r => (result = r));
      httpMock.expectOne(`${API}/users/1/follow`).flush(expected);

      expect(result?.following).toBe(false);
      expect(result?.followerCount).toBe(0);
      expect(result?.followingCount).toBe(0);
    });
  });
});
