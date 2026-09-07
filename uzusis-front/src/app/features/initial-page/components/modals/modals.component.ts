import { Component, Inject, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { NgbCarousel, NgbSlideEvent, NgbSlideEventSource } from '@ng-bootstrap/ng-bootstrap';
import { produto } from 'src/app/core/interfaces/produto';
import { ModalService } from './modal.service';
import { Router } from '@angular/router';
import { NavbarService } from '../services/navbar.service';
import { NotificacaoService } from 'src/app/core/service/notificacao.service';

@Component({
  selector: 'app-modals',
  templateUrl: './modals.component.html',
  styleUrls: ['./modals.component.scss']
})
export class ModalsComponent {

  @ViewChild('carousel', { static: false }) carousel!: NgbCarousel;

  quantidade = 1;
  Visible = false;
  estoque = 'Disponível';

  images = (this.data.fotoUrls ?? [])
    .filter(Boolean)
    .map((url: string) => ({ name: url, caption: '' }));

  qntd = this.data.tamanhos.map((t: any) => t.quantidade);
  P = this.qntd[0];
  M = this.qntd[1];
  G = this.qntd[2];

  paused = false;
  unpauseOnArrow = false;
  pauseOnIndicator = false;
  pauseOnHover = true;
  pauseOnFocus = true;

  selectedSize: string | null = null;
  disponivel: any = '';
  auxiliar = true;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: produto,
    public dialog: MatDialog,
    private modalService: ModalService,
    private router: Router,
    private navbarService: NavbarService,
    private notificacao: NotificacaoService
  ) {}

  togglePaused() {
    if (this.paused) {
      this.carousel.cycle();
    } else {
      this.carousel.pause();
    }
    this.paused = !this.paused;
  }

  onSlide(slideEvent: NgbSlideEvent) {
    if (this.unpauseOnArrow && slideEvent.paused &&
      (slideEvent.source === NgbSlideEventSource.ARROW_LEFT || slideEvent.source === NgbSlideEventSource.ARROW_RIGHT)) {
      this.togglePaused();
    }
    if (this.pauseOnIndicator && !slideEvent.paused && slideEvent.source === NgbSlideEventSource.INDICATOR) {
      this.togglePaused();
    }
  }

  selectSize(sigla: string) {
    this.Visible = true;
    this.selectedSize = sigla;

    switch (sigla) {
      case 'P': this.disponivel = this.P; break;
      case 'M': this.disponivel = this.M; break;
      case 'G': this.disponivel = this.G; break;
      default: return;
    }

    if (this.quantidade > this.disponivel) {
      this.auxiliar = false;
      this.estoque = 'indisponivel';
    } else {
      this.estoque = 'disponivel';
      this.auxiliar = true;
    }
    this.quantidade = 1;
  }

  decreaseQuantity() {
    if (this.quantidade > 1) this.quantidade--;
  }

  increaseQuantity() {
    if (this.quantidade < this.disponivel) this.quantidade++;
  }

  Adicionar() {
    if (!localStorage.getItem('token')) {
      this.pedirLogin();
      return;
    }

    this.modalService.adicionarCarrinho(this.data.id, this.selectedSize, this.quantidade).subscribe({
      next: () => this.notificacao.sucesso('Produto adicionado', 'O produto foi adicionado ao carrinho.'),
      error: err => {
        if (err.status !== 401) {
          this.notificacao.erro('Ops...', 'Você já tem o máximo deste produto no carrinho');
        } else {
          this.pedirLogin();
        }
      },
    });
  }

  private pedirLogin() {
    this.notificacao.confirmar({
      titulo: 'Você não está logado!',
      texto: 'Deseja se cadastrar para adicionar ao carrinho?',
      confirmar: 'Sim',
      cancelar: 'Agora não'
    }).then(confirmado => {
      if (confirmado) this.router.navigate(['login']);
      this.dialog.closeAll();
    });
  }
}
