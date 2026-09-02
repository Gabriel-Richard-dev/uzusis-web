using Microsoft.EntityFrameworkCore;
using UZUSIS.Domain.Contracts.Repositories;
using UZUSIS.Domain.Entities;
using UZUSIS.Domain.Entities.Acessories;
using UZUSIS.Infra.Data.Context;

namespace UZUSIS.Infra.Data.Repositories;

public class ClienteRepository : BaseRepository<Cliente>, IClienteRepository
{
    public ClienteRepository(ApplicationContext context) : base(context)
    {
    }
    
    
    public async Task<Cliente?> Obter(string email)
    {
        var cliente = await 
            Context.Clientes
                .FirstOrDefaultAsync(c => c.Email.Equals(email));
        
        if(cliente is not null)
        {
            var endereco = Context.Enderecos.FirstOrDefault(c => c.ClienteId == cliente.Id);
            if(endereco is not null)
                cliente.Endereco = endereco;
        }
        
        return cliente;
    }

    public async Task<Cliente?> Obter(long id)
    {
       
        var cliente = await 
                Context.Clientes
                    .FirstOrDefaultAsync(c => c.Id == id);
        
        if(cliente is not null)
        {
            var endereco = Context.Enderecos.FirstOrDefault(c => c.ClienteId == cliente.Id);
            
            if(endereco is not null) cliente.Endereco = endereco;
        }
        
        return cliente;
      
    }

    public async Task<ConfirmacaoEmail?> ObterPedidoDeConfirmacao(string email)
    {
        var confirmacao = await Context.ConfirmacoesDeEmails.AsNoTracking()
            .Where(c => c.Expiracao >= DateTime.Now)
            .Where(c => c.FoiConfirmado == false)
            .FirstOrDefaultAsync(c => c.Email.Equals(email));

        return confirmacao;
    }

    public async Task<RecuperacaoSenhaEmail?> ObterPedidoRecuperacao(string email)
    {
        var recuperacao = await Context.RecuperacaoSenha.AsNoTracking()
            .Where(c => c.Expiracao >= DateTime.Now)
            .Where(c => c.FoiConfirmado == false)
            .FirstOrDefaultAsync(c => c.Email.Equals(email));

        return recuperacao;
    }


    public async Task GerarConfirmacaoEmail(ConfirmacaoEmail confirmacaoEmail)
    {
        Context.ConfirmacoesDeEmails.Add(confirmacaoEmail);
    }
    public async Task GerarRecuperacaoSenha(RecuperacaoSenhaEmail recuperacaoSenhaEmail)
    {
        Context.RecuperacaoSenha.Add(recuperacaoSenhaEmail);
    }

    public async Task ConfirmacaoValidada(ConfirmacaoEmail confirmacaoEmail)
    {
        Context.ConfirmacoesDeEmails.Update(confirmacaoEmail);
    }
    
    
    
}