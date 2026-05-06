import { Injectable, OnDestroy, inject } from '@angular/core';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import { Subject } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { environment } from '../../../environments/environment';

const WS_URL = environment.wsUrl;

@Injectable({ providedIn: 'root' })
export class WsService implements OnDestroy {

  private client: Client | null = null;
  private auth = inject(AuthService);

  /** Emits notification push payloads */
  readonly message$ = new Subject<any>();
  /** Emits incoming message delivery payloads { conversationId, type, message } */
  readonly incomingMessage$ = new Subject<any>();

  connect(token: string): void {
    if (this.client?.active) return;

    this.client = new Client({
      brokerURL: WS_URL,
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      onConnect: () => {
        this.client!.subscribe('/user/queue/notifications', (msg: IMessage) => {
          try { this.message$.next(JSON.parse(msg.body)); } catch { /* ignore */ }
        });
        this.client!.subscribe('/user/queue/messages', (msg: IMessage) => {
          try { this.incomingMessage$.next(JSON.parse(msg.body)); } catch { /* ignore */ }
        });
      },
      onStompError: frame => {
        console.warn('STOMP error', frame.headers['message']);
      },
    });

    this.client.activate();
  }

  disconnect(): void {
    this.client?.deactivate();
    this.client = null;
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
