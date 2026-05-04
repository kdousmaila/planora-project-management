using System;
using System.Threading.Tasks;

namespace Planora.Application.Interfaces;

/// <summary>
/// Abstraction over SignalR broadcasts so Infrastructure never depends on
/// the concrete ChatHub (which lives in the API project).
/// </summary>
public interface IChatNotifier
{
    Task SendToSessionAsync(string sessionId, string method, object payload);
    Task SendToProjectAsync(string projectId, string method, object payload);
}