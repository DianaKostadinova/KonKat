import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { signal } from '@angular/core';
import { Subject } from 'rxjs';
import { NotificationService } from './notification.service';
import { AuthService } from '../auth/auth.service';
import { WsService } from './ws.service';
import { Notification } from './notification-bell.model';

const API = 'http://localhost:8082/api';

const mockIsLoggedIn = signal(false);
const mockUser = signal<any>(null);

const mockAuthService = {
  isLoggedIn: mockIsLoggedIn.asReadonly(),
  user: mockUser.asReadonly(),
  ready: signal(true).asReadonly(),
  getToken: () => Promise.resolve(null),
};

const mockWsService = {
  message$: new Subject<any>(),
  incomingMessage$: new Subject<any>(),
  connect: () => {},
  disconnect: () => {},
};

function makeNotificationDto(overrides: any = {}): any {
  return {
    id: 1,
    type: 'POST_LIKE',
    actorName: 'Bob',
    actorId: 10,
    actorAvatar: null,
    postId: 5,
    read: false,
    timeAgo: '5m ago',
    ...overrides,
  };
}

describe('NotificationService', () => {
  let service: NotificationService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: mockAuthService },
        { provide: WsService, useValue: mockWsService },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    service = TestBed.inject(NotificationService);
    // isLoggedIn=false, so the effect runs the else-branch — no HTTP calls in constructor
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('starts with zero notifications and unreadCount=0', () => {
    expect(service.getAll().length).toBe(0);
    expect(service.unreadCount()).toBe(0);
  });

  // ── load ───────────────────────────────────────────────────────────────

  describe('load', () => {
    it('populates notifications from the API', () => {
      service.load();
      httpMock.expectOne(`${API}/notifications`).flush([
        makeNotificationDto({ id: 1, read: false }),
        makeNotificationDto({ id: 2, read: true }),
      ]);
      expect(service.getAll().length).toBe(2);
    });

    it('maps POST_LIKE type to the "like" notification type', () => {
      service.load();
      httpMock.expectOne(`${API}/notifications`).flush([makeNotificationDto({ type: 'POST_LIKE' })]);
      expect(service.getAll()[0].type).toBe('like');
    });

    it('maps FOLLOW type to "mention"', () => {
      service.load();
      httpMock.expectOne(`${API}/notifications`).flush([makeNotificationDto({ type: 'FOLLOW' })]);
      expect(service.getAll()[0].type).toBe('mention');
    });

    it('maps MESSAGE type to "message"', () => {
      service.load();
      httpMock.expectOne(`${API}/notifications`).flush([makeNotificationDto({ type: 'MESSAGE' })]);
      expect(service.getAll()[0].type).toBe('message');
    });

    it('maps POST_COMMENT type to "comment"', () => {
      service.load();
      httpMock.expectOne(`${API}/notifications`).flush([makeNotificationDto({ type: 'POST_COMMENT' })]);
      expect(service.getAll()[0].type).toBe('comment');
    });

    it('builds correct message for POST_LIKE', () => {
      service.load();
      httpMock.expectOne(`${API}/notifications`).flush([makeNotificationDto({ type: 'POST_LIKE', actorName: 'Alice' })]);
      expect(service.getAll()[0].message).toBe('Alice liked your post');
    });

    it('builds correct message for FOLLOW', () => {
      service.load();
      httpMock.expectOne(`${API}/notifications`).flush([makeNotificationDto({ type: 'FOLLOW', actorName: 'Charlie' })]);
      expect(service.getAll()[0].message).toBe('Charlie started following you');
    });

    it('falls back to "Someone" when actorName is missing', () => {
      service.load();
      httpMock.expectOne(`${API}/notifications`).flush([makeNotificationDto({ type: 'FOLLOW', actorName: undefined })]);
      expect(service.getAll()[0].message).toBe('Someone started following you');
    });

    it('builds the correct actionUrl for a FOLLOW notification', () => {
      service.load();
      httpMock.expectOne(`${API}/notifications`).flush([makeNotificationDto({ type: 'FOLLOW', actorId: 42 })]);
      expect(service.getAll()[0].actionUrl).toBe('/profile/42');
    });

    it('builds the correct actionUrl for a POST_LIKE notification', () => {
      service.load();
      httpMock.expectOne(`${API}/notifications`).flush([makeNotificationDto({ type: 'POST_LIKE', postId: 7 })]);
      expect(service.getAll()[0].actionUrl).toBe('/feed?post=7');
    });
  });

  // ── unreadCount ────────────────────────────────────────────────────────

  describe('unreadCount', () => {
    it('counts only unread notifications', () => {
      service.load();
      httpMock.expectOne(`${API}/notifications`).flush([
        makeNotificationDto({ id: 1, read: false }),
        makeNotificationDto({ id: 2, read: true }),
        makeNotificationDto({ id: 3, read: false }),
      ]);
      expect(service.unreadCount()).toBe(2);
    });

    it('returns 0 when all are read', () => {
      service.load();
      httpMock.expectOne(`${API}/notifications`).flush([
        makeNotificationDto({ id: 1, read: true }),
      ]);
      expect(service.unreadCount()).toBe(0);
    });
  });

  // ── markAsRead ─────────────────────────────────────────────────────────

  describe('markAsRead', () => {
    beforeEach(() => {
      service.load();
      httpMock.expectOne(`${API}/notifications`).flush([
        makeNotificationDto({ id: 1, read: false }),
        makeNotificationDto({ id: 2, read: false }),
      ]);
    });

    it('marks the specific notification as read', () => {
      service.markAsRead(1);
      httpMock.expectOne(`${API}/notifications/1/read`).flush({});

      const notifs = service.getAll();
      expect(notifs.find(n => n.id === 1)?.read).toBe(true);
      expect(notifs.find(n => n.id === 2)?.read).toBe(false);
    });

    it('decrements unreadCount', () => {
      expect(service.unreadCount()).toBe(2);
      service.markAsRead(1);
      httpMock.expectOne(`${API}/notifications/1/read`).flush({});
      expect(service.unreadCount()).toBe(1);
    });
  });

  // ── markAllAsRead ──────────────────────────────────────────────────────

  describe('markAllAsRead', () => {
    beforeEach(() => {
      service.load();
      httpMock.expectOne(`${API}/notifications`).flush([
        makeNotificationDto({ id: 1, read: false }),
        makeNotificationDto({ id: 2, read: false }),
      ]);
    });

    it('marks every notification as read', () => {
      service.markAllAsRead();
      httpMock.expectOne(`${API}/notifications/read-all`).flush({});
      expect(service.getAll().every(n => n.read)).toBe(true);
    });

    it('sets unreadCount to 0', () => {
      service.markAllAsRead();
      httpMock.expectOne(`${API}/notifications/read-all`).flush({});
      expect(service.unreadCount()).toBe(0);
    });
  });

  // ── delete ─────────────────────────────────────────────────────────────

  describe('delete', () => {
    beforeEach(() => {
      service.load();
      httpMock.expectOne(`${API}/notifications`).flush([
        makeNotificationDto({ id: 1 }),
        makeNotificationDto({ id: 2 }),
      ]);
    });

    it('removes the notification from the list', () => {
      service.delete(1);
      httpMock.expectOne(`${API}/notifications/1`).flush({});
      expect(service.getAll().find(n => n.id === 1)).toBeUndefined();
      expect(service.getAll().length).toBe(1);
    });
  });
});
