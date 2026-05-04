using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Planora.Domain.Entities;

namespace Planora.Infrastructure.Data;

public class ApplicationDbContext : IdentityDbContext<ApplicationUser>
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
    {
    }

    public DbSet<Workspace> Workspaces => Set<Workspace>();
    public DbSet<WorkspaceUser> WorkspaceUsers => Set<WorkspaceUser>();
    public DbSet<WorkspaceInvitation> WorkspaceInvitations => Set<WorkspaceInvitation>();
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<ProjectUser> ProjectUsers => Set<ProjectUser>();
    public DbSet<ProjectInvitation> ProjectInvitations => Set<ProjectInvitation>();
    public DbSet<TaskItem> Tasks => Set<TaskItem>();
    public DbSet<Comment> Comments => Set<Comment>();
    public DbSet<ChatSession> ChatSessions => Set<ChatSession>();
    public DbSet<ChatMessage> ChatMessages => Set<ChatMessage>();
    public DbSet<ChatMessageReaction> ChatMessageReactions => Set<ChatMessageReaction>(); // ✅ NEW
    public DbSet<Sprint> Sprints => Set<Sprint>();
    public DbSet<BacklogItem> BacklogItems => Set<BacklogItem>();
    public DbSet<SubTask> SubTasks => Set<SubTask>();
    public DbSet<BacklogLink> BacklogLinks { get; set; }
    public DbSet<BacklogAttachment> BacklogAttachments { get; set; }
    public DbSet<BacklogWebLink> BacklogWebLinks { get; set; }
    public DbSet<BacklogBranch> BacklogBranches { get; set; }
    public DbSet<BacklogCommit> BacklogCommits { get; set; }
    public DbSet<PinnedMessage> PinnedMessages => Set<PinnedMessage>();
    public DbSet<MeetingEvent> MeetingEvents => Set<MeetingEvent>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        builder.ApplyConfigurationsFromAssembly(typeof(ApplicationDbContext).Assembly);

        // ── MeetingPinnedMessage (composite key) ──────────────────────────────
        builder.Entity<MeetingPinnedMessage>()
            .HasKey(m => new { m.MeetingEventId, m.PinnedMessageId });

        // ── BacklogLink ───────────────────────────────────────────────────────
        builder.Entity<BacklogLink>(b =>
        {
            b.HasKey(x => x.Id);
            b.HasQueryFilter(x => !x.IsDeleted);
            b.HasOne(x => x.SourceItem)
                .WithMany()
                .HasForeignKey(x => x.SourceItemId)
                .OnDelete(DeleteBehavior.Restrict);
            b.HasOne(x => x.TargetItem)
                .WithMany()
                .HasForeignKey(x => x.TargetItemId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ── BacklogAttachment ─────────────────────────────────────────────────
        builder.Entity<BacklogAttachment>(b =>
        {
            b.HasKey(x => x.Id);
            b.HasQueryFilter(x => !x.IsDeleted);
            b.HasOne(x => x.BacklogItem)
                .WithMany()
                .HasForeignKey(x => x.BacklogItemId)
                .OnDelete(DeleteBehavior.Cascade);
            b.HasOne(x => x.UploadedBy)
                .WithMany()
                .HasForeignKey(x => x.UploadedById)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ── BacklogWebLink ────────────────────────────────────────────────────
        builder.Entity<BacklogWebLink>(b =>
        {
            b.HasKey(x => x.Id);
            b.HasQueryFilter(x => !x.IsDeleted);
            b.HasOne(x => x.BacklogItem)
                .WithMany()
                .HasForeignKey(x => x.BacklogItemId)
                .OnDelete(DeleteBehavior.Cascade);
            b.HasOne(x => x.AddedBy)
                .WithMany()
                .HasForeignKey(x => x.AddedById)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ── BacklogBranch ─────────────────────────────────────────────────────
        builder.Entity<BacklogBranch>(b =>
        {
            b.HasKey(x => x.Id);
            b.HasQueryFilter(x => !x.IsDeleted);
            b.HasOne(x => x.BacklogItem)
                .WithMany()
                .HasForeignKey(x => x.BacklogItemId)
                .OnDelete(DeleteBehavior.Cascade);
            b.HasOne(x => x.CreatedBy)
                .WithMany()
                .HasForeignKey(x => x.CreatedById)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ── BacklogCommit ─────────────────────────────────────────────────────
        builder.Entity<BacklogCommit>(b =>
        {
            b.HasKey(x => x.Id);
            b.HasQueryFilter(x => !x.IsDeleted);
            b.HasOne(x => x.BacklogItem)
                .WithMany()
                .HasForeignKey(x => x.BacklogItemId)
                .OnDelete(DeleteBehavior.Cascade);
            b.HasOne(x => x.Branch)
                .WithMany(x => x.Commits)
                .HasForeignKey(x => x.BranchId)
                .OnDelete(DeleteBehavior.Restrict);
            b.HasOne(x => x.CreatedBy)
                .WithMany()
                .HasForeignKey(x => x.CreatedById)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ── Comment ───────────────────────────────────────────────────────────
        builder.Entity<Comment>(b =>
        {
            b.Property(c => c.Content)
             .HasColumnType("nvarchar(max)");
        });

        // ── MeetingEvent ──────────────────────────────────────────────────────
        builder.Entity<MeetingEvent>(b =>
        {
            b.HasKey(x => x.Id);
            b.Property(x => x.Title).IsRequired().HasMaxLength(200);
            b.Property(x => x.VisibleMemberIds).HasColumnType("nvarchar(max)").HasDefaultValue("");
            b.Property(x => x.WithMeet).HasDefaultValue(false);
        });

        // ── ChatSession ───────────────────────────────────────────────────────
        builder.Entity<ChatSession>(b =>
        {
            b.HasKey(x => x.Id);
            b.HasQueryFilter(x => !x.IsDeleted);
            b.Property(x => x.Title)
                .IsRequired()
                .HasMaxLength(150);
            b.HasOne(x => x.Project)
                .WithMany(x => x.ChatSessions)
                .HasForeignKey(x => x.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);
            b.HasOne(x => x.CreatedByUser)
                .WithMany(x => x.ChatSessions)
                .HasForeignKey(x => x.CreatedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ── ChatMessage ───────────────────────────────────────────────────────
        builder.Entity<ChatMessage>(b =>
        {
            b.HasKey(x => x.Id);
            b.HasQueryFilter(x => !x.IsDeleted);

            b.Property(x => x.Content)
                .IsRequired()
                .HasColumnType("nvarchar(max)");

            b.Property(x => x.IsAssistant)
                .HasDefaultValue(false);

            // ✅ New columns for rich messaging
            b.Property(x => x.IsDeleted)
                .HasDefaultValue(false);

            b.Property(x => x.IsEdited)
                .HasDefaultValue(false);

            b.Property(x => x.EditedAt)
                .IsRequired(false);

            b.Property(x => x.MessageType)
                .HasMaxLength(20)
                .HasDefaultValue("text");

            b.Property(x => x.StickerUrl)
                .HasMaxLength(500)
                .IsRequired(false);

            b.Property(x => x.AttachmentsJson)
                .HasColumnType("nvarchar(max)")
                .IsRequired(false);

            b.Property(x => x.ReplyToMessageId)
                .HasMaxLength(36)   // Guid string length
                .IsRequired(false);

            b.HasOne(x => x.ChatSession)
                .WithMany(x => x.Messages)
                .HasForeignKey(x => x.ChatSessionId)
                .OnDelete(DeleteBehavior.Cascade);

            b.HasOne(x => x.SenderUser)
                .WithMany(x => x.ChatMessages)
                .HasForeignKey(x => x.SenderUserId)
                .OnDelete(DeleteBehavior.Restrict)
                .IsRequired(false);

            // ✅ Reactions relationship
            b.HasMany(x => x.Reactions)
                .WithOne(r => r.Message)
                .HasForeignKey(r => r.MessageId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ── ChatMessageReaction ───────────────────────────────────────────────
        builder.Entity<ChatMessageReaction>(b =>
        {
            b.HasKey(x => x.Id);

            b.Property(x => x.Emoji)
                .IsRequired()
                .HasMaxLength(10);

            b.Property(x => x.UserId)
                .IsRequired()
                .HasMaxLength(450);   // matches AspNetUsers.Id length

            // CreatedAt comes from BaseEntity — no need to redeclare

            // ✅ One emoji per user per message — prevents duplicate reactions
            b.HasIndex(x => new { x.MessageId, x.UserId, x.Emoji })
                .IsUnique();

            b.HasOne(x => x.Message)
                .WithMany(m => m.Reactions)
                .HasForeignKey(x => x.MessageId)
                .OnDelete(DeleteBehavior.Cascade);

            // Restrict so deleting a user doesn't cascade-delete all their reactions
            b.HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }
}