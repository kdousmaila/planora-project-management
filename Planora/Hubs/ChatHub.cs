using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;

namespace Planora.Hubs;

public class ChatHub : Hub
{
    public async Task JoinSession(string sessionId)
        => await Groups.AddToGroupAsync(Context.ConnectionId, sessionId);

    public async Task LeaveSession(string sessionId)
        => await Groups.RemoveFromGroupAsync(Context.ConnectionId, sessionId);

    public async Task JoinProject(string projectId)
        => await Groups.AddToGroupAsync(Context.ConnectionId, $"project_{projectId}");

    public async Task LeaveProject(string projectId)
        => await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"project_{projectId}");

    // ✅ With role verification
    public async Task JoinProjectManagers(string projectId)
    {
        var isAdmin = Context.User?.IsInRole("Admin") == true;
        var isPM = Context.User?.IsInRole("ProjectManager") == true;

        if (!isAdmin && !isPM)
            throw new HubException("Access denied.");

        await Groups.AddToGroupAsync(Context.ConnectionId, $"managers_{projectId}");
    }

    public async Task LeaveProjectManagers(string projectId)
        => await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"managers_{projectId}");
}