using System.ComponentModel.DataAnnotations;

namespace Planora.Application.DTOs.Auth;

public class RegisterDto
{
    [Required]
    public string FirstName { get; set; } = string.Empty;

    [Required]
    public string LastName { get; set; } = string.Empty;

    // ✅ Valide que c'est un vrai format email avant même d'entrer dans le service
    [Required]
    [EmailAddress(ErrorMessage = "L'adresse email n'est pas valide.")]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string UserName { get; set; } = string.Empty;

    [Required]
    [MinLength(8, ErrorMessage = "Le mot de passe doit contenir au moins 8 caractères.")]
    public string Password { get; set; } = string.Empty;
}