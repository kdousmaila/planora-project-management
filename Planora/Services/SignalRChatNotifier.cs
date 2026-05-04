using Microsoft.AspNetCore.SignalR;
using Planora.Application.Interfaces;
using Planora.Hubs;
using System.Threading.Tasks;

namespace Planora.Services;

public class SignalRChatNotifier : IChatNotifier
{
    private readonly IHubContext<ChatHub> _hubContext;

    public SignalRChatNotifier(IHubContext<ChatHub> hubContext)
    {
        _hubContext = hubContext;
    }

    public Task SendToSessionAsync(string sessionId, string method, object payload)
        => _hubContext.Clients.Group(sessionId).SendAsync(method, payload);

    public Task SendToProjectAsync(string projectId, string method, object payload)
        => _hubContext.Clients.Group($"project_{projectId}").SendAsync(method, payload);
}