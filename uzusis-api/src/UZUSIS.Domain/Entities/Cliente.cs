using System;
using System.Collections.Generic;
using FluentValidation.Results;
using UZUSIS.Core.Enums;
using UZUSIS.Domain.Abstractions;
using UZUSIS.Domain.Validations;

namespace UZUSIS.Domain.Entities;

public class Cliente : Usuario
{
    public Cliente()
    {
        Carrinho = new Carrinho();
        TipoUsuario = ETipoUsuario.Cliente;
    }

    public long CarrinhoId { get; set; }

    public Carrinho? Carrinho { get; set; }
    public List<Compra> Compras { get; set; }
    public List<Pedido> Pedidos { get; set;  }
    public Endereco Endereco { get; set; }
    public string CPF { get; set; }
    public string Celular { get; set; }
    public DateOnly DataNascimento { get; set; }


    public List<ValidationFailure> Validate()
    {
        List<string> Erros = new List<string>();
        var validateHandler = new ClienteValidation();

        var response = validateHandler.Validate(this);

        return response.Errors;
    }
    
    

}