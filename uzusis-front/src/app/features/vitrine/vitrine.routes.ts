import { Routes } from '@angular/router';

import { HomeComponent } from './home.component';
import { LojaComponent } from './loja.component';
import { ProdutoComponent } from './produto.component';

// O produto sobrescreve o título com Title.setTitle(nome + ' — Uzusis') quando carrega.
const ROTAS: Routes = [
  { path: '', pathMatch: 'full', component: HomeComponent, title: 'Uzusis' },
  { path: 'loja', component: LojaComponent, title: 'Loja — Uzusis' },
  { path: 'produto/:id', component: ProdutoComponent, title: 'Produto — Uzusis' },
];

export default ROTAS;
