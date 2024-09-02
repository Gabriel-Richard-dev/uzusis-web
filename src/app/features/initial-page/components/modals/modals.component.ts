import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { NgbCarousel, NgbSlideEvent, NgbSlideEventSource } from '@ng-bootstrap/ng-bootstrap';
import { produto } from 'src/app/core/interfaces/produto';
import { ModalService } from './modal.service';
import Swal from 'sweetalert2';


@Component({
  selector: 'app-modals',
  templateUrl: './modals.component.html',
  styleUrls: ['./modals.component.scss']
})
export class ModalsComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data:produto,
		public dialog:MatDialog,
		private modalService:ModalService,
  ){}	
  quantidade:number=1;
	Visible:boolean=false;
	estoque:string='Disponível'
  images = [
    {name: this.data.fotoUrls[0], caption: ''},
    {name: this.data.fotoUrls[1], caption:''},
    {name: this.data.fotoUrls[2], caption:''}
  ];
  qntd=this.data.tamanhos.map(tamanhos=>tamanhos.quantidade)
  P=this.qntd[0]
  M=this.qntd[1]
  G=this.qntd[2]
	paused = false;
	unpauseOnArrow = false;
	pauseOnIndicator = false;
	pauseOnHover = true;
	pauseOnFocus = true;
  selectedSize: string | null= null;
	disponivel:any='';
	@ViewChild('carousel', { static: true }) carousel!: NgbCarousel;

	togglePaused() {
		if (this.paused) {
			this.carousel.cycle();
		} else {
			this.carousel.pause();
		}
		this.paused = !this.paused;
	}

	onSlide(slideEvent: NgbSlideEvent) {
		if (
			this.unpauseOnArrow &&
			slideEvent.paused &&
			(slideEvent.source === NgbSlideEventSource.ARROW_LEFT || slideEvent.source === NgbSlideEventSource.ARROW_RIGHT)
		) {
			this.togglePaused();
		}
		if (this.pauseOnIndicator && !slideEvent.paused && slideEvent.source === NgbSlideEventSource.INDICATOR) {
			this.togglePaused();
		}
	}
	auxiliar:boolean=true;
  selectSize(size:string){
		this.Visible=true
    this.selectedSize=size
		
		
		switch(size){
			case 'P':
				this.disponivel=this.P
				
				if(this.quantidade>this.disponivel){
					this.auxiliar=false
					this.estoque='indisponivel'
				}
				else {
					this.estoque='disponivel'
					this.auxiliar=true
				}
				this.quantidade=1;
				break
			case 'M':
				this.disponivel=this.M
				if(this.quantidade>this.disponivel){
					this.auxiliar=false
					this.estoque='indisponivel'
				}
				else {
					this.estoque='disponivel'
					this.auxiliar=true
				}
				this.quantidade=1;
				break;
			case 'G':
				this.disponivel=this.G
				if(this.quantidade>this.disponivel){
					this.auxiliar=false
					this.estoque='indisponivel'
				}
				else {
					this.estoque='disponivel'
					this.auxiliar=true
				}
				this.quantidade=1;
				break;
		}
  }

	decreaseQuantity() {
    if (this.quantidade > 1) {
      this.quantidade--;
    }
  }

  increaseQuantity() {
    if (this.quantidade < this.disponivel) {
      this.quantidade++;
    }
  }
Adicionar(){
	const token = localStorage.getItem('token')
	
	if(!token){
	const swalWithBootstrapButtons = Swal.mixin({
		customClass: {
			confirmButton: "btn btn-success",
			cancelButton: "btn btn-danger"
		},
		buttonsStyling: false
	});
	swalWithBootstrapButtons.fire({
		title: "Você não está logado!",
		text: "Deseja criar uma conta ou se cadastrar para adicionar ao carrinho?",
		icon: "warning",
		showCancelButton: true,
		confirmButtonText: "Sim",
		cancelButtonText: "Não",
		reverseButtons: true
	}).then((result) => {
		if (result.isConfirmed) {
			
			
		} else if (
			result.dismiss === Swal.DismissReason.cancel
		) {
			this.dialog.closeAll()
		}
	});
	}
	else{
		
	}
}
}