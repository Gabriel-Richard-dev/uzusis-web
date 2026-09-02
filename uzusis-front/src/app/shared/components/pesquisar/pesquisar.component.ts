import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { produto } from 'src/app/core/interfaces/produto';
import { NavbarService } from 'src/app/features/initial-page/components/services/navbar.service';

@Component({
  selector: 'app-pesquisar',
  templateUrl: './pesquisar.component.html',
  styleUrls: ['./pesquisar.component.scss']
})

export class PesquisarComponent implements OnInit{

  filterProdutos: produto[]=[]
  searchTerm: string = '';
  allProdutos : produto[]=[]
  constructor(private navbarService: NavbarService) {

  }
  ngOnInit(): void {
    this.navbarService.lista(0,'').subscribe((res:produto[])=>{

      if(Array.isArray(res)){
      this.allProdutos=res
      this.filterProdutos=res
      
    }
    else{
      this.allProdutos=[res]
      this.filterProdutos=[res]
      
    }
    this.navbarService.updateProdutos(this.allProdutos)
    })
  }

  search(event: Event) {
    const target = event.target as HTMLInputElement;
    this.searchTerm = target.value;
    this.filter(this.searchTerm);
  
  }

  filter(searchTerm: string) {
    if(searchTerm.length>0){
      this.navbarService.pesquisarProdutos(searchTerm).subscribe((produtos: produto[]) => {
        this.filterProdutos = produtos;  
        console.log(this.filterProdutos)
        this.navbarService.updateProdutos(this.filterProdutos);  
      });
    }
    else{
      this.navbarService.updateProdutos(this.allProdutos);  
    }
  }
  
}
