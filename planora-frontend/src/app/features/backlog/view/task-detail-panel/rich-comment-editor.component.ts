// rich-comment-editor.component.ts
import {
  Component, Input, Output, EventEmitter,
  ElementRef, ViewChild, inject, AfterViewInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

export interface RichComment {
  id: string;
  content: string; // HTML content
  authorId: string;
  authorName: string;
  authorInitial: string;
  createdAt: Date;
  isEditing?: boolean;
}

@Component({
  selector: 'app-rich-comment-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatTooltipModule],
  template: `
<div class="rce-wrapper">

  <!-- ═══════════ COMMENT FEED ═══════════ -->
  <div class="rce-feed" *ngIf="comments.length">
    <div class="rce-comment" *ngFor="let c of comments">
      <div class="rce-av">{{ c.authorInitial }}</div>
      <div class="rce-comment-body">
        <div class="rce-comment-meta">
          <strong class="rce-author">{{ c.authorName }}</strong>
          <span class="rce-date">{{ c.createdAt | date:'d MMM yyyy at HH:mm' }}</span>
          <div class="rce-comment-actions" *ngIf="canDelete(c)">
            <button class="rce-act-btn" (click)="startEdit(c)" matTooltip="Edit">
              <mat-icon>edit</mat-icon>
            </button>
            <button class="rce-act-btn rce-act-btn--del" (click)="deleteComment(c)" matTooltip="Delete">
              <mat-icon>delete_outline</mat-icon>
            </button>
          </div>
        </div>

        <!-- Display mode -->
        <div class="rce-content" *ngIf="!c.isEditing" [innerHTML]="sanitize(c.content)"></div>

        <!-- Edit mode -->
        <div class="rce-edit-wrap" *ngIf="c.isEditing">
          <app-rich-comment-editor
            [backlogItemId]="backlogItemId"
            [currentUserId]="currentUserId"
            [currentUserName]="currentUserName"
            [editMode]="true"
            [editContent]="c.content"
            (saved)="onEditSaved(c, $event)"
            (cancelled)="c.isEditing = false">
          </app-rich-comment-editor>
        </div>
      </div>
    </div>
  </div>

  <div class="rce-empty" *ngIf="!comments.length && !editMode">
    <mat-icon>chat_bubble_outline</mat-icon>
    <p>No comments yet</p>
  </div>

  <!-- ═══════════ COMPOSER ═══════════ -->
  <div class="rce-composer" *ngIf="!editMode" [class.rce-composer--active]="composerOpen">
    <div class="rce-av rce-av--me">{{ currentUserName?.charAt(0)?.toUpperCase() }}</div>

    <div class="rce-editor-wrap" [class.focused]="composerOpen">

      <!-- Collapsed placeholder -->
      <div class="rce-placeholder" *ngIf="!composerOpen" (click)="openComposer()">
        Add a comment…
      </div>

      <!-- Full editor -->
      <ng-container *ngIf="composerOpen">
        <!-- Toolbar -->
        <div class="rce-toolbar">
          <div class="rce-toolbar-group">
            <select class="rce-font-select" (change)="execCmd('fontName', $event)" matTooltip="Font">
              <option value="inherit">Font</option>
              <option value="Arial">Arial</option>
              <option value="Georgia">Georgia</option>
              <option value="'Courier New'">Courier New</option>
              <option value="Verdana">Verdana</option>
              <option value="'Times New Roman'">Times New Roman</option>
            </select>
            <select class="rce-size-select" (change)="execCmd('fontSize', $event)" matTooltip="Size">
              <option value="3">Normal</option>
              <option value="1">Small</option>
              <option value="4">Large</option>
              <option value="5">Very large</option>
            </select>
          </div>

          <div class="rce-toolbar-sep"></div>

          <div class="rce-toolbar-group">
            <button class="rce-tb-btn" (click)="exec('bold')" matTooltip="Bold (Ctrl+B)">
              <mat-icon>format_bold</mat-icon>
            </button>
            <button class="rce-tb-btn" (click)="exec('italic')" matTooltip="Italic (Ctrl+I)">
              <mat-icon>format_italic</mat-icon>
            </button>
            <button class="rce-tb-btn" (click)="exec('underline')" matTooltip="Underline (Ctrl+U)">
              <mat-icon>format_underlined</mat-icon>
            </button>
            <button class="rce-tb-btn" (click)="exec('strikeThrough')" matTooltip="Strikethrough">
              <mat-icon>strikethrough_s</mat-icon>
            </button>
          </div>

          <div class="rce-toolbar-sep"></div>

          <div class="rce-toolbar-group">
            <button class="rce-tb-btn" (click)="exec('insertUnorderedList')" matTooltip="Bullet list">
              <mat-icon>format_list_bulleted</mat-icon>
            </button>
            <button class="rce-tb-btn" (click)="exec('insertOrderedList')" matTooltip="Numbered list">
              <mat-icon>format_list_numbered</mat-icon>
            </button>
            <button class="rce-tb-btn" (click)="exec('indent')" matTooltip="Indent">
              <mat-icon>format_indent_increase</mat-icon>
            </button>
            <button class="rce-tb-btn" (click)="exec('outdent')" matTooltip="Outdent">
              <mat-icon>format_indent_decrease</mat-icon>
            </button>
          </div>

          <div class="rce-toolbar-sep"></div>

          <div class="rce-toolbar-group">
            <button class="rce-tb-btn" (click)="exec('justifyLeft')" matTooltip="Align left">
              <mat-icon>format_align_left</mat-icon>
            </button>
            <button class="rce-tb-btn" (click)="exec('justifyCenter')" matTooltip="Center">
              <mat-icon>format_align_center</mat-icon>
            </button>
            <button class="rce-tb-btn" (click)="exec('justifyRight')" matTooltip="Align right">
              <mat-icon>format_align_right</mat-icon>
            </button>
          </div>

          <div class="rce-toolbar-sep"></div>

          <div class="rce-toolbar-group">
            <!-- Color picker -->
            <div class="rce-color-wrap" matTooltip="Text color">
              <mat-icon>format_color_text</mat-icon>
              <input type="color" class="rce-color-input" (input)="execCmd('foreColor', $event)">
            </div>
            <!-- Highlight -->
            <div class="rce-color-wrap rce-color-wrap--hl" matTooltip="Highlight">
              <mat-icon>highlight</mat-icon>
              <input type="color" class="rce-color-input" value="#FFFF00" (input)="execCmd('hiliteColor', $event)">
            </div>
          </div>

          <div class="rce-toolbar-sep"></div>

          <div class="rce-toolbar-group">
            <button class="rce-tb-btn" (click)="insertLink()" matTooltip="Insert link">
              <mat-icon>link</mat-icon>
            </button>
            <button class="rce-tb-btn" (click)="insertCode()" matTooltip="Inline code">
              <mat-icon>code</mat-icon>
            </button>
            <button class="rce-tb-btn" (click)="insertQuote()" matTooltip="Quote">
              <mat-icon>format_quote</mat-icon>
            </button>
            <button class="rce-tb-btn" (click)="triggerImageUpload()" matTooltip="Insert image">
              <mat-icon>image</mat-icon>
            </button>
            <input #imgInput type="file" accept="image/*" style="display:none"
                   (change)="onImageSelected($event)">
          </div>

          <div class="rce-toolbar-sep"></div>

          <div class="rce-toolbar-group">
            <button class="rce-tb-btn" (click)="exec('undo')" matTooltip="Undo">
              <mat-icon>undo</mat-icon>
            </button>
            <button class="rce-tb-btn" (click)="exec('redo')" matTooltip="Redo">
              <mat-icon>redo</mat-icon>
            </button>
          </div>
        </div>

        <!-- Editable area -->
        <div #editorEl
             class="rce-editable"
             contenteditable="true"
             [attr.data-placeholder]="editMode ? '' : 'Write your comment...'"
             (input)="onEditorInput()"
             (keydown)="onKeydown($event)"
             (paste)="onPaste($event)">
        </div>

        <!-- Footer actions -->
        <div class="rce-footer">
          <div class="rce-footer-left">
            <span class="rce-hint">Ctrl+Enter to save</span>
          </div>
          <div class="rce-footer-right">
            <button class="rce-btn-ghost" (click)="cancel()">Cancel</button>
            <button class="rce-btn-primary" (click)="save()"
                    [disabled]="isEmpty || saving">
              {{ saving ? 'Saving...' : (editMode ? 'Update' : 'Save') }}
            </button>
          </div>
        </div>
      </ng-container>

    </div>
  </div>

  <!-- Edit mode standalone -->
  <div class="rce-edit-standalone" *ngIf="editMode && composerOpen">
    <div class="rce-toolbar">
      <div class="rce-toolbar-group">
        <button class="rce-tb-btn" (click)="exec('bold')"><mat-icon>format_bold</mat-icon></button>
        <button class="rce-tb-btn" (click)="exec('italic')"><mat-icon>format_italic</mat-icon></button>
        <button class="rce-tb-btn" (click)="exec('underline')"><mat-icon>format_underlined</mat-icon></button>
      </div>
      <div class="rce-toolbar-sep"></div>
      <div class="rce-toolbar-group">
        <button class="rce-tb-btn" (click)="exec('insertUnorderedList')"><mat-icon>format_list_bulleted</mat-icon></button>
        <button class="rce-tb-btn" (click)="exec('insertOrderedList')"><mat-icon>format_list_numbered</mat-icon></button>
      </div>
      <div class="rce-toolbar-sep"></div>
      <div class="rce-toolbar-group">
        <button class="rce-tb-btn" (click)="insertLink()"><mat-icon>link</mat-icon></button>
        <button class="rce-tb-btn" (click)="triggerImageUpload()"><mat-icon>image</mat-icon></button>
        <input #imgInput2 type="file" accept="image/*" style="display:none" (change)="onImageSelected($event)">
      </div>
    </div>
    <div #editorEl class="rce-editable"
         contenteditable="true"
         (input)="onEditorInput()"
         (keydown)="onKeydown($event)">
    </div>
    <div class="rce-footer">
      <button class="rce-btn-ghost" (click)="cancelled.emit()">Cancel</button>
      <button class="rce-btn-primary" (click)="save()" [disabled]="isEmpty || saving">
        {{ saving ? '...' : 'Update' }}
      </button>
    </div>
  </div>

</div>
  `,
  styles: [`
    /* ─── Variables ─── */
    :host {
      --rce-bg: #ffffff;
      --rce-border: #dfe1e6;
      --rce-border-focus: #0052cc;
      --rce-toolbar-bg: #f4f5f7;
      --rce-btn-hover: #e4e5e9;
      --rce-primary: #0052cc;
      --rce-primary-hover: #0747a6;
      --rce-text: #172b4d;
      --rce-muted: #6b778c;
      --rce-danger: #de350b;
      --rce-radius: 4px;
      --rce-av-size: 32px;
      display: block;
    }

    /* ─── Feed ─── */
    .rce-feed { display: flex; flex-direction: column; gap: 16px; margin-bottom: 20px; }

    .rce-comment {
      display: flex;
      gap: 10px;
      align-items: flex-start;
    }

    .rce-av {
      width: var(--rce-av-size);
      height: var(--rce-av-size);
      min-width: var(--rce-av-size);
      border-radius: 50%;
      background: var(--rce-primary);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      font-weight: 700;
    }
    .rce-av--me { background: #00875a; }

    .rce-comment-body { flex: 1; min-width: 0; }

    .rce-comment-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
    }
    .rce-author { font-size: 13px; color: var(--rce-text); }
    .rce-date { font-size: 12px; color: var(--rce-muted); }

    .rce-comment-actions {
      display: none;
      gap: 2px;
      margin-left: auto;
    }
    .rce-comment:hover .rce-comment-actions { display: flex; }

    .rce-act-btn {
      background: none;
      border: none;
      cursor: pointer;
      padding: 2px 4px;
      border-radius: var(--rce-radius);
      color: var(--rce-muted);
      display: flex;
      align-items: center;
      transition: background 0.15s, color 0.15s;
    }
    .rce-act-btn:hover { background: var(--rce-btn-hover); color: var(--rce-text); }
    .rce-act-btn--del:hover { background: #ffebe6; color: var(--rce-danger); }
    .rce-act-btn mat-icon { font-size: 16px; width: 16px; height: 16px; }

    /* Rich content display */
    .rce-content {
      font-size: 14px;
      line-height: 1.6;
      color: var(--rce-text);
      word-break: break-word;
    }
    .rce-content :is(b, strong) { font-weight: 700; }
    .rce-content :is(i, em) { font-style: italic; }
    .rce-content ul { padding-left: 20px; list-style: disc; }
    .rce-content ol { padding-left: 20px; list-style: decimal; }
    .rce-content code {
      background: #f4f5f7;
      border: 1px solid #dfe1e6;
      border-radius: 3px;
      padding: 1px 5px;
      font-family: 'Courier New', monospace;
      font-size: 12px;
    }
    .rce-content blockquote {
      border-left: 3px solid #dfe1e6;
      margin: 8px 0;
      padding: 4px 12px;
      color: var(--rce-muted);
    }
    .rce-content a { color: var(--rce-primary); text-decoration: underline; }
    .rce-content img { max-width: 100%; border-radius: var(--rce-radius); margin: 4px 0; }

    /* ─── Empty ─── */
    .rce-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      padding: 24px;
      color: var(--rce-muted);
      font-size: 13px;
    }
    .rce-empty mat-icon { font-size: 28px; width: 28px; height: 28px; opacity: 0.4; }

    /* ─── Composer ─── */
    .rce-composer {
      display: flex;
      gap: 10px;
      align-items: flex-start;
    }

    .rce-editor-wrap {
      flex: 1;
      border: 2px solid var(--rce-border);
      border-radius: var(--rce-radius);
      background: var(--rce-bg);
      transition: border-color 0.15s;
      overflow: hidden;
    }
    .rce-editor-wrap.focused { border-color: var(--rce-border-focus); }

    .rce-placeholder {
      padding: 8px 12px;
      color: var(--rce-muted);
      font-size: 14px;
      cursor: text;
      min-height: 36px;
      display: flex;
      align-items: center;
    }
    .rce-placeholder:hover { background: #f8f9fc; }

    /* ─── Toolbar ─── */
    .rce-toolbar {
      display: flex;
      align-items: center;
      gap: 2px;
      padding: 4px 8px;
      background: var(--rce-toolbar-bg);
      border-bottom: 1px solid var(--rce-border);
      flex-wrap: wrap;
    }

    .rce-toolbar-group { display: flex; align-items: center; gap: 1px; }

    .rce-toolbar-sep {
      width: 1px;
      height: 20px;
      background: var(--rce-border);
      margin: 0 4px;
    }

    .rce-tb-btn {
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px;
      border-radius: var(--rce-radius);
      color: var(--rce-text);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.12s;
    }
    .rce-tb-btn:hover { background: var(--rce-btn-hover); }
    .rce-tb-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .rce-font-select, .rce-size-select {
      border: 1px solid var(--rce-border);
      border-radius: var(--rce-radius);
      padding: 2px 4px;
      font-size: 12px;
      background: var(--rce-bg);
      color: var(--rce-text);
      cursor: pointer;
      outline: none;
    }
    .rce-font-select { max-width: 110px; }
    .rce-size-select { max-width: 80px; }

    .rce-color-wrap {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 4px;
      border-radius: var(--rce-radius);
      cursor: pointer;
      transition: background 0.12s;
    }
    .rce-color-wrap:hover { background: var(--rce-btn-hover); }
    .rce-color-wrap mat-icon { font-size: 18px; width: 18px; height: 18px; color: var(--rce-text); }
    .rce-color-wrap--hl mat-icon { color: #f59f00; }

    .rce-color-input {
      position: absolute;
      opacity: 0;
      inset: 0;
      width: 100%;
      height: 100%;
      cursor: pointer;
      border: none;
      padding: 0;
    }

    /* ─── Editable area ─── */
    .rce-editable {
      min-height: 100px;
      max-height: 400px;
      overflow-y: auto;
      padding: 12px;
      font-size: 14px;
      line-height: 1.6;
      color: var(--rce-text);
      outline: none;
      word-break: break-word;
    }
    .rce-editable:empty:before {
      content: attr(data-placeholder);
      color: var(--rce-muted);
      pointer-events: none;
    }
    .rce-editable ul { padding-left: 20px; }
    .rce-editable ol { padding-left: 20px; }
    .rce-editable blockquote {
      border-left: 3px solid #dfe1e6;
      margin: 8px 0;
      padding: 4px 12px;
      color: var(--rce-muted);
    }
    .rce-editable code {
      background: #f4f5f7;
      border: 1px solid #dfe1e6;
      border-radius: 3px;
      padding: 1px 5px;
      font-family: 'Courier New', monospace;
      font-size: 12px;
    }
    .rce-editable img {
      max-width: 100%;
      border-radius: var(--rce-radius);
      display: block;
      margin: 4px 0;
      cursor: default;
    }

    /* ─── Footer ─── */
    .rce-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      border-top: 1px solid var(--rce-border);
      background: #fafbfc;
    }
    .rce-footer-right { display: flex; gap: 8px; }
    .rce-hint { font-size: 11px; color: var(--rce-muted); }

    .rce-btn-primary {
      background: var(--rce-primary);
      color: #fff;
      border: none;
      border-radius: var(--rce-radius);
      padding: 6px 14px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s;
    }
    .rce-btn-primary:hover:not(:disabled) { background: var(--rce-primary-hover); }
    .rce-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

    .rce-btn-ghost {
      background: none;
      border: 1px solid var(--rce-border);
      border-radius: var(--rce-radius);
      padding: 6px 14px;
      font-size: 13px;
      cursor: pointer;
      color: var(--rce-text);
      transition: background 0.15s;
    }
    .rce-btn-ghost:hover { background: var(--rce-btn-hover); }
  `]
})
export class RichCommentEditorComponent implements AfterViewInit {
  @Input() backlogItemId: string | null = null;
  @Input() currentUserId: string = '';
  @Input() currentUserName: string = '';
  @Input() comments: RichComment[] = [];
  @Input() editMode = false;
  @Input() editContent: string = '';

  @Output() saved = new EventEmitter<string>();
  @Output() deleted = new EventEmitter<RichComment>();
  @Output() cancelled = new EventEmitter<void>();

  @ViewChild('editorEl') editorEl!: ElementRef<HTMLDivElement>;
  @ViewChild('imgInput') imgInput!: ElementRef<HTMLInputElement>;

  composerOpen = false;
  saving = false;
  isEmpty = true;

  private sanitizer = inject(DomSanitizer);

  ngAfterViewInit(): void {
    if (this.editMode && this.editorEl) {
      this.composerOpen = true;
      setTimeout(() => {
        if (this.editorEl?.nativeElement) {
          this.editorEl.nativeElement.innerHTML = this.editContent || '';
          this.isEmpty = !this.getContent().trim();
          this.editorEl.nativeElement.focus();
        }
      }, 50);
    }
  }

  openComposer(): void {
    this.composerOpen = true;
    setTimeout(() => {
      this.editorEl?.nativeElement?.focus();
    }, 50);
  }

  // FIX: cast to `any` to suppress TypeScript warnings on deprecated execCommand
  exec(cmd: string): void {
    (document as any).execCommand(cmd, false);
    this.editorEl?.nativeElement?.focus();
  }

  execCmd(cmd: string, event: Event): void {
    const val = (event.target as HTMLSelectElement | HTMLInputElement).value;
    (document as any).execCommand(cmd, false, val);
    this.editorEl?.nativeElement?.focus();
  }

  insertLink(): void {
    const url = prompt('Link URL:');
    if (url) {
      (document as any).execCommand('createLink', false, url);
      this.editorEl?.nativeElement?.querySelectorAll('a').forEach((a: HTMLAnchorElement) => {
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
      });
    }
    this.editorEl?.nativeElement?.focus();
  }

  insertCode(): void {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      const code = document.createElement('code');
      code.textContent = sel.toString() || 'code';
      range.deleteContents();
      range.insertNode(code);
    }
    this.editorEl?.nativeElement?.focus();
  }

  insertQuote(): void {
    (document as any).execCommand('formatBlock', false, 'blockquote');
    this.editorEl?.nativeElement?.focus();
  }

  triggerImageUpload(): void {
    this.imgInput?.nativeElement?.click();
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      (document as any).execCommand('insertImage', false, dataUrl);
      this.isEmpty = false;
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  onEditorInput(): void {
    this.isEmpty = !this.getContent().trim() && !this.editorEl?.nativeElement?.innerHTML?.includes('<img');
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.ctrlKey && event.key === 'Enter') {
      this.save();
    }
    if (event.key === 'Escape') {
      this.cancel();
    }
  }

  onPaste(event: ClipboardEvent): void {
    const items = event.clipboardData?.items;
    if (items) {
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          event.preventDefault();
          const file = item.getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
              (document as any).execCommand('insertImage', false, e.target?.result as string);
              this.isEmpty = false;
            };
            reader.readAsDataURL(file);
            return;
          }
        }
      }
    }
  }

  getContent(): string {
    return this.editorEl?.nativeElement?.innerHTML || '';
  }

  save(): void {
    const html = this.getContent();
    if (!html.trim() && !html.includes('<img')) return;
    this.saved.emit(html);
  }

  cancel(): void {
    this.composerOpen = false;
    if (this.editorEl?.nativeElement) {
      this.editorEl.nativeElement.innerHTML = '';
    }
    this.isEmpty = true;
    this.cancelled.emit();
  }

  resetEditor(): void {
    if (this.editorEl?.nativeElement) {
      this.editorEl.nativeElement.innerHTML = '';
    }
    this.isEmpty = true;
    this.composerOpen = false;
    this.saving = false;
  }

  sanitize(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  canDelete(c: RichComment): boolean {
    return c.authorId === this.currentUserId;
  }

  startEdit(c: RichComment): void {
    c.isEditing = true;
  }

  onEditSaved(comment: RichComment, newHtml: string): void {
    comment.content = newHtml;
    comment.isEditing = false;
  }

  deleteComment(c: RichComment): void {
    this.deleted.emit(c);
  }
}
