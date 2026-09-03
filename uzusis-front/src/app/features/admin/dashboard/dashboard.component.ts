import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { AdminService } from '../admin.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {

  carregado = false;

  produtos: any[] = [];
  pendentes: any[] = [];
  enviados: any[] = [];

  faturamentoTotal = 0;
  faturamentoPendente = 0;
  itensVendidos = 0;

  semEstoque: { produto: any; total: number }[] = [];
  estoqueBaixo: { produto: any; total: number }[] = [];

  limite = 3;

  constructor(private adminService: AdminService) { }

  ngOnInit() {
    forkJoin({
      produtos: this.adminService.getProdutosEditar(),
      pendentes: this.adminService.pedidosPendentes(1),
      enviados: this.adminService.pedidosPendentes(0)
    }).subscribe({
      next: ({ produtos, pendentes, enviados }: any) => {
        this.produtos = produtos ?? [];
        this.pendentes = pendentes ?? [];
        this.enviados = enviados ?? [];
        this.calcular();
        this.carregado = true;
      },
      error: () => this.carregado = true
    });
  }

  estoqueDe(produto: any): number {
    return (produto.tamanhos ?? []).reduce((total: number, t: any) => total + (t.quantidade ?? 0), 0);
  }

  private calcular() {
    const todos = [...this.pendentes, ...this.enviados];

    this.faturamentoTotal = todos.reduce((total, p: any) => total + (p.valorItem ?? 0), 0);
    this.faturamentoPendente = this.pendentes.reduce((total, p: any) => total + (p.valorItem ?? 0), 0);
    this.itensVendidos = todos.reduce((total, p: any) => total + (p.quantidade ?? 0), 0);

    const comEstoque = this.produtos.map(produto => ({ produto, total: this.estoqueDe(produto) }));

    this.semEstoque = comEstoque.filter(p => p.total === 0);
    this.estoqueBaixo = comEstoque
      .filter(p => p.total > 0 && p.total <= this.limite)
      .sort((a, b) => a.total - b.total);
  }
}
