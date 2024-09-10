import { Component, OnInit } from '@angular/core';
import { NavbarService } from 'src/app/features/initial-page/components/services/navbar.service';
import { AdminService } from '../../admin.service';
import { IgetProduto } from 'src/app/core/interfaces/getProdutos';

@Component({
  selector: 'app-pegarProdutos',
  templateUrl: './pegarProdutos.component.html',
  styleUrls: ['./pegarProdutos.component.css']
})
export class PegarProdutosComponent implements OnInit {

  data!:IgetProduto[]
  constructor(private adminService: AdminService) { }



  ngOnInit() {
    this.adminService.getProdutosEditar().subscribe({
      next: res =>{
        this.data = res
        console.log(this.data)
        this.data.forEach(element =>{
          console.log(element)
        })
      }
    })
  }

}
