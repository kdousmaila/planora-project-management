using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Planora.Application.Interfaces;
using UglyToad.PdfPig; // ← la lib PDF

namespace Planora.Infrastructure.Services;

public class ChatbotService : IChatbotService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;

    public ChatbotService(HttpClient httpClient, IConfiguration configuration)
    {
        _httpClient = httpClient;
        _configuration = configuration;
    }

    // ← Nouvelle méthode : extrait le texte d'un PDF
    public string ExtractTextFromPdf(string filePath)
    {
        if (!File.Exists(filePath)) return "";
        using var pdf = PdfDocument.Open(filePath);
        var sb = new StringBuilder();
        foreach (var page in pdf.GetPages())
            sb.AppendLine(page.Text);
        return sb.ToString();
    }

    public async Task<string> GetResponseAsync(string message, string? context = null)
    {
        var apiKey = _configuration["OpenAI:ApiKey"];
        if (string.IsNullOrEmpty(apiKey))
            return "Chatbot is not configured.";

        var model = _configuration["OpenAI:Chat:Options:Model"] ?? "gpt-4o-mini";
        var baseUrl = _configuration["OpenAI:BaseUrl"] ?? "https://api.openai.com/v1";

        var systemMessage = "You are a helpful project management assistant for Planora.";
        if (!string.IsNullOrEmpty(context))
            systemMessage += $"\n\nVoici le contenu du fichier envoyé par l'utilisateur:\n{context}";

        var requestBody = new
        {
            model,
            messages = new[]
            {
                new { role = "system", content = systemMessage },
                new { role = "user", content = message }
            },
            max_tokens = 1000
        };

        var normalizedBaseUrl = baseUrl.TrimEnd('/');
        var completionsPath = normalizedBaseUrl.EndsWith("/v1")
            ? "/chat/completions"
            : "/v1/chat/completions";

        using var request = new HttpRequestMessage(HttpMethod.Post, $"{normalizedBaseUrl}{completionsPath}");
        request.Headers.Add("Authorization", $"Bearer {apiKey}");
        request.Content = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");

        var response = await _httpClient.SendAsync(request);
        if (!response.IsSuccessStatusCode)
            return "Unable to get a response from the AI assistant.";

        var result = await response.Content.ReadFromJsonAsync<JsonElement>();
        return result.GetProperty("choices")[0].GetProperty("message").GetProperty("content").GetString()
               ?? "No response received.";
    }
}