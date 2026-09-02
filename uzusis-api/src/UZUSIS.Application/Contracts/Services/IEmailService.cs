namespace UZUSIS.Application.Contracts.Services;

public interface IEmailService
{
    Task<bool> EnviarConfirmacao(string email);
    Task<bool> EnviarRecuperacao(string email);
}