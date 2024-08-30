import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { produto } from 'src/app/core/interfaces/produto';
import { NavbarService } from '../services/navbar.service';
import { MatDialog } from '@angular/material/dialog';
import { ModalsComponent } from '../modals/modals.component';

@Component({
  selector: 'app-allfotos',
  templateUrl: './allfotos.component.html',
  styleUrls: ['./allfotos.component.scss']
})
export class AllfotosComponent implements OnInit {
  newScroll: number = 0;
  produtos: produto[] = [];
  count: number = 1;
  hasMore: boolean = true;
  allProdutos: produto[] = [];
  paginas: number = 0;
  categoria: string = '';
  scrollDistance: number = 4000;
  @ViewChild('fotosContainer') fotosContainer!: ElementRef;

  constructor(private navbarService: NavbarService, private dialog: MatDialog) {}

  ngOnInit(): void {
    this.navbarService.getQuantidadePaginas().subscribe(qnt => {
      this.paginas = qnt;
    });
    this.navbarService.produtosnew.subscribe(produtos => {
      this.produtos = produtos;
    });

  
    }

  

  gerar() {
    if (!(this.count >= this.paginas)) {
      this.scrollPage();
      this.navbarService.lista(this.count, this.categoria).subscribe((res: produto | produto[]) => {
        if (Array.isArray(res)) {
          this.allProdutos = [...this.allProdutos, ...res];
        } else {
          this.allProdutos = [...this.allProdutos, res];
        }
        if (this.count === 1) {
          this.gerar();
          if (!this.produtos.length) this.hasMore = false;
        }
        this.count++;
        this.navbarService.updateProdutos(this.allProdutos);
      });
    } else {
      this.hasMore = false;
    }
  }

  scrollPage() {
    this.newScroll = this.scrollDistance + this.newScroll;
    window.scroll({
      top: this.newScroll,
      left: 0,
      behavior: 'smooth'
    });
  }

  openDialog(element: produto) {
    const dialogRef = this.dialog.open(ModalsComponent, {
      data: element,

    });
  }
}
