import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {MatInputModule} from '@angular/material/input';
import {MatFormFieldModule} from '@angular/material/form-field';
import {FormsModule} from '@angular/forms';
import Swal from 'sweetalert2';
import { produto } from 'src/app/core/interfaces/produto';
import { NavbarService } from 'src/app/features/initial-page/components/services/navbar.service';
@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent {
  @ViewChild('dropdownImage') dropdownImage!: ElementRef;
  categoria:string | null='';
  produto:produto[]=[]
  dataSource:any;
  categorias:string[]=['calças', 'shorts', 'saias', 'cropped', 'conjuntos']
  dropdownOpen: boolean = false;
  selectedFilter: string = '';
  Options: string[] = ["blusão", "body","blusas","acessórios"]
  
  
  
  constructor(
    private navbarService:NavbarService
  ){}

  handleClick(Categoria:string, index:number, ){
   
    }
  }

  



 
