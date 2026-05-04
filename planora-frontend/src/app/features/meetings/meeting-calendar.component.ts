import { Component, OnInit, OnDestroy, inject, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Subject, takeUntil } from 'rxjs';
import { MeetingService } from '../../core/services/meeting.service';
import { ApiResponse, PinnedMessage, MeetingEvent } from '../../core/models';
import { CreateMeetingDialogComponent } from './create-meeting-dialog.component';
import { ProjectService } from '../../core/services/project.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-meeting-calendar',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, MatIconModule, MatTooltipModule, MatDialogModule],
  templateUrl: './meeting-calendar.component.html',
  styleUrls: ['./meeting-calendar.component.scss']
})
export class MeetingCalendarComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private meetingService = inject(MeetingService);
  private dialog = inject(MatDialog);
  private destroy$ = new Subject<void>();
  private projectService = inject(ProjectService);
  private authService = inject(AuthService);

  projectId = '';
  currentUserName = '';
  pinnedMessages: PinnedMessage[] = [];
  meetings: MeetingEvent[] = [];
  projectMembers: { userId: string; fullName: string }[] = [];

  showPinned = false;

  today = new Date();
  currentYear = this.today.getFullYear();
  currentMonth = this.today.getMonth();
  calendarDays: (Date | null)[] = [];

  readonly monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  ngOnInit(): void {
    this.projectId = this.route.snapshot.paramMap.get('projectId') ?? '';
    this.buildCalendar();
    this.currentUserName = this.authService.currentUser?.fullName ?? 'Participant';

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

    this.meetingService.getPinnedMessages(this.projectId)
      .pipe(takeUntil(this.destroy$))
      .subscribe((res: ApiResponse<PinnedMessage[]>) => {
        if (res.success) this.pinnedMessages = res.data;
      });

    this.meetingService.getMeetings(this.projectId)
      .pipe(takeUntil(this.destroy$))
      .subscribe((res: ApiResponse<MeetingEvent[]>) => {
        if (res.success) {
          this.meetings = res.data;
          // ✅ Vérifier immédiatement au chargement
          this.checkAndOpenJitsi();
        }
      });

    // ✅ Puis vérifier toutes les minutes
    const interval = setInterval(() => {
      this.checkAndOpenJitsi();
      this.meetings = [...this.meetings];
    }, 60_000);

    // ✅ Nettoyer l'interval à la destruction du composant
    this.destroy$.subscribe(() => clearInterval(interval));
  }

  private checkAndOpenJitsi(): void {
    this.meetings.forEach(meeting => {
      if (meeting.withMeet && this.isMeetActive(meeting.scheduledAt)) {
        const alreadyOpened = sessionStorage.getItem(`jitsi-opened-${meeting.id}`);
        if (!alreadyOpened) {
          sessionStorage.setItem(`jitsi-opened-${meeting.id}`, 'true');
          const name = encodeURIComponent(this.currentUserName || 'Participant');
          window.open(
            `https://meet.jit.si/planora-${meeting.id}#config.prejoinPageEnabled=false&userInfo.displayName=${name}`,
            '_blank'
          );
        }
      }
    });
  }
  // ── Panneau épinglé ───────────────────────────
  togglePinned(): void { this.showPinned = !this.showPinned; }
  closePinned(): void { this.showPinned = false; }
  unpinMessage(pin: PinnedMessage): void {
    this.meetingService.unpinMessage(this.projectId, pin.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.pinnedMessages = this.pinnedMessages.filter(p => p.id !== pin.id);
      });
  }
  // ── Jitsi : nouvel onglet ─────────────────────
  joinMeeting(meeting: MeetingEvent): void {
    const name = encodeURIComponent(this.currentUserName || 'Participant');
    window.open(
      `https://meet.jit.si/planora-${meeting.id}#config.prejoinPageEnabled=false&userInfo.displayName=${name}`,
      '_blank'
    );
  }

  // ── Calendrier ────────────────────────────────
  buildCalendar(): void {
    const firstDay = new Date(this.currentYear, this.currentMonth, 1).getDay();
    const daysInMonth = new Date(this.currentYear, this.currentMonth + 1, 0).getDate();
    const offset = (firstDay + 6) % 7;
    this.calendarDays = [
      ...Array(offset).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) =>
        new Date(this.currentYear, this.currentMonth, i + 1)
      )
    ];
  }

  isMeetActive(scheduledAt: string): boolean {
    // Le backend renvoie sans Z (heure locale serveur) — on parse sans ajouter Z
    const meetTime = new Date(scheduledAt);
    const now = new Date();
    const diffMs = now.getTime() - meetTime.getTime();
    console.log('scheduledAt raw:', scheduledAt, '→ parsed:', meetTime.toLocaleString(), '→ now:', now.toLocaleString(), '→ diff (min):', diffMs / 60000);
    return diffMs >= -15 * 60 * 1000 && diffMs <= 2 * 60 * 60 * 1000;
  }

  isMeetExpired(scheduledAt: string): boolean {
    const meetTime = new Date(scheduledAt);
    const now = new Date();
    return now.getTime() - meetTime.getTime() > 2 * 60 * 60 * 1000;
  }

  nextMonth(): void {
    if (this.currentMonth === 11) { this.currentMonth = 0; this.currentYear++; }
    else { this.currentMonth++; }
    this.buildCalendar();
  }

  prevMonth(): void {
    if (this.currentYear === this.today.getFullYear() &&
      this.currentMonth === this.today.getMonth()) return;
    if (this.currentMonth === 0) { this.currentMonth = 11; this.currentYear--; }
    else { this.currentMonth--; }
    this.buildCalendar();
  }

  getMeetingsForDay(date: Date): MeetingEvent[] {
    return this.meetings.filter(m => {
      const d = new Date(m.scheduledAt); // ← sans + 'Z'
      return d.getDate() === date.getDate() &&
        d.getMonth() === date.getMonth() &&
        d.getFullYear() === date.getFullYear();
    });
  }
  isToday(date: Date): boolean {
    const t = new Date();
    return date.getDate() === t.getDate() &&
      date.getMonth() === t.getMonth() &&
      date.getFullYear() === t.getFullYear();
  }

  isPast(date: Date | string): boolean {
    const d = new Date(date);
    const now = new Date();
    if (date instanceof Date && date.getHours() === 0 && date.getMinutes() === 0) {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const dayOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      return dayOnly < today;
    }
    return d < now;
  }

  openCreateMeeting(date?: Date): void {
    if (date && this.isPast(date)) return;
    this.showPinned = false;
    const ref = this.dialog.open(CreateMeetingDialogComponent, {
      width: '640px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      panelClass: 'meeting-calendar-dialog',
      data: {
        projectId: this.projectId,
        pinnedMessages: this.pinnedMessages,
        date,
        projectMembers: this.projectMembers
      }
    });

    ref.afterClosed().subscribe((result: MeetingEvent | undefined) => {
      if (result) {
        this.meetings = [...this.meetings, result];
        // ✅ Vérifier immédiatement si cette nouvelle réunion est déjà active
        this.checkAndOpenJitsi();
      }
    });
  }  deleteMeeting(meetingId: string): void {
    this.meetings = this.meetings.filter(m => m.id !== meetingId);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
 
  }

