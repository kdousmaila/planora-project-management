import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ApiResponse,
  ChatMessage,
  ChatSession,
  CreateChatSessionRequest,
  SendChatMessageRequest
} from '../models';

// ── Request/Response types ────────────────────────────────────────────────────

export interface EditMessageRequest {
  content: string;
}

export interface ToggleReactionRequest {
  emoji: string;
  add: boolean;
}

export interface UploadResult {
  url: string;
  name: string;
  size: number;
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class ChatInboxService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/api/projects`;

  // ── Sessions ────────────────────────────────────────────────────────────────

  getSessions(projectId: string): Observable<ApiResponse<ChatSession[]>> {
    return this.http.get<ApiResponse<ChatSession[]>>(
      `${this.baseUrl}/${projectId}/chat/sessions`
    );
  }

  createSession(
    projectId: string,
    request: CreateChatSessionRequest
  ): Observable<ApiResponse<ChatSession>> {
    return this.http.post<ApiResponse<ChatSession>>(
      `${this.baseUrl}/${projectId}/chat/sessions`,
      request
    );
  }

  getSession(projectId: string, sessionId: string): Observable<ApiResponse<ChatSession>> {
    return this.http.get<ApiResponse<ChatSession>>(
      `${this.baseUrl}/${projectId}/chat/sessions/${sessionId}`
    );
  }

  deleteSession(projectId: string, sessionId: string): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(
      `${this.baseUrl}/${projectId}/chat/sessions/${sessionId}`
    );
  }

  // ── Messages ─────────────────────────────────────────────────────────────────

  getMessages(
    projectId: string,
    sessionId: string
  ): Observable<ApiResponse<ChatMessage[]>> {
    return this.http.get<ApiResponse<ChatMessage[]>>(
      `${this.baseUrl}/${projectId}/chat/sessions/${sessionId}/messages`
    );
  }

  sendMessage(
    projectId: string,
    sessionId: string,
    request: SendChatMessageRequest
  ): Observable<ApiResponse<ChatMessage>> {
    return this.http.post<ApiResponse<ChatMessage>>(
      `${this.baseUrl}/${projectId}/chat/sessions/${sessionId}/messages`,
      request
    );
  }

  editMessage(
    projectId: string,
    sessionId: string,
    messageId: string,
    content: string
  ): Observable<ApiResponse<ChatMessage>> {
    return this.http.patch<ApiResponse<ChatMessage>>(
      `${this.baseUrl}/${projectId}/chat/sessions/${sessionId}/messages/${messageId}`,
      { content } satisfies EditMessageRequest
    );
  }

  deleteMessage(
    projectId: string,
    sessionId: string,
    messageId: string
  ): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(
      `${this.baseUrl}/${projectId}/chat/sessions/${sessionId}/messages/${messageId}`
    );
  }

  // ── Reactions ─────────────────────────────────────────────────────────────────

  toggleReaction(
    projectId: string,
    sessionId: string,
    messageId: string,
    emoji: string,
    add: boolean
  ): Observable<ApiResponse<null>> {
    return this.http.post<ApiResponse<null>>(
      `${this.baseUrl}/${projectId}/chat/sessions/${sessionId}/messages/${messageId}/reactions`,
      { emoji, add } satisfies ToggleReactionRequest
    );
  }

  // ── File upload ───────────────────────────────────────────────────────────────

  uploadFile(
    projectId: string,
    file: File
  ): Observable<ApiResponse<UploadResult>> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ApiResponse<UploadResult>>(
      `${this.baseUrl}/${projectId}/chat/upload`,
      formData
    );
  }
}
