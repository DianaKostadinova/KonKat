import { Component, signal, computed, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { Conversation } from './chat.model';
import { ChatService } from './chat.service';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [],
  templateUrl: './chat.html',
  styleUrl: './chat.css',
})
export class Chat implements AfterViewChecked {
  @ViewChild('messageContainer') messageContainer!: ElementRef;

  activeId = signal<number | null>(null);
  newMessage = signal('');
  searchQuery = signal('');
  shouldScroll = false;

  constructor(public chatService: ChatService) {}

  conversations = computed(() => {
    const q = this.searchQuery().toLowerCase();
    return this.chatService.getAll().filter(c =>
      !q || c.name.toLowerCase().includes(q)
    );
  });

  activeConv = computed(() =>
    this.activeId() ? this.chatService.getById(this.activeId()!) : null
  );

  openConversation(id: number) {
    this.activeId.set(id);
    this.chatService.markAsRead(id);
    this.shouldScroll = true;
  }

  onMessageInput(e: Event) {
    this.newMessage.set((e.target as HTMLTextAreaElement).value);
  }

  onKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.sendMessage();
    }
  }

  sendMessage() {
    const content = this.newMessage().trim();
    if (!content || !this.activeId()) return;
    this.chatService.sendMessage(this.activeId()!, content);
    this.newMessage.set('');
    this.shouldScroll = true;
  }

  onSearch(e: Event) {
    this.searchQuery.set((e.target as HTMLInputElement).value);
  }

  isMe(senderId: number): boolean {
    return senderId === this.chatService.ME_ID;
  }

  ngAfterViewChecked() {
    if (this.shouldScroll && this.messageContainer) {
      const el = this.messageContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
      this.shouldScroll = false;
    }
  }

  totalUnread = computed(() =>
    this.chatService.getAll().reduce((sum, c) => sum + c.unread, 0)
  );
}
