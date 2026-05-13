import {
  Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BacklogExtrasService } from '../../../../core/services/backlog-extras.service';
import {
  BacklogLink, BacklogAttachment, BacklogWebLink,
  BacklogBranch, BacklogCommit,
  WEB_LINK_TYPES, TICKET_LINK_TYPES
} from '../../../../core/models';

type MenuAction = 'link' | 'attachment' | 'weblink' | 'branch' | 'commit' | null;

// Local extension: branch enriched with its commits
interface BranchWithCommits extends BacklogBranch {
  commits: BacklogCommit[];
}

@Component({
  selector: 'app-backlog-extras-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './backlog-extras-panel.component.html',
  styleUrls: ['./backlog-extras-panel.component.scss']
})
export class BacklogExtrasPanelComponent implements OnChanges {
  @Input() backlogItemId: string | null = null;
  @Input() projectId: string = '';
  @Output() devUpdated = new EventEmitter<void>();

  private svc = inject(BacklogExtrasService);
  private snack = inject(MatSnackBar);

  // ── Data ──
  links: BacklogLink[] = [];
  attachments: BacklogAttachment[] = [];
  webLinks: BacklogWebLink[] = [];
  branchesWithCommits: BranchWithCommits[] = [];

  // ── Menu ──
  plusMenuOpen = false;
  activeAction: 'link' | 'attachment' | 'weblink' | 'branch' | 'commit' | null = null;

  // ── Link form ──
  ticketSearchQuery = '';
  ticketSearchResults: { id: string; title: string; status: number }[] = [];
  selectedLinkType = 0;
  searchLoading = false;

  // ── Web link form ──
  newUrl = '';
  newLabel = '';
  newWebLinkType = 0;

  // ── Branch form ──
  newBranchName = '';
  savingBranch = false;

  // ── Commit form ──
  newCommitHash = '';
  newCommitMsg = '';
  savingCommit = false;
  selectedBranchId = '';

  // ── Upload ──
  uploading = false;

  readonly webLinkTypes = WEB_LINK_TYPES;
  readonly ticketLinkTypes = TICKET_LINK_TYPES;

  @Input() set triggerAction(action: 'branch' | 'commit' | null) {
    if (action) this.openAction(action);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['backlogItemId'] && this.backlogItemId) {
      this.loadAll();
    }
  }

  private loadAll(): void {
    if (!this.backlogItemId) return;
    this.svc.getLinks(this.backlogItemId).subscribe(r => { if (r.success) this.links = r.data; });
    this.svc.getAttachments(this.backlogItemId).subscribe(r => { if (r.success) this.attachments = r.data; });
    this.svc.getWebLinks(this.backlogItemId).subscribe(r => { if (r.success) this.webLinks = r.data; });
    this.loadBranchesWithCommits();
  }

  private loadBranchesWithCommits(): void {
    if (!this.backlogItemId) return;
    this.svc.getBranches(this.backlogItemId).subscribe(rb => {
      if (!rb.success) return;
      const branches: BacklogBranch[] = rb.data;
      // Initialize each branch with an empty array
      this.branchesWithCommits = branches.map(b => ({ ...b, commits: [] }));

      // Load all commits then distribute them into their branches
      this.svc.getCommits(this.backlogItemId!).subscribe(rc => {
        if (!rc.success) return;
        const allCommits: BacklogCommit[] = rc.data;
        for (const bwc of this.branchesWithCommits) {
          bwc.commits = allCommits.filter(c => c.branchId === bwc.id);
        }
      });
    });
  }

  openAction(action: MenuAction): void {
    this.plusMenuOpen = false;
    this.activeAction = action;
    this.resetForms();
    // Pre-select if only one branch available
    if (action === 'commit' && this.branchesWithCommits.length === 1) {
      this.selectedBranchId = this.branchesWithCommits[0].id;
    }
  }

  openCommitForBranch(branchId: string): void {
    this.selectedBranchId = branchId;
    this.activeAction = 'commit';
    this.newCommitHash = '';
    this.newCommitMsg = '';
  }

  closeAction(): void {
    this.activeAction = null;
    this.resetForms();
  }

  private resetForms(): void {
    this.ticketSearchQuery = '';
    this.ticketSearchResults = [];
    this.newUrl = '';
    this.newLabel = '';
    this.newWebLinkType = 0;
    this.selectedLinkType = 0;
    this.newBranchName = '';
    this.newCommitHash = '';
    this.newCommitMsg = '';
    this.selectedBranchId = '';
  }

  // ── Ticket link ──
  searchTickets(): void {
    if (!this.ticketSearchQuery.trim()) { this.ticketSearchResults = []; return; }
    this.searchLoading = true;
    this.svc.searchTickets(this.projectId, this.ticketSearchQuery).subscribe({
      next: r => {
        this.searchLoading = false;
        if (r.success) this.ticketSearchResults = r.data.filter((t: any) => t.id !== this.backlogItemId);
      },
      error: () => { this.searchLoading = false; }
    });
  }

  selectTicket(ticket: { id: string; title: string; status: number }): void {
    if (!this.backlogItemId) return;
    this.svc.addLink(this.backlogItemId, {
      targetItemId: ticket.id,
      linkType: this.selectedLinkType
    }).subscribe({
      next: r => {
        if (r.success) {
          this.snack.open('Link created', 'Close', { duration: 2000 });
          this.closeAction();
          this.svc.getLinks(this.backlogItemId!).subscribe(lr => { if (lr.success) this.links = lr.data; });
        }
      },
      error: () => this.snack.open('Error', 'Close', { duration: 3000 })
    });
  }

  deleteLink(link: BacklogLink): void {
    if (!this.backlogItemId) return;
    this.svc.deleteLink(this.backlogItemId, link.id).subscribe({
      next: r => {
        if (r.success) {
          this.links = this.links.filter(l => l.id !== link.id);
          this.snack.open('Deleted', 'Close', { duration: 2000 });
        }
      }
    });
  }

  getLinksByType(links: BacklogLink[], type: number): BacklogLink[] {
    return links.filter(l => l.linkType === type);
  }

  // ── Attachment ──
  triggerFileInput(): void {
    document.getElementById('file-input-' + this.backlogItemId)?.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length || !this.backlogItemId) return;
    const file = input.files[0];
    this.uploading = true;
    this.svc.uploadAttachment(this.backlogItemId, file).subscribe({
      next: r => {
        this.uploading = false;
        if (r.success) {
          this.attachments = [r.data, ...this.attachments];
          this.snack.open('File added', 'Close', { duration: 2000 });
          this.closeAction();
        }
      },
      error: () => { this.uploading = false; this.snack.open('Upload error', 'Close', { duration: 3000 }); }
    });
    input.value = '';
  }

  downloadAttachment(att: BacklogAttachment): void {
    if (!this.backlogItemId) return;
    this.svc.downloadAttachment(this.backlogItemId, att.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = att.fileName; a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => this.snack.open('Download error', 'Close', { duration: 3000 })
    });
  }

  deleteAttachment(att: BacklogAttachment): void {
    if (!this.backlogItemId) return;
    this.svc.deleteAttachment(this.backlogItemId, att.id).subscribe({
      next: r => {
        if (r.success) {
          this.attachments = this.attachments.filter(a => a.id !== att.id);
          this.snack.open('Deleted', 'Close', { duration: 2000 });
        }
      }
    });
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  getFileIcon(contentType: string): string {
    if (contentType.startsWith('image/')) return 'image';
    if (contentType === 'application/pdf') return 'picture_as_pdf';
    if (contentType.includes('word')) return 'description';
    if (contentType.includes('excel') || contentType.includes('sheet')) return 'table_chart';
    if (contentType.includes('zip') || contentType.includes('rar')) return 'folder_zip';
    return 'attach_file';
  }

  // ── Web link ──
  saveWebLink(): void {
    if (!this.newUrl.trim() || !this.backlogItemId) return;
    this.svc.addWebLink(this.backlogItemId, {
      url: this.newUrl.trim(),
      label: this.newLabel.trim() || this.newUrl.trim(),
      linkType: this.newWebLinkType
    }).subscribe({
      next: r => {
        if (r.success) {
          this.webLinks = [r.data, ...this.webLinks];
          this.snack.open('Link added', 'Close', { duration: 2000 });
          this.closeAction();
        }
      },
      error: () => this.snack.open('Error', 'Close', { duration: 3000 })
    });
  }

  deleteWebLink(wl: BacklogWebLink): void {
    if (!this.backlogItemId) return;
    this.svc.deleteWebLink(this.backlogItemId, wl.id).subscribe({
      next: r => {
        if (r.success) {
          this.webLinks = this.webLinks.filter(w => w.id !== wl.id);
          this.snack.open('Deleted', 'Close', { duration: 2000 });
        }
      }
    });
  }

  getWebLinkIcon(type: number): string {
    return this.webLinkTypes.find(t => t.value === type)?.icon ?? 'language';
  }

  openUrl(url: string): void {
    window.open(url.startsWith('http') ? url : 'https://' + url, '_blank');
  }

  // ── Branches ──
  saveBranch(): void {
    if (!this.newBranchName.trim() || !this.backlogItemId) return;
    this.savingBranch = true;
    this.svc.addBranch(this.backlogItemId, { branchName: this.newBranchName.trim() }).subscribe({
      next: r => {
        this.savingBranch = false;
        if (r.success) {
          this.branchesWithCommits = [{ ...r.data, commits: [] }, ...this.branchesWithCommits];
          this.snack.open('Branch added', 'Close', { duration: 2000 });
          this.closeAction();
          this.devUpdated.emit();
        }
      },
      error: () => { this.savingBranch = false; this.snack.open('Error', 'Close', { duration: 3000 }); }
    });
  }

  deleteBranch(b: BranchWithCommits): void {
    if (!this.backlogItemId) return;
    this.svc.deleteBranch(this.backlogItemId, b.id).subscribe({
      next: r => {
        if (r.success) {
          this.branchesWithCommits = this.branchesWithCommits.filter(x => x.id !== b.id);
          this.snack.open('Deleted', 'Close', { duration: 2000 });
          this.devUpdated.emit();
        }
      }
    });
  }

  // ── Commits ──
  saveCommit(): void {
    if (!this.newCommitHash.trim() || !this.newCommitMsg.trim()
      || !this.backlogItemId || !this.selectedBranchId) return;
    this.savingCommit = true;
    this.svc.addCommit(this.backlogItemId, this.selectedBranchId, {
      hash: this.newCommitHash.trim(),
      message: this.newCommitMsg.trim()
    }).subscribe({
      next: (r: any) => {
        this.savingCommit = false;
        if (r.success) {
          const branch = this.branchesWithCommits.find(b => b.id === this.selectedBranchId);
          if (branch) {
            branch.commits = [r.data, ...branch.commits];
          }
          this.snack.open('Commit added', 'Close', { duration: 2000 });
          this.closeAction();
          this.devUpdated.emit();
        }
      },
      error: (err: any) => {
        this.savingCommit = false;
        this.snack.open('Error: ' + (err.error?.message || 'Server error'), 'Close', { duration: 3000 });
      }
    });
  }

  deleteCommit(commit: BacklogCommit, branchId: string): void {
    if (!this.backlogItemId) return;
    this.svc.deleteCommit(this.backlogItemId, branchId, commit.id).subscribe({
      next: (r: any) => {
        if (r.success) {
          const branch = this.branchesWithCommits.find(b => b.id === branchId);
          if (branch) {
            branch.commits = branch.commits.filter(x => x.id !== commit.id);
          }
          this.snack.open('Deleted', 'Close', { duration: 2000 });
        }
      },
      error: (err: any) => {
        this.snack.open('Error: ' + (err.error?.message || 'Server error'), 'Close', { duration: 3000 });
      }
    });
  }

  shortHash(hash: string): string {
    return hash.length > 7 ? hash.slice(0, 7) : hash;
  }
}
