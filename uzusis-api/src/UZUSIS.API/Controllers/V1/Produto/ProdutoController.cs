using System.Drawing;
using System.Net.Mime;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http.Extensions;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.WebUtilities;
using Swagger.Api;
using UZUSIS.Application.Contracts.Services;
using UZUSIS.Application.Dtos.Categoria;
using UZUSIS.Application.Dtos.Produto;
using UZUSIS.Application.Notification;
using UZUSIS.Core.Enums;
using UZUSIS.Core.ViewModel;

namespace UZUSIS.API.Controllers.V1.Produto;

[AllowAnonymous]
public class ProdutoController : BaseController
{
    private readonly IProdutoService _produtoService;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public ProdutoController(INotificator notificator, IProdutoService produtoService,
        IHttpContextAccessor httpContextAccessor) : base(notificator)
    {
        _produtoService = produtoService;
        _httpContextAccessor = httpContextAccessor;
    }

    [Authorize(Roles = "Administrador")]
    [HttpPost("adicionar")]
    public async Task<IActionResult> AdicionarProduto([FromForm] AdicionarProdutoDto produtoDto)
    {
        var produto = await _produtoService.Adicionar(produtoDto);
        return CustomResponse(produto);
    }

    [AllowAnonymous]
    [HttpGet("{pagina}")]
    public async Task<IActionResult> ObterProdutos(int pagina, [FromQuery] ECategoriaProduto? categoriaProduto = null)
    {
        var data = (await _produtoService.Obter(categoriaProduto));
        var num = (int)Math.Round(data.Count() / 6f);
        var numeroPaginas = num == 0 ? 1 : (int)Math.Round(data.Count() / 6f);
        var response = data.Skip(pagina * 6).Take(6);
        return CustomResponse(new RetornoPaginadoDto()
        {
            QuantidadePaginas = numeroPaginas,
            Produtos = response
        });
    }
    
    [AllowAnonymous]
    [HttpGet("id")]
    public async Task<IActionResult> ObterPorId(long produtoId)
    {
        return CustomResponse(await _produtoService.ObterPorId(produtoId));
    }
    
    [AllowAnonymous]
    [HttpGet("nome")]
    public async Task<IActionResult> ObterPorNome([FromQuery]string nome)
    {
        return CustomResponse(await _produtoService.ObterNome(nome));
    }
    

    [AllowAnonymous]
    [HttpGet]
    [Route("categorias")]
    public async Task<IActionResult> ObterCategorias([FromQuery] int? categoriaId)
    {
        var categorias = await _produtoService.ObterCategorias();

        if (categoriaId is null)
            return CustomResponse(categorias);   
        
        List<string> categoriaNome = new List<string>();
        
        var cat = categorias
            .Where(c => (int)c.Categoria == categoriaId);
        
        return cat.Count() != 0 ? CustomResponse(new CategoriaViewModel { Nome = cat.First().NomeCategoria }) : NotFound();
    }
    
    [AllowAnonymous]
    [HttpPatch("atualizar")]
    public async Task<IActionResult> AtualizarParcial([FromForm]AtualizarProdutoDto produtoDto)
    {
        return CustomResponse(await _produtoService.Atualizar(produtoDto.Id, produtoDto));
    }

    [Authorize(Roles = nameof(ETipoUsuario.Administrador))]
    [HttpGet("admin/dashboard")]
    public async Task<IActionResult> DashBoardAdmin()
    {
        return CustomResponse(await _produtoService.DashBoardAdmin());
    }
    
    [AllowAnonymous]
    [ApiExplorerSettings(IgnoreApi = true)]
    [HttpGet("{id}/foto/{index}")]
    public async Task<IActionResult> ObterFotos(long id, int index)
    {
        var fotos = await _produtoService.ObterFoto(id);
        List<dynamic> Images = new List<dynamic>();

        foreach (var bytes in fotos)
        {
            Images.Add(bytes);
        }
        
        
        return File(fotos[index]!, "image/png");

    }
    
}