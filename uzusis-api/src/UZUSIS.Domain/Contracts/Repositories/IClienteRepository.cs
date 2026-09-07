using UZUSIS.Domain.Entities;
using UZUSIS.Domain.Entities.Acessories;

namespace UZUSIS.Domain.Contracts.Repositories;

public interface IClienteRepository : IBaseRepository<Cliente>
{
    Task<Cliente?> Obter(string email);
    Task<Cliente?> Obter(long id);
    Task GerarConfirmacaoEmail(ConfirmacaoEmail confirmacaoEmail);
    Task GerarRecuperacaoSenha(RecuperacaoSenhaEmail recuperacaoSenhaEmail);
    Task<ConfirmacaoEmail?> ObterPedidoDeConfirmacao(string email);
    Task<RecuperacaoSenhaEmail?> ObterPedidoRecuperacao(string email);
    Task ConfirmacaoValidada(ConfirmacaoEmail confirmacaoEmail);
}