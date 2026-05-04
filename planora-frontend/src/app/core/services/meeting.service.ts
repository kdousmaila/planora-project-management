import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, PinnedMessage, MeetingEvent, CreateMeetingRequest } from '../models';

@Injectable({ providedIn: 'root' })
export class MeetingService {
  private http = inject(HttpClient);
  private base = (pid: string) => `${environment.apiUrl}/api/projects/${pid}/meetings`;

  pinMessage(projectId: string, chatMessageId: string, note?: string): Observable<ApiResponse<PinnedMessage>> {
    return this.http.post<ApiResponse<PinnedMessage>>(
      `${this.base(projectId)}/pin`, { chatMessageId, note }
    );
  }

  unpinMessage(projectId: string, pinnedMessageId: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.base(projectId)}/pin/${pinnedMessageId}`);
  }

  getPinnedMessages(projectId: string): Observable<ApiResponse<PinnedMessage[]>> {
    return this.http.get<ApiResponse<PinnedMessage[]>>(`${this.base(projectId)}/pinned`);
  }

  createMeeting(projectId: string, dto: CreateMeetingRequest): Observable<ApiResponse<MeetingEvent>> {
    return this.http.post<ApiResponse<MeetingEvent>>(this.base(projectId), dto);
  }

  getMeetings(projectId: string): Observable<ApiResponse<MeetingEvent[]>> {
    return this.http.get<ApiResponse<MeetingEvent[]>>(this.base(projectId));
  }

}
