import { Component, OnInit } from '@angular/core';
import { AdminService } from '../../admin.service';
import { pipe } from 'rxjs';



@Component({
  selector: 'app-pedidos-pendentes',
  templateUrl: './pedidos-pendentes.component.html',
  styleUrls: ['./pedidos-pendentes.component.css']
})
export class PedidosPendentesComponent implements OnInit {

pedidosPendentes =<any>[]
  
  constructor(private adminService: AdminService) { }

  ngOnInit() {  
    this.adminService.pedidosPendentes().subscribe({
      next: res =>{
    res.forEach((element: any) => {
        console.log(element)
      });
        this.pedidosPendentes = res
      }
    })

  }

}
