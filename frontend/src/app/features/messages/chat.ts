import { Component, signal, computed, ViewChild, ElementRef, AfterViewChecked, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from './chat.service';
import { UserSearchResult } from './chat.model';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.html',
  styleUrl: './chat.css',
})
export class Chat implements AfterViewChecked, OnDestroy {
  @ViewChild('messageContainer') messageContainer!: ElementRef;

  activeId = signal<number | null>(null);
  newMessage = signal('');
  searchQuery = signal('');
  shouldScroll = false;

  // ── New DM modal ────────────────────────────────────────────────────────────
  showDmModal = signal(false);
  dmSearch = signal('');
  dmResults = signal<UserSearchResult[]>([]);
  dmLoading = signal(false);
  private dmTimer: any;

  // ── New Group Chat modal ────────────────────────────────────────────────────
  showGcModal = signal(false);
  gcName = signal('');
  gcSearch = signal('');
  gcResults = signal<UserSearchResult[]>([]);
  gcSelected = signal<UserSearchResult[]>([]);
  gcLoading = signal(false);
  gcCreating = signal(false);
  private gcTimer: any;

  constructor(public chatService: ChatService) {}

  conversations = computed(() => {
    const q = this.searchQuery().toLowerCase();
    return this.chatService.getAll().filter(c =>
      !q || c.name.toLowerCase().includes(q)
    );
  });

  activeConv = computed(() =>
    this.activeId() != null ? this.chatService.getById(this.activeId()!) : null
  );

  totalUnread = computed(() =>
    this.chatService.getAll().reduce((sum, c) => sum + c.unread, 0)
  );

  isMe(senderId: number): boolean {
    return senderId === this.chatService.meId();
  }

  openConversation(id: number) {
    const conv = this.chatService.getById(id);
    if (!conv) return;
    this.activeId.set(id);
    this.chatService.markAsRead(id, conv.type);
    if (!conv.messages.length) this.chatService.loadMessages(id, conv.type);
    this.chatService.startPolling(id, conv.type);
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
    const conv = this.activeConv();
    if (!content || !conv) return;
    this.chatService.sendMessage(conv.id, content, conv.type);
    this.newMessage.set('');
    this.shouldScroll = true;
  }

  onSearch(e: Event) {
    this.searchQuery.set((e.target as HTMLInputElement).value);
  }

  ngAfterViewChecked() {
    if (this.shouldScroll && this.messageContainer) {
      const el = this.messageContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
      this.shouldScroll = false;
    }
  }

  ngOnDestroy() {
    this.chatService.stopPolling();
    clearTimeout(this.dmTimer);
    clearTimeout(this.gcTimer);
  }

  // ── New DM ──────────────────────────────────────────────────────────────────

  openDmModal() {
    this.showDmModal.set(true);
    this.dmSearch.set('');
    this.dmResults.set([]);
  }

  closeDmModal() { this.showDmModal.set(false); }

  onDmSearch(e: Event) {
    const q = (e.target as HTMLInputElement).value;
    this.dmSearch.set(q);
    clearTimeout(this.dmTimer);
    if (q.length < 2) { this.dmResults.set([]); return; }
    this.dmLoading.set(true);
    this.dmTimer = setTimeout(() => {
      this.chatService.searchUsers(q).subscribe({
        next: res => { this.dmResults.set(res.users); this.dmLoading.set(false); },
        error: () => this.dmLoading.set(false),
      });
    }, 300);
  }

  async startDm(user: UserSearchResult) {
    this.closeDmModal();
    try {
      const conv = await this.chatService.openOrCreateDm(user.id);
      this.openConversation(conv.id);
    } catch {}
  }

  // ── New Group Chat ──────────────────────────────────────────────────────────

  openGcModal() {
    this.showGcModal.set(true);
    this.gcName.set('');
    this.gcSearch.set('');
    this.gcResults.set([]);
    this.gcSelected.set([]);
  }

  closeGcModal() { this.showGcModal.set(false); }

  onGcSearch(e: Event) {
    const q = (e.target as HTMLInputElement).value;
    this.gcSearch.set(q);
    clearTimeout(this.gcTimer);
    if (q.length < 2) { this.gcResults.set([]); return; }
    this.gcLoading.set(true);
    this.gcTimer = setTimeout(() => {
      this.chatService.searchUsers(q).subscribe({
        next: res => {
          this.gcResults.set(res.users.filter(u => !this.gcSelected().some(s => s.id === u.id)));
          this.gcLoading.set(false);
        },
        error: () => this.gcLoading.set(false),
      });
    }, 300);
  }

  addGcMember(user: UserSearchResult) {
    if (this.gcSelected().some(u => u.id === user.id)) return;
    this.gcSelected.update(sel => [...sel, user]);
    this.gcResults.update(res => res.filter(u => u.id !== user.id));
  }

  removeGcMember(user: UserSearchResult) {
    this.gcSelected.update(sel => sel.filter(u => u.id !== user.id));
  }

  async createGroup() {
    const name = this.gcName().trim();
    const memberIds = this.gcSelected().map(u => u.id);
    if (!name || !memberIds.length || this.gcCreating()) return;
    this.gcCreating.set(true);
    try {
      const conv = await this.chatService.createGroup(name, memberIds);
      this.closeGcModal();
      this.openConversation(conv.id);
    } catch {
      this.gcCreating.set(false);
    }
  }
}
