using System;

public class BacklogWebLinkDto
{
    public Guid Id { get; set; }
    public Guid BacklogItemId { get; set; }
    public string Url { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public int LinkType { get; set; }
    public string LinkTypeLabel { get; set; } = string.Empty;
    public string AddedByName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}