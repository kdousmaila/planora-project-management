using System.ComponentModel.DataAnnotations;

namespace Planora.Application.DTOs.Auth;

public class RegisterDto
{
    [Required]
    public string FirstName { get; set; } = string.Empty;

    [Required]
    public string LastName { get; set; } = string.Empty;

    // ✅ Validate the email format before the service layer runs
    [Required]
    [EmailAddress(ErrorMessage = "The email address is not valid.")]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string UserName { get; set; } = string.Empty;

    [Required]
    [MinLength(8, ErrorMessage = "The password must contain at least 8 characters.")]
    public string Password { get; set; } = string.Empty;
}