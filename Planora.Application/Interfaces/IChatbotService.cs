namespace Planora.Application.Interfaces;

public interface IChatbotService
{
    Task<string> GetResponseAsync(string message, string? context = null);
    string ExtractTextFromPdf(string filePath);
}