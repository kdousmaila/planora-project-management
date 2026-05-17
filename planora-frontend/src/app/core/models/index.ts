// src/app/core/models.ts

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  expiry: string;
  userId: string;
  email: string;
  fullName: string;
  roles: string[];
}

export interface UserData {
  userId: string;
  email: string;
  fullName: string;
  roles: string[];
  expiry: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  userName: string;
  password: string;
}

export interface RefreshRequest {
  token: string;
  refreshToken: string;
}

export interface Project {
  id: string;
  workspaceId: string;
  workspaceName: string;
  workspaceOwnerId: string;
  color?: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  projectManagerId: string;
  projectManagerName: string;
  members?: ProjectMember[];
  memberCount: number;
  totalTasks: number;
  completedTasks: number;
  progressPercentage: number;
}

export interface ChatSession {
  id: string;
  projectId: string;
  title: string;
  createdByUserId: string;
  createdByName: string;
  createdAt: string;
  updatedAt?: string | null;
  messageCount: number;
  lastMessageAt?: string | null;
  lastMessageContent: string;
  lastMessageSenderName: string;
  lastMessageIsAssistant: boolean;
}

export interface ChatMessage {
  id: string;
  chatSessionId: string;
  senderUserId: string;
  senderName: string;
  isAssistant: boolean;
  content: string;
  createdAt: string;
  // ── Nouveaux champs ──
  isDeleted?: boolean;
  isEdited?: boolean;
  editedAt?: string;
  messageType?: string;        // 'text' | 'sticker' | 'file' | 'image' | 'audio'
  stickerUrl?: string;
  attachments?: MessageAttachment[];
  replyTo?: ReplyPreview;
  reactions?: MessageReaction[];
}
export interface ReplyPreview {
  id: string;
  content: string;
  senderName: string;
}
export interface MessageReaction {
  emoji: string;
  userId: string;
  userName: string;
}
export interface MessageAttachment {
  type: string;               // 'image' | 'file' | 'audio'
  url: string;
  name: string;
  size?: number;
  mimeType?: string;
  thumbnail?: string;
}
export interface CreateChatSessionRequest {
  title: string;
}

export interface SendChatMessageRequest {
  content: string;
}

export interface ProjectMember {
  userId: string;
  fullName: string;
  email: string;
}

export interface ProjectInviteableUser {
  userId: string;
  fullName: string;
  email: string;
}

export interface ProjectInvitation {
  id: string;
  projectId: string;
  projectName: string;
  invitedUserId: string;
  invitedUserName: string;
  invitedByUserId: string;
  invitedByUserName: string;
  status: number;
  createdAt: string;
  respondedAt?: string | null;
}

export interface CreateProjectRequest {
  workspaceId: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  projectManagerId: string;
  color?: string;
}

export interface Workspace {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  ownerName: string;
  projectManagerId: string;
  projectManagerName: string;
  hasPendingPMInvitation: boolean;
  memberCount: number;
  projectCount: number;
  createdAt: string;
}

export interface WorkspaceMember {
  userId: string;
  fullName: string;
  email: string;
  joinedAt: string;
  role: string;
}

export interface WorkspaceInvitation {
  id: string;
  workspaceId: string;
  workspaceName: string;
  email: string;
  invitedByUserId: string;
  expiresAt: string;
  accepted: boolean;
  createdAt: string;
}

export interface WorkspaceInviteableUser {
  userId: string;
  fullName: string;
  email: string;
  roles: string[];
}

export interface CreateWorkspaceRequest {
  name: string;
  description: string;
}

export interface SetWorkspaceProjectManagerRequest {
  userId: string;
}

export interface InviteWorkspaceUserRequest {
  userId: string;
  role: 'ProjectManager' | 'Member';
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  progressPercentage: number;
  dueDate: string;
  projectId: string;
  projectName: string;
  assignedToId: string;
  assignedToName: string;
  sprintId: string;
  sprintName: string;
}

export enum TaskStatus {
  Todo = 0,
  InProgress = 1,
  Done = 2
}

export enum TaskPriority {
  Low = 0,
  Medium = 1,
  High = 2,
  Critical = 3
}

export interface CreateTaskRequest {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  progressPercentage: number;
  dueDate: string;
  projectId: string;
  assignedToId: string;
  sprintId: string | null;
}

export interface TaskComment {
  id: string;
  content: string;
  taskId: string;
  authorId: string;
  authorName: string;
  createdAt: string;
}

export interface Sprint {
  id: string;
  name: string;
  goal: string;
  startDate: string;
  endDate: string;
  status: SprintStatus;
  projectId: string;
  projectName: string;
  tasksCount: number;
  completedTasksCount: number;
  progressPercentage: number;
}

export enum SprintStatus {
  Planning = 0,
  Active = 1,
  Closed = 2
}

export interface CreateSprintRequest {
  name: string;
  goal: string;
  startDate: string;
  endDate: string;
  projectId: string;
  status?: number;
}

export interface BacklogItem {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  projectId: string;
  projectName: string;
  sprintId: string | null;
  sprintName: string | null;
  status: TaskStatus;
  assignedToName: string;
  progressPercentage: number;
  dueDate: string;
  assignedToId?: string;
  complexity?: number;
  createdAt?: string;
  updatedAt?: string;
  storyPoints?: number | null;
}

export interface CreateBacklogItemRequest {
  title: string;
  description: string;
  priority: TaskPriority;
  projectId: string;
  assignedToId?: string;
  complexity?: number;
  sprintId?: string | null;
}

export interface UpdateBacklogItemRequest {
  title: string;
  description: string;
  priority: TaskPriority;
  assignedToId?: string | null;
  complexity?: number;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  userName: string;
  roles: string[];
  isActive: boolean;
}

export interface AssignRoleRequest {
  userId: string;
  role: string;
}

export interface DashboardData {
  totalProjects: number;
  activeSprints: number;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  toDoTasks: number;
  overallProgressPercentage: number;
  projectsProgress: ProjectProgress[];
  totalWorkspaces: number;
  workspacesProgress: {
    workspaceId: string;
    workspaceName: string;
    totalProjects: number;
    totalTasks: number;
    completedTasks: number;
    progressPercentage: number;
  }[];
}

export interface ProjectProgress {
  projectId: string;
  projectName: string;
  workspaceName: string;
  progressPercentage: number;
  totalTasks: number;
  completedTasks: number;
}

// ── Backlog Extras ────────────────────────────────────────────

export interface BacklogLink {
  id: string;
  sourceItemId: string;
  targetItemId: string;
  targetItemTitle: string;
  targetItemStatus: string;
  linkType: number;
  linkTypeLabel: string;
  createdAt: string;
}

export interface CreateBacklogLinkRequest {
  targetItemId: string;
  linkType: number;
}

export interface BacklogAttachment {
  id: string;
  backlogItemId: string;
  fileName: string;
  contentType: string;
  fileSizeBytes: number;
  uploadedById: string;
  uploadedByName: string;
  createdAt: string;
}

export interface BacklogWebLink {
  id: string;
  backlogItemId: string;
  url: string;
  label: string;
  linkType: number;
  linkTypeLabel: string;
  addedById: string;
  addedByName: string;
  createdAt: string;
}

export interface CreateBacklogWebLinkRequest {
  url: string;
  label: string;
  linkType: number;
}

export interface BacklogBranch {
  id: string;
  backlogItemId: string;
  branchName: string;
  createdById: string;
  createdByName: string;
  createdAt: string;
}

export interface BacklogCommit {
  id: string;
  backlogItemId: string;
  hash: string;
  branchId?: string;
  message: string;
  createdById: string;
  createdByName: string;
  createdAt: string;
}

export const WEB_LINK_TYPES = [
  { value: 0, label: 'Lien web', icon: 'language' },
  { value: 1, label: 'Video', icon: 'play_circle' },
  { value: 2, label: 'Document', icon: 'description' },
  { value: 3, label: 'Livre', icon: 'menu_book' },
];

export const TICKET_LINK_TYPES = [
  { value: 0, label: 'is related to' },
  { value: 1, label: 'bloque' },
  { value: 2, label: 'is blocked by' },
  { value: 3, label: 'duplique' },
  { value: 4, label: 'is duplicated by' },
];
export interface PinnedMessage {
  id: string;
  chatMessageId: string;
  content: string;
  senderName: string;
  createdAt: string;
  note?: string;
  pinnedAt: string;
}

export interface MeetingEvent {
  id: string;
  title: string;
  scheduledAt: string;
  pinnedMessages: PinnedMessage[];
  withMeet: boolean;
  visibleMemberIds: string[];
}

export interface CreateMeetingRequest {
  title: string;
  scheduledAt: string;
  pinnedMessageIds: string[];
  withMeet: boolean;
  visibleMemberIds: string[];
}
