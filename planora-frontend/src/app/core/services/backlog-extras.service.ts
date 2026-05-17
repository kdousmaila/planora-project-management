// src/app/core/services/backlog-extras.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ApiResponse,
  BacklogLink, CreateBacklogLinkRequest,
  BacklogAttachment,
  BacklogWebLink, CreateBacklogWebLinkRequest
} from '../models';

export interface BacklogBranchDto {
  id: string;
  backlogItemId: string;
  branchName: string;
  createdById: string;
  createdByName: string;
  createdAt: string;
}

export interface BacklogCommitDto {
  id: string;
  backlogItemId: string;
  branchId: string;        // ← important for client-side filtering
  branchName: string;
  hash: string;
  message: string;
  createdById: string;
  createdByName: string;
  createdAt: string;
}

export interface BacklogBranchWithCommits {
  id: string;
  backlogItemId: string;
  branchName: string;
  createdById: string;
  createdByName: string;
  createdAt: string;
  commits: BacklogCommitDto[];
}

export interface CreateBacklogBranchRequest {
  branchName: string;
}

export interface CreateBacklogCommitRequest {
  hash: string;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class BacklogExtrasService {
  private http = inject(HttpClient);

  // Deux bases d'URL distinctes selon le controller
  private extrasBase = (id: string) => `${environment.apiUrl}/api/backlog/${id}`;
  private devBase = (id: string) => `${environment.apiUrl}/api/backlog-items/${id}/dev`;

  // ── TICKET LINKS ──
  getLinks(backlogItemId: string): Observable<ApiResponse<BacklogLink[]>> {
    return this.http.get<ApiResponse<BacklogLink[]>>(`${this.extrasBase(backlogItemId)}/links`);
  }

  addLink(backlogItemId: string, dto: CreateBacklogLinkRequest): Observable<ApiResponse<{ id: string }>> {
    return this.http.post<ApiResponse<{ id: string }>>(`${this.extrasBase(backlogItemId)}/links`, dto);
  }

  deleteLink(backlogItemId: string, linkId: string): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.extrasBase(backlogItemId)}/links/${linkId}`);
  }

  // ── ATTACHMENTS ──
  getAttachments(backlogItemId: string): Observable<ApiResponse<BacklogAttachment[]>> {
    return this.http.get<ApiResponse<BacklogAttachment[]>>(`${this.extrasBase(backlogItemId)}/attachments`);
  }

  uploadAttachment(backlogItemId: string, file: File): Observable<ApiResponse<BacklogAttachment>> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<ApiResponse<BacklogAttachment>>(`${this.extrasBase(backlogItemId)}/attachments`, fd);
  }

  downloadAttachment(backlogItemId: string, attachmentId: string): Observable<Blob> {
    return this.http.get(
      `${this.extrasBase(backlogItemId)}/attachments/${attachmentId}/download`,
      { responseType: 'blob' }
    );
  }

  deleteAttachment(backlogItemId: string, attachmentId: string): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.extrasBase(backlogItemId)}/attachments/${attachmentId}`);
  }

  getDownloadUrl(backlogItemId: string, attachmentId: string): string {
    return `${environment.apiUrl}/api/backlog/${backlogItemId}/attachments/${attachmentId}/download`;
  }

  // ── WEB LINKS ──
  getWebLinks(backlogItemId: string): Observable<ApiResponse<BacklogWebLink[]>> {
    return this.http.get<ApiResponse<BacklogWebLink[]>>(`${this.extrasBase(backlogItemId)}/weblinks`);
  }

  addWebLink(backlogItemId: string, dto: CreateBacklogWebLinkRequest): Observable<ApiResponse<BacklogWebLink>> {
    return this.http.post<ApiResponse<BacklogWebLink>>(`${this.extrasBase(backlogItemId)}/weblinks`, dto);
  }

  deleteWebLink(backlogItemId: string, webLinkId: string): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.extrasBase(backlogItemId)}/weblinks/${webLinkId}`);
  }

  // ── SEARCH TICKETS ──
  searchTickets(projectId: string, q: string): Observable<ApiResponse<{ id: string; title: string; status: number }[]>> {
    return this.http.get<ApiResponse<any>>(
      `${environment.apiUrl}/api/backlog/project/${projectId}/search`,
      { params: { q } }
    );
  }

  // ── BRANCHES  →  BacklogDevController ──
  getBranches(backlogItemId: string): Observable<ApiResponse<BacklogBranchDto[]>> {
    return this.http.get<ApiResponse<BacklogBranchDto[]>>(`${this.devBase(backlogItemId)}/branches`);
  }

  addBranch(backlogItemId: string, request: CreateBacklogBranchRequest): Observable<ApiResponse<BacklogBranchDto>> {
    return this.http.post<ApiResponse<BacklogBranchDto>>(`${this.devBase(backlogItemId)}/branches`, request);
  }

  deleteBranch(backlogItemId: string, branchId: string): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.devBase(backlogItemId)}/branches/${branchId}`);
  }

  // ── COMMITS  →  BacklogDevController ──
  getCommits(backlogItemId: string): Observable<ApiResponse<BacklogCommitDto[]>> {
    // BacklogExtrasController : GET /api/backlog/{id}/commits
    return this.http.get<ApiResponse<BacklogCommitDto[]>>(`${this.extrasBase(backlogItemId)}/commits`);
  }

  addCommit(
    backlogItemId: string,
    branchId: string,
    request: CreateBacklogCommitRequest
  ): Observable<ApiResponse<BacklogCommitDto>> {
    // BacklogDevController : POST /api/backlog-items/{id}/dev/commits
    // branchId is sent in the body, not the URL
    return this.http.post<ApiResponse<BacklogCommitDto>>(
      `${this.devBase(backlogItemId)}/commits`,
      { ...request, branchId }   // ← on fusionne branchId dans le body
    );
  }

  deleteCommit(backlogItemId: string, branchId: string, commitId: string): Observable<ApiResponse<null>> {
    // BacklogDevController : DELETE /api/backlog-items/{id}/dev/commits/{commitId}
    return this.http.delete<ApiResponse<null>>(`${this.devBase(backlogItemId)}/commits/${commitId}`);
  }
}
