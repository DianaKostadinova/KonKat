import { Injectable, OnDestroy, inject, signal } from '@angular/core';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import { Subject } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { runtimeConfig } from '../config/runtime-config';

const WS_URL = runtimeConfig.wsUrl;

@Injectable({ providedIn: 'root' })
export class WsService implements OnDestroy {

  private client: Client | null = null;
  private auth = inject(AuthService);

  /** Emits notification push payloads */
  readonly message$ = new Subject<any>();
  /** Emits incoming message delivery payloads { conversationId, type, message } */
  readonly incomingMessage$ = new Subject<any>();

  /** True while the STOMP client has an active broker connection. */
  private _connected = signal(false);
  readonly connected = this._connected.asReadonly();

  connect(token: string): void {
    if (this.client?.active) return;

    this.client = new Client({
      brokerURL: WS_URL,
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      onConnect: () => {
        this._connected.set(true);
        this.client!.subscribe('/user/queue/notifications', (msg: IMessage) => {
          try { this.message$.next(JSON.parse(msg.body)); } catch { /* ignore */ }
        });
        this.client!.subscribe('/user/queue/messages', (msg: IMessage) => {
          try { this.incomingMessage$.next(JSON.parse(msg.body)); } catch { /* ignore */ }
        });
      },
      onDisconnect: () => this._connected.set(false),
      onWebSocketClose: () => this._connected.set(false),
      onStompError: frame => {
        this._connected.set(false);
        console.warn('STOMP error', frame.headers['message']);
      },
    });

    this.client.activate();
  }

  disconnect(): void {
    this.client?.deactivate();
    this.client = null;
    this._connected.set(false);
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
