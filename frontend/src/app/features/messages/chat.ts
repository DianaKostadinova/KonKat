import { Component, signal, computed, ViewChild, ElementRef, AfterViewChecked, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { ChatService } from './chat.service';
import { Conversation, ConversationMember, UserSearchResult } from './chat.model';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './chat.html',
  styleUrl: './chat.css',
})
export class Chat implements OnInit, AfterViewChecked, OnDestroy {
  @ViewChild('messageContainer') messageContainer!: ElementRef;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  activeId = signal<number | null>(null);
  newMessage = signal('');
  searchQuery = signal('');
  searchResults = signal<UserSearchResult[]>([]);
  searchLoading = signal(false);
  private searchTimer: any;
  shouldScroll = false;

  pendingFile = signal<File | null>(null);
  pendingFilePreviewUrl = signal<string | null>(null);
  uploading = signal(false);
  uploadError = signal<string | null>(null);

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

  private queryParamSub?: Subscription;

  constructor(public chatService: ChatService, private route: ActivatedRoute, private router: Router, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    // Use queryParamMap Observable (not snapshot) so navigating to /chat?dm=X
    // while already on the chat page still opens the right conversation.
    this.queryParamSub = this.route.queryParamMap.subscribe(params => {
      const dm = params.get('dm');
      if (dm) {
        this.chatService.openOrCreateDm(Number(dm)).then(conv => {
          this.openConversation(conv.id);
        }).catch(() => {});
        return;
      }

      const group = params.get('group');
      if (group) {
        this.chatService.openGroupById(Number(group)).then(conv => {
          this.openConversation(conv.id);
        }).catch(() => {});
      }
    });
  }

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

  getMember(conv: Conversation, senderId: number): ConversationMember | undefined {
    return conv.members.find(m => m.id === senderId);
  }

  getOtherMember(conv: Conversation): ConversationMember | undefined {
    return conv.members.find(m => m.id !== this.chatService.meId());
  }

  goToProfile(userId: number, event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/profile', userId]);
  }

  formatTime(iso: string | undefined): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();
    const hm = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    if (isToday) return hm;
    if (isYesterday) return `Yest ${hm}`;
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diffDays < 7) return d.toLocaleDateString('en-GB', { weekday: 'short' }) + ` ${hm}`;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
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
    const file = this.pendingFile();
    if ((!content && !file) || !conv || this.uploading()) return;

    if (file) {
      this.uploading.set(true);
      this.uploadError.set(null);
      this.chatService.uploadFile(file).subscribe({
        next: ({ url, fileName }) => {
          this.chatService.sendMessage(conv.id, content, conv.type, url, fileName);
          this.newMessage.set('');
          this.clearPendingFile();
          this.uploading.set(false);
          this.shouldScroll = true;
        },
        error: (err) => {
          this.uploading.set(false);
          this.uploadError.set(err?.error?.message ?? err?.message ?? 'Upload failed');
        },
      });
    } else {
      this.chatService.sendMessage(conv.id, content, conv.type);
      this.newMessage.set('');
      this.shouldScroll = true;
    }
  }

  onAttachClick() {
    this.fileInput.nativeElement.click();
  }

  onFileSelected(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (this.pendingFilePreviewUrl()) URL.revokeObjectURL(this.pendingFilePreviewUrl()!);
    this.pendingFile.set(file);
    this.pendingFilePreviewUrl.set(file.type.startsWith('image/') ? URL.createObjectURL(file) : null);
    (e.target as HTMLInputElement).value = '';
  }

  clearPendingFile() {
    if (this.pendingFilePreviewUrl()) URL.revokeObjectURL(this.pendingFilePreviewUrl()!);
    this.pendingFile.set(null);
    this.pendingFilePreviewUrl.set(null);
  }

  isImage(url: string): boolean {
    return /\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(url);
  }

  downloadFile(url: string, fileName: string) {
    fetch(url)
      .then(r => r.blob())
      .then(blob => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = fileName || 'file';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
      })
      .catch(() => window.open(url, '_blank'));
  }

  onSearch(e: Event) {
    const q = (e.target as HTMLInputElement).value;
    this.searchQuery.set(q);
    clearTimeout(this.searchTimer);
    this.searchResults.set([]);
    if (q.length < 2) { this.searchLoading.set(false); return; }
    this.searchLoading.set(true);
    this.searchTimer = setTimeout(() => {
      this.chatService.searchUsers(q).subscribe({
        next: res => { this.searchResults.set(res.users); this.searchLoading.set(false); },
        error: () => this.searchLoading.set(false),
      });
    }, 300);
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
    this.queryParamSub?.unsubscribe();
    clearTimeout(this.dmTimer);
    clearTimeout(this.gcTimer);
    clearTimeout(this.searchTimer);
    if (this.pendingFilePreviewUrl()) URL.revokeObjectURL(this.pendingFilePreviewUrl()!);
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
