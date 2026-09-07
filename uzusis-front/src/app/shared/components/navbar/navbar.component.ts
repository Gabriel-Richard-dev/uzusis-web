import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { Pedido, produto } from 'src/app/core/interfaces/produto';
import { NavbarService } from 'src/app/features/initial-page/components/services/navbar.service';
import { NotificacaoService } from 'src/app/core/service/notificacao.service';
import { ModalPagamentoComponent } from './modal-pagamento/modal-pagamento.component';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent {

  categorias = ['Calça', 'Short', 'Saia', 'Cropped', 'Conjuntos'];
  outrasCategorias = ['Blusão', 'Body', 'Blusa', 'Acessórios'];

  produtos: produto[] = [];
  pedidos: Pedido[] = [];
  quantidadeProduto: { [key: number]: number } = {};
  carrinhoId: { [key: number]: number } = {};
  valorTotal = 0;
  sidebarVisible = false;
  menuMobileAberto = false;

  constructor(
    private navbarService: NavbarService,
    private router: Router,
    private dialog: MatDialog,
    private notificacao: NotificacaoService
  ) { }

  get logado(): boolean {
    return !!localStorage.getItem('token');
  }

  filtrarCategoria(indice: any) {
    this.menuMobileAberto = false;
    this.navbarService.setCategoria(indice);
    if (this.router.url !== '/') {
      this.router.navigate(['/']);
    }
  }

  irParaPedidos() { this.router.navigate(['pedidos']); }
  irParaLogin() { this.router.navigate(['login']); }
  irParaCadastro() { this.router.navigate(['login']); }

  sair() {
    localStorage.removeItem('token');
    this.produtos = [];
    this.valorTotal = 0;
    this.router.navigate(['/']);
  }

  adicionarCarrinho() {
    if (!this.logado) {
      this.pedirLogin();
      return;
    }
    this.sidebarVisible = true;
    this.carregarCarrinho();
  }

  apagarCarrinho(id: number) {
    this.navbarService.retirarCarrinho(id).subscribe({
      next: () => this.carregarCarrinho()
    });
  }

  comprar(produtos: produto[]) {
    const dados = produtos.map(p => ({ ...p, quantidadePedida: this.quantidadeProduto[p.id] || 0 }));
    this.sidebarVisible = false;
    this.dialog.open(ModalPagamentoComponent, {
      width: '100vw',
      maxWidth: '100vw',
      height: '100%',
      panelClass: 'uz-dialogo-cheio',
      data: dados
    });
  }

  carregarCarrinho() {
    this.navbarService.atualizarCarrinho().subscribe({
      next: pedidos => {
        this.pedidos = pedidos;
        this.produtos = [];
        this.quantidadeProduto = {};
        this.carrinhoId = {};
        this.valorTotal = pedidos.reduce((total, p: any) => total + p.valorPedido, 0);

        for (const pedido of pedidos as any[]) {
          this.quantidadeProduto[pedido.produtoId] = pedido.quantidade;
          this.carrinhoId[pedido.produtoId] = pedido.id;
          this.navbarService.getProdutoId(pedido.produtoId).subscribe(res => {
            this.produtos = [...this.produtos, ...(Array.isArray(res) ? res : [res])];
          });
        }
      },
      error: () => {
        this.sidebarVisible = false;
        this.pedirLogin();
      }
    });
  }

  private pedirLogin() {
    this.notificacao.confirmar({
      titulo: 'Você não está logado!',
      texto: 'Deseja se cadastrar para adicionar ao carrinho?',
      confirmar: 'Sim',
      cancelar: 'Agora não'
    }).then(confirmado => {
      if (confirmado) {
        this.router.navigate(['login']);
      }
    });
  }
}
