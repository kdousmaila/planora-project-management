import {
  Component, Input, OnInit, OnDestroy, inject,
  ViewChild, ElementRef, AfterViewChecked, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject, takeUntil } from 'rxjs';
import * as signalR from '@microsoft/signalr';
import { ChatInboxService } from '../../../../core/services/chat-inbox.service';
import { MeetingService } from '../../../../core/services/meeting.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ApiResponse, ChatSession, ChatMessage, PinnedMessage } from '../../../../core/models';
import { environment } from '../../../../../environments/environment';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ProjectService } from '../../../../core/services/project.service';
import { HttpClient } from '@angular/common/http';

// ── Types ────────────────────────────────────────────────────────────────────

export type MessageType = 'text' | 'image' | 'file' | 'sticker' | 'audio';
export type ReactionEmoji = '👍' | '❤️' | '😂' | '😮' | '😢' | '🔥';

export interface MessageAttachment {
  type: 'image' | 'file' | 'audio';
  url: string;
  name: string;
  size?: number;
  mimeType?: string;
  thumbnail?: string;
}

export interface MessageReaction {
  emoji: ReactionEmoji;
  userId: string;
  userName: string;
}

export interface EnhancedChatMessage extends ChatMessage {
  messageType?: MessageType;
  attachments?: MessageAttachment[];
  reactions?: MessageReaction[];
  replyTo?: { id: string; content: string; senderName: string };
  editedAt?: string;
  isEdited?: boolean;
  isDeleted?: boolean;
  stickerUrl?: string;
}

export interface ToastNotif {
  id: string;
  senderName: string;
  content: string;
  sessionTitle: string;
  sessionId: string;
  visible: boolean;
}

export interface UploadProgress {
  fileName: string;
  progress: number;
  done: boolean;
}

// ── Stickers pack ─────────────────────────────────────────────────────────────

export const STICKER_PACKS = [
  {
    name: 'Réactions',
    stickers: [
      { id: 's1', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f44d/512.gif', label: '👍' },
      { id: 's2', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/2764_fe0f/512.gif', label: '❤️' },
      { id: 's3', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f525/512.gif', label: '🔥' },
      { id: 's4', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f389/512.gif', label: '🎉' },
      { id: 's5', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f622/512.gif', label: '😢' },
      { id: 's6', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f602/512.gif', label: '😂' },
      { id: 's7', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f914/512.gif', label: '🤔' },
      { id: 's8', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f44f/512.gif', label: '👏' },
    ]
  }
];

export const QUICK_REACTIONS: ReactionEmoji[] = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

// ── Component ─────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-chat-bubble',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, MatIconModule, MatTooltipModule],
  templateUrl: './chat-bubble.component.html',
  styleUrls: ['./chat-bubble.component.scss']
})
export class ChatBubbleComponent implements OnInit, OnDestroy, AfterViewChecked {
  @Input() projectId!: string;
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;
  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('imageInput') imageInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('audioInput') audioInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('chatInputEl') chatInputEl!: ElementRef<HTMLTextAreaElement>;

  private chatService = inject(ChatInboxService);
  private meetingService = inject(MeetingService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private destroy$ = new Subject<void>();
  private hubConnection!: signalR.HubConnection;
  private router = inject(Router);
  private projectService = inject(ProjectService);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);

  // ── State ──────────────────────────────────────────────────────────────────

  isOpen = false;
  sessions: ChatSession[] = [];
  messages: EnhancedChatMessage[] = [];
  selectedSession: ChatSession | null = null;
  creatingSession = false;
  sendingMessage = false;
  showNewSessionForm = false;
  isAiTyping = false;
  private shouldScrollToBottom = false;

  unreadCount = 0;
  toasts: ToastNotif[] = [];
  pinnedMessages: PinnedMessage[] = [];

  // ── Media & Attachments ────────────────────────────────────────────────────

  showEmojiPicker = false;
  showStickerPicker = false;
  showAttachMenu = false;
  uploadingFiles: UploadProgress[] = [];
  pendingAttachments: MessageAttachment[] = [];
  isDraggingOver = false;
  isRecording = false;
  recordingSeconds = 0;
  private recordingInterval: ReturnType<typeof setInterval> | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  stickerPacks = STICKER_PACKS;
  quickReactions = QUICK_REACTIONS;

  // ── Reply & Edit ────────────────────────────────────────────────────────────

  replyingTo: EnhancedChatMessage | null = null;
  editingMessage: EnhancedChatMessage | null = null;
  hoveredMessageId: string | null = null;
  showReactionsFor: string | null = null;

  // ── Search ─────────────────────────────────────────────────────────────────

  showSearch = false;
  searchQuery = '';
  searchResults: EnhancedChatMessage[] = [];
  searchIndex = 0;

  // ── Schedule popup ─────────────────────────────────────────────────────────

  showSchedulePopup = false;
  scheduleTargetMsg: ChatMessage | null = null;
  scheduleDate = '';
  scheduleTime = '';
  scheduleTitle = '';
  scheduleMode: 'task' | 'meet' | null = null;
  scheduleMeetVisibility: 'all' | 'specific' = 'all';
  scheduleMeetMemberIds: Set<string> = new Set();
  projectMembers: { userId: string; fullName: string }[] = [];

  get todayStr(): string {
    return new Date().toISOString().split('T')[0];
  }

  messageForm = this.fb.group({
    content: [{ value: '', disabled: true }, [Validators.minLength(0)]]
  });

  sessionForm = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(3)]]
  });

  get currentUserId(): string | undefined {
    return this.authService.currentUser?.userId;
  }

  get canPin(): boolean {
    return this.authService.hasRole(['Admin', 'ProjectManager']);
  }

  // 3. Dans canSend, utilise getRawValue() car le control peut être disabled
  get canSend(): boolean {
    const txt = (this.messageForm.getRawValue().content || '').trim();
    return (txt.length > 0 || this.pendingAttachments.length > 0) && !this.sendingMessage;
  }

  get filteredMessages(): EnhancedChatMessage[] {
    if (!this.searchQuery.trim()) return this.messages;
    return this.messages.filter(m =>
      m.content.toLowerCase().includes(this.searchQuery.toLowerCase())
    );
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.meetingService.getPinnedMessages(this.projectId)
      .pipe(takeUntil(this.destroy$))
      .subscribe((res: ApiResponse<PinnedMessage[]>) => {
        if (res.success) this.pinnedMessages = res.data;
      });

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${environment.apiUrl}/hubs/chat`, { withCredentials: true })
      .withAutomaticReconnect()
      .build();

    this.hubConnection.on('SessionDeleted', (deletedSessionId: string) => {
      this.toasts = this.toasts.filter(t => t.sessionId !== deletedSessionId);
      this.sessions = this.sessions.filter(s => s.id !== deletedSessionId);
      if (this.selectedSession?.id === deletedSessionId) {
        this.messages = [];
        this.isAiTyping = false;
        this.selectedSession = this.sessions[0] ?? null;
        if (this.selectedSession) this.selectSession(this.selectedSession);
      }
    });

    this.hubConnection.on('SessionCreated', (newSession: ChatSession) => {
      const alreadyExists = this.sessions.some(s => s.id === newSession.id);
      if (!alreadyExists) {
        this.sessions = [newSession, ...this.sessions];
      }
    });

    this.hubConnection.on('ReceiveMessage', (message: EnhancedChatMessage) => {
      const isDuplicate = this.messages.find(m => m.id === message.id);
      if (isDuplicate) return;

      if (message.isAssistant) this.isAiTyping = false;

      const isFromOther = message.senderUserId !== this.currentUserId;
      const isCurrentSession = this.selectedSession?.id === (message.chatSessionId?.toString());

      if (isFromOther || message.isAssistant) {
        if (!this.isOpen || !isCurrentSession) {
          this.unreadCount++;
          this.showToast(message);
        }
      }

      if (isCurrentSession) {
        this.messages.push(message);
        this.shouldScrollToBottom = true;
      }
    });

    this.hubConnection.on('MessageReaction', (data: { messageId: string; reaction: MessageReaction; add: boolean }) => {
      const msg = this.messages.find(m => m.id === data.messageId);
      if (!msg) return;
      if (!msg.reactions) msg.reactions = [];
      if (data.add) {
        const exists = msg.reactions.find(r => r.userId === data.reaction.userId && r.emoji === data.reaction.emoji);
        if (!exists) msg.reactions.push(data.reaction);
      } else {
        msg.reactions = msg.reactions.filter(r => !(r.userId === data.reaction.userId && r.emoji === data.reaction.emoji));
      }
      this.cdr.markForCheck();
    });

    this.hubConnection.on('MessageEdited', (data: { messageId: string; content: string; editedAt: string }) => {
      const msg = this.messages.find(m => m.id === data.messageId);
      if (msg) {
        msg.content = data.content;
        msg.isEdited = true;
        msg.editedAt = data.editedAt;
        this.cdr.markForCheck();
      }
    });

    this.hubConnection.on('MessageDeleted', (messageId: string) => {
      const msg = this.messages.find(m => m.id === messageId);
      if (msg) {
        msg.isDeleted = true;
        msg.content = 'Ce message a été supprimé';
        this.cdr.markForCheck();
      }
    });

    this.hubConnection.start()
      .then(() => {
        this.hubConnection.invoke('JoinProject', this.projectId)
          .catch((err: unknown) => console.error('JoinProject error:', err));
      })
      .catch((err: unknown) => console.error('SignalR erreur:', err));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.hubConnection?.stop();
    this.stopRecording();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  // ── Emoji ──────────────────────────────────────────────────────────────────

  /**
   * Insert emoji at cursor position in the textarea, then close picker.
   * Using patchValue alone does not move the cursor — we manipulate the
   * native textarea directly so the caret stays in the right place.
   */
  insertEmoji(emoji: string): void {
    const textarea = this.chatInputEl?.nativeElement;
    if (!textarea) {
      const current = this.messageForm.getRawValue().content || '';
      this.messageForm.controls.content.setValue(current + emoji);
      this.showEmojiPicker = false;
      return;
    }

    const start = textarea.selectionStart ?? textarea.value.length;
    const end = textarea.selectionEnd ?? textarea.value.length;
    const before = textarea.value.substring(0, start);
    const after = textarea.value.substring(end);
    const newValue = before + emoji + after;

    // Update both native value and form control
    textarea.value = newValue;
    this.messageForm.patchValue({ content: newValue });
    this.messageForm.controls.content.setValue(newValue);
    // Restore cursor position after the inserted emoji
    const newCursor = start + emoji.length;
    textarea.setSelectionRange(newCursor, newCursor);
    textarea.focus();

    this.showEmojiPicker = false;
    this.cdr.markForCheck();
  }

  // ── Toast ──────────────────────────────────────────────────────────────────

  showToast(message: EnhancedChatMessage): void {
    const session = this.sessions.find(s => s.id === message.chatSessionId?.toString());
    const toast: ToastNotif = {
      id: message.id.toString(),
      senderName: message.isAssistant ? '🤖 Planora AI' : (message.senderName || 'Membre'),
      content: message.messageType === 'image' ? '📷 Image' :
        message.messageType === 'file' ? '📎 Fichier' :
          message.messageType === 'sticker' ? '🎭 Sticker' :
            message.content.length > 60 ? message.content.slice(0, 60) + '…' : message.content,
      sessionTitle: session?.title || 'Conversation',
      sessionId: message.chatSessionId?.toString() || '',
      visible: true
    };
    this.toasts.push(toast);
    setTimeout(() => this.dismissToast(toast.id), 5000);
  }

  dismissToast(id: string): void {
    const toast = this.toasts.find(t => t.id === id);
    if (toast) {
      toast.visible = false;
      setTimeout(() => { this.toasts = this.toasts.filter(t => t.id !== id); }, 300);
    }
  }

  openFromToast(toast: ToastNotif): void {
    this.dismissToast(toast.id);
    this.isOpen = true;
    this.unreadCount = 0;
    const session = this.sessions.find(s => s.id === toast.sessionId);
    if (session) this.selectSession(session);
  }

  // ── Chat Window ────────────────────────────────────────────────────────────

  toggleChat(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.unreadCount = 0;
      if (this.sessions.length === 0) {
        if (this.hubConnection.state === signalR.HubConnectionState.Connected) {
          this.loadSessions();
        } else {
          this.hubConnection.start()
            .then(() => this.loadSessions())
            .catch((err: unknown) => console.error(err));
        }
      }
    }
  }

  loadSessions(): void {
    this.chatService.getSessions(this.projectId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: ApiResponse<ChatSession[]>) => {
          this.sessions = res.success ? res.data : [];
          if (!this.selectedSession && this.sessions.length > 0) {
            this.selectSession(this.sessions[0]);
          }
        }
      });
  }

  selectSession(session: ChatSession): void {
    if (this.selectedSession && this.selectedSession.id !== session.id) {
      if (this.hubConnection.state === signalR.HubConnectionState.Connected) {
        this.hubConnection.invoke('LeaveSession', this.selectedSession.id)
          .catch((err: unknown) => console.error('LeaveSession error:', err));
      }
    }
    this.messageForm.controls.content.enable();
    this.selectedSession = session;
    this.showNewSessionForm = false;
    this.isAiTyping = false;
    this.messages = [];
    this.replyingTo = null;
    this.editingMessage = null;

    const joinSession = (): void => {
      this.hubConnection.invoke('JoinSession', session.id)
        .catch((err: unknown) => console.error('JoinSession error:', err));
    };

    if (this.hubConnection.state === signalR.HubConnectionState.Connected) {
      joinSession();
    } else {
      this.hubConnection.start()
        .then(() => joinSession())
        .catch((err: unknown) => console.error(err));
    }

    this.chatService.getMessages(this.projectId, session.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: ApiResponse<ChatMessage[]>) => {
          this.messages = (res.success ? res.data : []) as EnhancedChatMessage[];
          this.shouldScrollToBottom = true;
        }
      });
  }

  // ── Send Message ───────────────────────────────────────────────────────────

  sendMessage(): void {
    if (!this.selectedSession || this.sendingMessage) return;
    const content = (this.messageForm.getRawValue().content || '').trim();
    if (!content && this.pendingAttachments.length === 0) return;

    if (this.editingMessage) {
      this.confirmEdit(content);
      return;
    }

    this.sendingMessage = true;
    const isAiCommand = content.toLowerCase().startsWith('@chat');

    const payload: any = { content };
    if (this.replyingTo) payload.replyToMessageId = this.replyingTo.id;
    if (this.pendingAttachments.length > 0) payload.attachments = this.pendingAttachments;

    this.chatService.sendMessage(this.projectId, this.selectedSession.id, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: ApiResponse<ChatMessage>) => {
          this.sendingMessage = false;
          if (res.success && res.data) {
            this.messageForm.reset();
            this.replyingTo = null;
            this.pendingAttachments = [];
            if (!this.messages.find(m => m.id === res.data.id)) {
              this.messages.push(res.data as EnhancedChatMessage);
              this.shouldScrollToBottom = true;
            }
            if (isAiCommand) {
              this.isAiTyping = true;
              this.shouldScrollToBottom = true;
            }
          }
        },
        error: () => {
          this.sendingMessage = false;
          this.isAiTyping = false;
        }
      });
  }

  sendSticker(sticker: { id: string; url: string; label: string }): void {
    if (!this.selectedSession) return;
    this.showStickerPicker = false;

    const payload = {
      content: sticker.label,
      messageType: 'sticker',
      stickerUrl: sticker.url
    };

    this.chatService.sendMessage(this.projectId, this.selectedSession.id, payload as any)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: ApiResponse<ChatMessage>) => {
          if (res.success && res.data) {
            const enhanced = res.data as EnhancedChatMessage;
            enhanced.messageType = 'sticker';
            enhanced.stickerUrl = sticker.url;
            if (!this.messages.find(m => m.id === res.data.id)) {
              this.messages.push(enhanced);
              this.shouldScrollToBottom = true;
            }
          }
        }
      });
  }

  // ── Edit & Delete ──────────────────────────────────────────────────────────

  startEdit(msg: EnhancedChatMessage): void {
    this.editingMessage = msg;
    this.replyingTo = null;
    this.messageForm.patchValue({ content: msg.content });
    setTimeout(() => this.chatInputEl?.nativeElement?.focus(), 50);
  }

  confirmEdit(newContent: string): void {
    if (!this.editingMessage || !newContent.trim()) return;
    this.http.patch(`${environment.apiUrl}/api/projects/${this.projectId}/chat/sessions/${this.selectedSession?.id}/messages/${this.editingMessage.id}`,
      { content: newContent })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          const msg = this.messages.find(m => m.id === this.editingMessage!.id);
          if (msg) {
            msg.content = newContent.trim();
            msg.isEdited = true;
            msg.editedAt = new Date().toISOString();
          }
          this.editingMessage = null;
          this.messageForm.reset();
          this.sendingMessage = false;
        },
        error: () => { this.sendingMessage = false; this.editingMessage = null; }
      });
  }

  cancelEdit(): void {
    this.editingMessage = null;
    this.messageForm.reset();
  }

  deleteMessage(msg: EnhancedChatMessage): void {
    if (!confirm('Supprimer ce message ?')) return;
    this.http.delete(`${environment.apiUrl}/api/projects/${this.projectId}/chat/sessions/${this.selectedSession?.id}/messages/${msg.id}`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          msg.isDeleted = true;
          msg.content = 'Ce message a été supprimé';
        }
      });
  }

  // ── Reactions ──────────────────────────────────────────────────────────────

  toggleReaction(msg: EnhancedChatMessage, emoji: ReactionEmoji): void {
    if (!msg.reactions) msg.reactions = [];
    const existing = msg.reactions.find(r => r.userId === this.currentUserId && r.emoji === emoji);

    if (existing) {
      msg.reactions = msg.reactions.filter(r => !(r.userId === this.currentUserId && r.emoji === emoji));
    } else {
      msg.reactions.push({ emoji, userId: this.currentUserId!, userName: 'Moi' });
    }

    this.showReactionsFor = null;
    this.cdr.markForCheck();

    this.http.post(`${environment.apiUrl}/api/projects/${this.projectId}/chat/sessions/${this.selectedSession?.id}/messages/${msg.id}/reactions`,
      { emoji, add: !existing })
      .pipe(takeUntil(this.destroy$))
      .subscribe();
  }

  getReactionGroups(msg: EnhancedChatMessage): { emoji: string; count: number; mine: boolean }[] {
    if (!msg.reactions?.length) return [];
    const groups: Record<string, { count: number; mine: boolean }> = {};
    for (const r of msg.reactions) {
      if (!groups[r.emoji]) groups[r.emoji] = { count: 0, mine: false };
      groups[r.emoji].count++;
      if (r.userId === this.currentUserId) groups[r.emoji].mine = true;
    }
    return Object.entries(groups).map(([emoji, data]) => ({ emoji, ...data }));
  }

  // ── Reply ──────────────────────────────────────────────────────────────────

  setReply(msg: EnhancedChatMessage): void {
    this.replyingTo = msg;
    this.editingMessage = null;
    setTimeout(() => this.chatInputEl?.nativeElement?.focus(), 50);
  }

  cancelReply(): void {
    this.replyingTo = null;
  }

  scrollToMessage(id: string): void {
    const el = document.getElementById(`msg-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('highlight');
      setTimeout(() => el.classList.remove('highlight'), 1500);
    }
  }

  // ── Files & Media ──────────────────────────────────────────────────────────
  triggerFileInput(): void {
    this.showAttachMenu = false;
    this.cdr.detectChanges();
    setTimeout(() => this.fileInputRef?.nativeElement.click(), 0);
  }

  triggerImageInput(): void {
    this.showAttachMenu = false;
    this.cdr.detectChanges();
    setTimeout(() => this.imageInputRef?.nativeElement.click(), 0);
  }
  onFileSelected(event: Event, type: 'file' | 'image'): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    Array.from(input.files).forEach(file => this.uploadFile(file, type));
    input.value = '';
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDraggingOver = true;
  }

  onDragLeave(): void {
    this.isDraggingOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDraggingOver = false;
    const files = event.dataTransfer?.files;
    if (!files?.length) return;
    Array.from(files).forEach(file => {
      const type = file.type.startsWith('image/') ? 'image' : 'file';
      this.uploadFile(file, type);
    });
  }

  private uploadFile(file: File, type: 'file' | 'image'): void {
    const progress: UploadProgress = { fileName: file.name, progress: 0, done: false };
    this.uploadingFiles.push(progress);

    // Simulation de progression pendant l'upload
    const progressInterval = setInterval(() => {
      if (progress.progress < 80) {
        progress.progress += 10;
        this.cdr.markForCheck();
      }
    }, 200);

    this.chatService.uploadFile(this.projectId, file)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          clearInterval(progressInterval);
          progress.progress = 100;
          progress.done = true;
          this.cdr.markForCheck();

          // URL absolue pointant vers le backend
          const fullUrl = `${environment.apiUrl}${res.data.url}`;

          this.pendingAttachments.push({
            type,
            url: fullUrl,
            name: res.data.name,
            size: res.data.size,
            mimeType: file.type,
            thumbnail: type === 'image' ? fullUrl : undefined
          });

          setTimeout(() => {
            this.uploadingFiles = this.uploadingFiles.filter(u => u !== progress);
            this.cdr.markForCheck();
          }, 500);
        },
        error: () => {
          clearInterval(progressInterval);
          this.uploadingFiles = this.uploadingFiles.filter(u => u !== progress);
          this.cdr.markForCheck();
          alert(`Échec de l'upload de ${file.name}`);
        }
      });
  }
  removePendingAttachment(att: MessageAttachment): void {
    this.pendingAttachments = this.pendingAttachments.filter(a => a !== att);
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  // ── Voice Recording ────────────────────────────────────────────────────────

  async startRecording(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];
      this.isRecording = true;
      this.recordingSeconds = 0;

      this.mediaRecorder.ondataavailable = e => this.audioChunks.push(e.data);
      // 2. Dans startRecording(), remplace la ligne uploadFile par uploadAudioAndSend :
      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.audioChunks, { type: 'audio/webm' });
        const file = new File([blob], `audio-${Date.now()}.webm`, { type: 'audio/webm' });
        this.uploadAudioAndSend(file);  // ← était this.uploadFile(file, 'file')
        stream.getTracks().forEach(t => t.stop());
      };

      this.mediaRecorder.start();
      this.recordingInterval = setInterval(() => { this.recordingSeconds++; this.cdr.markForCheck(); }, 1000);
    } catch (err) {
      console.error('Microphone access denied:', err);
    }
  }

  stopRecording(): void {
    if (this.recordingInterval) clearInterval(this.recordingInterval);
    this.mediaRecorder?.stop();
    this.isRecording = false;
    this.mediaRecorder = null;
  }

  cancelRecording(): void {
    if (this.recordingInterval) clearInterval(this.recordingInterval);
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.ondataavailable = null;
      this.mediaRecorder.onstop = null;
      this.mediaRecorder.stop();
      this.mediaRecorder = null;
    }
    this.isRecording = false;
    this.audioChunks = [];
  }

  formatRecordingTime(): string {
    const m = Math.floor(this.recordingSeconds / 60).toString().padStart(2, '0');
    const s = (this.recordingSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  // ── Search ─────────────────────────────────────────────────────────────────

  toggleSearch(): void {
    this.showSearch = !this.showSearch;
    if (!this.showSearch) this.searchQuery = '';
  }

  onSearchChange(): void {
    this.searchResults = this.messages.filter(m =>
      m.content.toLowerCase().includes(this.searchQuery.toLowerCase())
    );
    this.searchIndex = 0;
    if (this.searchResults.length > 0) {
      this.scrollToMessage(this.searchResults[0].id);
    }
  }

  searchPrev(): void {
    if (!this.searchResults.length) return;
    this.searchIndex = (this.searchIndex - 1 + this.searchResults.length) % this.searchResults.length;
    this.scrollToMessage(this.searchResults[this.searchIndex].id);
  }

  searchNext(): void {
    if (!this.searchResults.length) return;
    this.searchIndex = (this.searchIndex + 1) % this.searchResults.length;
    this.scrollToMessage(this.searchResults[this.searchIndex].id);
  }

  // ── Sessions ───────────────────────────────────────────────────────────────

  createSession(): void {
    if (this.sessionForm.invalid || this.creatingSession) return;
    this.creatingSession = true;
    const title = this.sessionForm.value.title!.trim();
    this.chatService.createSession(this.projectId, { title })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: ApiResponse<ChatSession>) => {
          this.creatingSession = false;
          if (res.success && res.data) {
            this.sessionForm.reset();
            this.showNewSessionForm = false;
            this.selectSession(res.data);
          }
        },
        error: () => { this.creatingSession = false; }
      });
  }

  deleteSession(session: ChatSession, event: MouseEvent): void {
    event.stopPropagation();
    if (!confirm(`Supprimer la conversation "${session.title}" ?`)) return;
    this.chatService.deleteSession(this.projectId, session.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({ error: () => console.error('Erreur suppression session') });
  }

  // ── Pin ────────────────────────────────────────────────────────────────────

  isPinned(msg: ChatMessage): boolean {
    return this.pinnedMessages.some(p => p.chatMessageId === msg.id.toString());
  }

  togglePin(msg: ChatMessage): void {
    const existing = this.pinnedMessages.find(p => p.chatMessageId === msg.id.toString());
    if (existing) {
      this.meetingService.unpinMessage(this.projectId, existing.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          this.pinnedMessages = this.pinnedMessages.filter(p => p.id !== existing.id);
        });
    } else {
      this.meetingService.pinMessage(this.projectId, msg.id.toString())
        .pipe(takeUntil(this.destroy$))
        .subscribe((res: ApiResponse<PinnedMessage>) => {
          if (res.success) this.pinnedMessages.push(res.data);
        });
    }
  }

  // ── Keyboard ───────────────────────────────────────────────────────────────

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
    if (event.key === 'Escape') {
      this.cancelReply();
      this.cancelEdit();
      this.showEmojiPicker = false;
      this.showStickerPicker = false;
      this.showAttachMenu = false;
    }
  }

  closeAllPickers(event?: MouseEvent): void {
    // Ne ferme que si le clic vient du wrapper lui-même, pas d'un enfant
    if (event && event.target !== event.currentTarget) return;
    this.showEmojiPicker = false;
    this.showStickerPicker = false;
    this.showAttachMenu = false;
    this.showReactionsFor = null;
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  isMine(message: ChatMessage): boolean {
    return message.senderUserId === this.currentUserId;
  }

  isChatCommand(message: ChatMessage): boolean {
    return message.content.trimStart().toLowerCase().startsWith('@chat');
  }

  isImage(att: MessageAttachment): boolean {
    return att.type === 'image' || (att.mimeType?.startsWith('image/') ?? false);
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  }

  getSenderColor(name: string): string {
    const colors = ['#7C3AED', '#DB2777', '#0891B2', '#059669', '#D97706', '#DC2626'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  }

  shouldShowAvatar(index: number): boolean {
    if (index === 0) return true;
    const prev = this.messages[index - 1];
    const curr = this.messages[index];
    return prev.senderUserId !== curr.senderUserId;
  }

  shouldShowTimestamp(index: number): boolean {
    if (index === 0) return true;
    const prev = this.messages[index - 1];
    const curr = this.messages[index];
    const diff = new Date(curr.createdAt).getTime() - new Date(prev.createdAt).getTime();
    return diff > 5 * 60 * 1000;
  }

  formatTime(dateStr: string): string {
    return new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return "Aujourd'hui";
    if (d.toDateString() === yesterday.toDateString()) return 'Hier';
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  }

  private scrollToBottom(): void {
    try {
      const el = this.messagesContainer?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch { }
  }

  // ── Schedule Popup ─────────────────────────────────────────────────────────

  openSchedulePopup(msg: ChatMessage): void {
    this.scheduleTargetMsg = msg;
    this.scheduleDate = this.todayStr;
    this.scheduleTime = '09:00';
    this.scheduleTitle = '';
    this.scheduleMode = null;
    this.scheduleMeetVisibility = 'all';
    this.scheduleMeetMemberIds = new Set();
    this.showSchedulePopup = true;

    this.projectService.getProject(this.projectId)
      .pipe(takeUntil(this.destroy$))
      .subscribe((res: ApiResponse<any>) => {
        if (res.success) {
          this.projectMembers = (res.data.members ?? []).map((m: any) => ({
            userId: m.userId,
            fullName: m.fullName
          }));
        }
      });
  }

  closeSchedulePopup(): void {
    this.showSchedulePopup = false;
    this.scheduleTargetMsg = null;
    this.scheduleMode = null;
  }

  confirmSchedule(): void {
    if (!this.scheduleDate || !this.scheduleTime || !this.scheduleTitle
      || !this.scheduleTargetMsg || !this.scheduleMode) return;

    const scheduledAt = new Date(`${this.scheduleDate}T${this.scheduleTime}`);
    const alreadyPinned = this.pinnedMessages.find(
      p => p.chatMessageId === this.scheduleTargetMsg!.id.toString()
    );

    const proceed = (pinnedId: string) => {
      const visibleMemberIds = this.scheduleMeetVisibility === 'all'
        ? []
        : Array.from(this.scheduleMeetMemberIds);

      this.meetingService.createMeeting(this.projectId, {
        title: this.scheduleTitle,
        scheduledAt: scheduledAt.toISOString(),
        pinnedMessageIds: [pinnedId],
        withMeet: this.scheduleMode === 'meet',
        visibleMemberIds
      }).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.closeSchedulePopup();
          this.router.navigate(['/projects', this.projectId, 'calendar']);
        },
        error: (err) => console.error('Erreur création', err)
      });
    };

    if (alreadyPinned) {
      proceed(alreadyPinned.id);
    } else {
      this.meetingService.pinMessage(this.projectId, this.scheduleTargetMsg.id.toString())
        .pipe(takeUntil(this.destroy$))
        .subscribe((res: ApiResponse<PinnedMessage>) => {
          if (res.success) {
            this.pinnedMessages.push(res.data);
            proceed(res.data.id);
          }
        });
    }
  }

  private uploadAudioAndSend(file: File): void {
    if (!this.selectedSession) return;

    const progress: UploadProgress = { fileName: file.name, progress: 0, done: false };
    this.uploadingFiles.push(progress);

    const progressInterval = setInterval(() => {
      if (progress.progress < 80) { progress.progress += 20; this.cdr.markForCheck(); }
    }, 150);

    this.chatService.uploadFile(this.projectId, file)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          clearInterval(progressInterval);
          progress.progress = 100;
          progress.done = true;

          const fullUrl = `${environment.apiUrl}${res.data.url}`;

          // Envoie directement le message audio
          const payload: any = {
            content: '🎤 Message vocal',
            messageType: 'audio',
            attachments: [{
              type: 'audio',
              url: fullUrl,
              name: res.data.name,
              size: res.data.size,
              mimeType: 'audio/webm'
            }]
          };

          this.chatService.sendMessage(this.projectId, this.selectedSession!.id, payload)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (msgRes) => {
                if (msgRes.success && msgRes.data) {
                  const enhanced = msgRes.data as EnhancedChatMessage;
                  enhanced.messageType = 'audio';
                  if (!this.messages.find(m => m.id === msgRes.data.id)) {
                    this.messages.push(enhanced);
                    this.shouldScrollToBottom = true;
                  }
                }
                this.uploadingFiles = this.uploadingFiles.filter(u => u !== progress);
                this.cdr.markForCheck();
              }
            });
        },
        error: () => {
          clearInterval(progressInterval);
          this.uploadingFiles = this.uploadingFiles.filter(u => u !== progress);
          this.cdr.markForCheck();
          alert('Échec de l\'envoi du message vocal');
        }
      });
  }
  toggleScheduleMember(userId: string): void {
    if (this.scheduleMeetMemberIds.has(userId)) {
      this.scheduleMeetMemberIds.delete(userId);
    } else {
      this.scheduleMeetMemberIds.add(userId);
    }
  }
  downloadAttachment(url: string, fileName: string): void {
    // Extraire le chemin relatif depuis l'URL absolue
    const path = url.replace(environment.apiUrl, '');
    const downloadUrl = `${environment.apiUrl}/api/projects/${this.projectId}/chat/download?path=${encodeURIComponent(path)}`;

    fetch(downloadUrl, { credentials: 'include' })
      .then(res => {
        if (!res.ok) throw new Error('Erreur réseau');
        return res.blob();
      })
      .then(blob => {
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = fileName || 'fichier';
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        requestAnimationFrame(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(objectUrl);
        });
      })
      .catch(() => alert('Échec du téléchargement'));
  }
}
