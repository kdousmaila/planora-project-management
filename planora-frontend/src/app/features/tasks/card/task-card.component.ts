// src/app/features/tasks/card/task-card.component.ts
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

export interface TaskCardData {
  id: string;
  title: string;
  description?: string;
  priority: number;
  status?: number;
  assignedToName?: string;
  sprintName?: string;
  code?: string;
}

@Component({
  selector: 'app-task-card',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './task-card.component.html',
  styleUrls: ['./task-card.component.scss']
})
export class TaskCardComponent {

  @Input() task!: TaskCardData;
  @Input() showStatus = true;
  @Input() showSprint = false;
  @Input() draggable = true;

  @Output() onClick = new EventEmitter<TaskCardData>();
  @Output() onEdit = new EventEmitter<TaskCardData>();
  @Output() onDelete = new EventEmitter<TaskCardData>();

  getPriorityLabel(priority: number): string {
    return ['Low', 'Medium', 'High', 'Critical'][priority] ?? '';
  }

  getPriorityClass(priority: number): string {
    return [
      'priority-low',
      'priority-medium',
      'priority-high',
      'priority-critical'
    ][priority] ?? '';
  }

  getStatusLabel(status: number): string {
    return ['To Do', 'In Progress', 'Done'][status] ?? '';
  }

  getStatusClass(status: number): string {
    return [
      'status-todo',
      'status-inprogress',
      'status-done'
    ][status] ?? '';
  }

  onCardClick(): void {
    this.onClick.emit(this.task);
  }

  edit(event: Event): void {
    event.stopPropagation();
    this.onEdit.emit(this.task);
  }

  delete(event: Event): void {
    event.stopPropagation();
    this.onDelete.emit(this.task);
  }

}
