using AutoMapper;
using Microsoft.AspNetCore.Http;
using UZUSIS.Application.Contracts.Services;
using UZUSIS.Application.Dtos.Categoria;
using UZUSIS.Application.Dtos.Produto;
using UZUSIS.Application.Dtos.Produto.Acessories;
using UZUSIS.Application.Notification;
using UZUSIS.Core.Enums;
using UZUSIS.Domain.Contracts.Repositories;
using UZUSIS.Domain.Entities;
using UZUSIS.Infra.Data.Storage;

namespace UZUSIS.Application.Services;

public class ProdutoService : BaseService, IProdutoService
{
    private readonly IProdutoRepository _produtoRepository;
    private readonly FotoStorage _fotoStorage;

    public ProdutoService(INotificator notificator, IMapper mapper, IProdutoRepository produtoRepository, FotoStorage fotoStorage) : base(
        notificator, mapper)
    {
        _produtoRepository = produtoRepository;
        _fotoStorage = fotoStorage;
    }

    public async Task<ProdutoDto?> Adicionar(AdicionarProdutoDto produtoDto)
    {
        var produto = Mapper.Map<Produto>(produtoDto);

        if (produto is null)
        {
            Notificator.HandleNotFoundResource();
            return null;
        }

        var tamanhos = new List<TamanhoDto>()
        {
            new TamanhoDto()
            { Sigla = "P", Quantidade = produtoDto.QuantidadeP },
            new TamanhoDto()
            { Sigla = "M", Quantidade = produtoDto.QuantidadeM },
            new TamanhoDto()
            { Sigla = "G", Quantidade = produtoDto.QuantidadeG }
        };

        produto.Tamanhos = Mapper.Map<List<Tamanho>>(tamanhos);

        Notificator.Handle(produto.Validate());

        if (Notificator.HasNotification)
            return null;

        produto.Fotos = await SalvarFotos(produtoDto);

        await _produtoRepository.Adicionar(produto);

        if (await CommitChanges())
        {
            return MapearComFotos(produto);
        }

        Notificator.Handle("Não foi possível adicionar o produto");
        return null;
    }

    public async Task<List<ProdutoDto>> Obter(ECategoriaProduto? categoriaProduto = null)
    {
        var produtos = await _produtoRepository.Obter(categoriaProduto);
        return produtos.Select(MapearComFotos).ToList();
    }

    public async Task<ProdutoDto?> ObterPorId(long produtoId)
    {
        var produto = await _produtoRepository.ObterPorId(produtoId);

        if (produto is null)
        {
            Notificator.HandleNotFoundResource();
            return null;
        }

        return MapearComFotos(produto);
    }

    public async Task<List<ProdutoDto>> ObterNome(string nome)
    {
        var produtos = await _produtoRepository.ObterPorNome(nome);
        return produtos.Select(MapearComFotos).ToList();
    }

    public async Task<List<CategoriaDto>> ObterCategorias()
    {
        return Enum.GetValues<ECategoriaProduto>()
            .Select(c => new CategoriaDto()
            {
                Categoria = c,
                NomeCategoria = c.ToString() == "Calca" ? "Calça" : c.ToString()
            })
            .ToList();
    }

    public async Task<List<ProdutoDto>> DashBoardAdmin()
    {
        var produtos = await _produtoRepository.Obter(null, true);
        return produtos.Select(MapearComFotos).ToList();
    }

    public async Task<ProdutoDto?> Atualizar(long produtoId, AtualizarProdutoDto atualizarProdutoDto)
    {
        var produto = await _produtoRepository.ObterPorId(produtoId);

        if (produto is null)
        {
            Notificator.HandleNotFoundResource();
            return null;
        }

        if (!string.IsNullOrEmpty(atualizarProdutoDto.Nome))
        {
            produto.Nome = atualizarProdutoDto.Nome;
        }

        if (!string.IsNullOrEmpty(atualizarProdutoDto.Descricao))
        {
            produto.Descricao = atualizarProdutoDto.Descricao;
        }

        if (atualizarProdutoDto.QuantidadeP.HasValue || atualizarProdutoDto.QuantidadeM.HasValue || atualizarProdutoDto.QuantidadeG.HasValue)
        {
            var tamanhos = new List<TamanhoDto>();

            if (atualizarProdutoDto.QuantidadeP.HasValue)
                tamanhos.Add(new TamanhoDto() { Quantidade = atualizarProdutoDto.QuantidadeP.Value, Sigla = "P" });

            if (atualizarProdutoDto.QuantidadeM.HasValue)
                tamanhos.Add(new TamanhoDto() { Quantidade = atualizarProdutoDto.QuantidadeM.Value, Sigla = "M" });

            if (atualizarProdutoDto.QuantidadeG.HasValue)
                tamanhos.Add(new TamanhoDto() { Quantidade = atualizarProdutoDto.QuantidadeG.Value, Sigla = "G" });

            produto.Tamanhos = Mapper.Map<List<Tamanho>>(tamanhos);
        }

        if (atualizarProdutoDto.Categoria is not null)
        {
            produto.Categoria = atualizarProdutoDto.Categoria.Value;
        }

        if (atualizarProdutoDto.Preco.HasValue)
        {
            produto.Preco = atualizarProdutoDto.Preco.Value;
        }

        Notificator.Handle(produto.Validate());

        if (Notificator.HasNotification)
            return null;

        if (atualizarProdutoDto.FotoFiles != null && atualizarProdutoDto.FotoFiles.Count > 0)
        {
            produto.Fotos = await SalvarFotos(atualizarProdutoDto);
        }

        await _produtoRepository.Atualizar(produto);

        if (await CommitChanges())
        {
            return MapearComFotos(produto);
        }

        Notificator.Handle("Não foi possivel atualizar a produto.");
        return null;
    }

    private async Task<bool> CommitChanges() => await _produtoRepository.UnitOfWork.Commit();

    private async Task<List<Foto>> SalvarFotos(IAgreggateFotoList dto)
    {
        var fotos = new List<Foto>();

        foreach (var foto in dto.FotoFiles ?? new List<IFormFile>())
        {
            await using var stream = foto.OpenReadStream();

            var fotoUrl = await _fotoStorage.Salvar(stream, foto.Length, foto.ContentType, Path.GetExtension(foto.FileName));

            fotos.Add(new Foto()
            {
                FotoUrl = fotoUrl
            });
        }

        return fotos;
    }

    private ProdutoDto MapearComFotos(Produto produto)
    {
        var produtoDto = Mapper.Map<ProdutoDto>(produto);
        produtoDto.FotoUrls = (produto.Fotos ?? new List<Foto>())
            .Select(f => _fotoStorage.Url(f.FotoUrl))
            .ToList();
        return produtoDto;
    }
}
