import { Component, OnInit } from '@angular/core';
import { Route, Router } from '@angular/router';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit {

  constructor(private router: Router) { }

  ngOnInit() {
    console.log("testando")
  }

  logout(){
    Swal.fire({
      title: 'Tem certeza que deseja deslogar??',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#2f9e41',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sim, deslogar!',
      cancelButtonText: 'Não, cancelar',
    }).then(result => {
      if (result.isConfirmed) {
        this.router.navigate(['/'])
        localStorage.removeItem("tokenAdm")
      }
    });

  }

}
