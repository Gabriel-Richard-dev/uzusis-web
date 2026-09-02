using System.Net;
using System.Net.Mail;
using AutoMapper;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using UZUSIS.Application.Contracts.Services;
using UZUSIS.Application.Notification;
using UZUSIS.Core.EmailAssets;
using UZUSIS.Domain.Contracts.Repositories;
using UZUSIS.Domain.Entities;
using UZUSIS.Domain.Entities.Acessories;

namespace UZUSIS.Application.Services;

public class EmailService : BaseService, IEmailService
{

    private readonly IClienteRepository _clienteRepository; 
    private readonly IPasswordHasher<ConfirmacaoEmail> _hasherConfirmacao;
    private readonly IPasswordHasher<RecuperacaoSenhaEmail> _hasherRecuperacao;
    private readonly IConfiguration _configuration;
    
    public EmailService(INotificator notificator, IMapper mapper, IClienteRepository clienteRepository, IPasswordHasher<ConfirmacaoEmail> hasher, IConfiguration configuration, IPasswordHasher<RecuperacaoSenhaEmail> hasherRecuperacao) : base(notificator, mapper)
    {
        _clienteRepository = clienteRepository;
        _hasherConfirmacao = hasher;
        _configuration = configuration;
        _hasherRecuperacao = hasherRecuperacao;
    }

    public async Task<bool> EnviarConfirmacao(string email)
    {
        var pedido = await _clienteRepository.ObterPedidoDeConfirmacao(email);
        var cliente = await _clienteRepository.Obter(email);

        if (cliente is not null)
        {
            return false;
        }
        
        if (pedido is not null)
        {
            return true;
        }

        var code = Guid.NewGuid().ToString().Replace("-", "").Substring(0, 5);

        var confirmacaoDto = new ConfirmacaoEmail()
        {
            Codigo = code,
            Email = email,
            Expiracao = DateTime.Now.AddMinutes(2)
        };

        var confirmacao = Mapper.Map<ConfirmacaoEmail>(confirmacaoDto);
        confirmacao.Codigo = _hasherConfirmacao.HashPassword(confirmacao, confirmacao.Codigo);

        await _clienteRepository.GerarConfirmacaoEmail(confirmacao);
        if (await _clienteRepository.UnitOfWork.Commit())
        {

             var body =
                 $"""
                   
                   <center><h1>UZUSIS</h1></center>
                   <br>
                   
                   <center><h1>Confirme seu email com o codigo abaixo</h1></center>
                   
                   <br>
                   <center><p>Uzusis é uma loja feita de irmãs para as nossas 'Sis', sintam-se bem vindas a melhor<br>e com maior qualidade loja de roupas, acessórios e artigos femininos do Brasil.<br> Ser sis é ser mais mulher sz.</p></center>
                   
                   <br>
                   <center>
                   <h1>Código de Confirmação:</h1>
                   </center>
                   
                   <center style="letter-spacing: 1rem; background-color:#f1f1f1;"><h1><span style="text-decoration: underline;"> {code[0]}</span><span style="text-decoration: underline;">{code[1]}</style><span style="text-decoration: underline;">{code[2]}</span><span style="text-decoration: underline;">{code[3]}</span><span style="text-decoration: underline;">{code[4]}</span></h1></center>
                   
                   
                   <br>
                   
                   <h4>Compre com qualidade, Sis.</h4>
                                
                   """;
            



            var mail = new MailData
            {
                EmailSubject = "Confirme seu email agora mesmo!",
                EmailBody = body,
                EmailToId = email
            };

            await SendEmailAsync(mail);
            return true;
        }


        return false;
    }
    
    
    public async Task<bool> EnviarRecuperacao(string email)
    {
        var pedido = await _clienteRepository.ObterPedidoRecuperacao(email);
        var cliente = await _clienteRepository.Obter(email);

        if (cliente is null)
        {
            return false;
        }
        
        if (pedido is not null)
        {
            return true;
        }

        var code = Guid.NewGuid().ToString().Replace("-", "").Substring(0, 5);

        var recuperacaoDto = new RecuperacaoSenhaEmail()
        {
            Codigo = code,
            Email = email,
            Expiracao = DateTime.Now.AddMinutes(5)
        };

        var confirmacao = Mapper.Map<RecuperacaoSenhaEmail>(recuperacaoDto);
        confirmacao.Codigo = _hasherRecuperacao.HashPassword(confirmacao, confirmacao.Codigo);

        await _clienteRepository.GerarRecuperacaoSenha(confirmacao);
        if (await _clienteRepository.UnitOfWork.Commit())
        {

             var body =
                 $"""
                   
                   <center><h1>UZUSIS</h1></center>
                   <br>
                   
                   <center><h1>Recupere sua senha com o código de confirmação abaixo:</h1></center>
                   
                   <br>
                   <center><p>Uzusis é uma loja feita de irmãs para as nossas 'Sis', sintam-se bem vindas a melhor<br>e com maior qualidade loja de roupas, acessórios e artigos femininos do Brasil.<br> Ser sis é ser mais mulher sz.</p></center>
                   
                   <br>
                   <center>
                   <h1>Código de Recuperação:</h1>
                   </center>
                   
                   <center style="letter-spacing: 1rem; background-color:#f1f1f1;"><h1><span style="text-decoration: underline;"> {code[0]}</span><span style="text-decoration: underline;">{code[1]}</style><span style="text-decoration: underline;">{code[2]}</span><span style="text-decoration: underline;">{code[3]}</span><span style="text-decoration: underline;">{code[4]}</span></h1></center>
                   
                   
                   <br>
                   
                   <h4>Compre com qualidade, Sis.</h4>
                                
                   """;
            



            var mail = new MailData
            {
                EmailSubject = "Recupere sua senha agora mesmo!",
                EmailBody = body,
                EmailToId = email
            };

            await SendEmailAsync(mail);
            return true;
        }

        return false;

    }
    
    
    
    
    
    public async Task SendEmailAsync(MailData mailData)
    {
        var emailSettings = _configuration.GetSection("EmailConfiguration");
        
        var toEmail = mailData.EmailToId;
        var user = System.Text.Encoding.UTF8.GetString(Convert.FromBase64String(emailSettings["User"]!));
        var password = System.Text.Encoding.UTF8.GetString(Convert.FromBase64String(emailSettings["Password"]!));
        
        var smtpClient = new SmtpClient(emailSettings["Server"]!)
        {
            Port = 587,
            Credentials = new NetworkCredential(user, password),
            EnableSsl = true,
        };

        var mailMessage = new MailMessage(user, toEmail)
        {
            Subject = mailData.EmailSubject,
            Body = mailData.EmailBody,
            IsBodyHtml = true
        };

        try
        {
            smtpClient.Send(mailMessage);
        }
        catch (Exception e)
        {
            Notificator.Handle("Ocorreu um erro ao enviar o e-mail: "  + e.Message);
        }
    }
}
