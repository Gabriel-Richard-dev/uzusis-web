import { Component, Inject, OnInit } from '@angular/core';
import { NavbarService } from 'src/app/features/initial-page/components/services/navbar.service';
import Swal from 'sweetalert2';
import {  FormBuilder, FormControl, FormControlName, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { produto } from 'src/app/core/interfaces/produto';
import { AuthService } from 'src/app/features/auth/auth.service';

@Component({
  selector: 'app-modal-pagamento',
  templateUrl: './modal-pagamento.component.html',
  styleUrls: ['./modal-pagamento.component.scss']
})
export class ModalPagamentoComponent implements OnInit{
form:FormGroup
constructor(
   @Inject(MAT_DIALOG_DATA) public data:produto[],
		public dialog:MatDialog,
  private navbarService:NavbarService,
  private fb:FormBuilder,
  public authService:AuthService,
  
){
  
  this.form = this.fb.group({
    pagamento: ['',Validators.required],  
    nome:['',Validators.required],
    
    
  });
}
formCep = new FormGroup({
      cep: new FormControl('')
})


precoTotal:number=0
preco:number[]=[]
produtos:produto[]=[]
cep: string = '';
  ngOnInit(): void {
    this.produtos=[...this.data]
    this.preco=this.produtos.map(preco=>preco.preco)
    console.log(this.preco)
    for(let i=0;i<this.preco.length;i++){
this.precoTotal+=this.preco[i]
    }
  }
selected:string='';
comprarTrue:boolean=false
agoraPode:boolean=false
onPaymentChange(event: Event): void {
 
  const selectElement = event.target as HTMLSelectElement;
  const selectedPayment = selectElement.value;
  if(selectedPayment!=''){
    this.comprarTrue=true
    this.selected=selectElement.value;
  }
}
comprar(){
  const selectedPayment = this.form.get('pagamento')?.value;
  this.navbarService.comprar().subscribe(res=>{
    Swal.fire({
      title: "Concluida!",
      text: "Produto comprado com sucesso!",
      icon: "success",
      confirmButtonText: "OK" 
    }).then((result)=>{
location.reload()
    })
   
  })
}
getNameValue(): string {
  this.agoraPode=true
  return this.form.get('nome')?.value || '';
}
agorarealpode:boolean=false
getCep(){
this.agorarealpode=true
  this.authService.enviarCep(this.formCep.value.cep).subscribe(res=>{
    console.log(res.estado)
    if(res.estado==='Ceará'){
      this.precoTotal = this.preco.reduce((acc, curr) => acc + curr, 0) + 10;
      console.log(this.precoTotal)
    }
    else{
      this.precoTotal = this.preco.reduce((acc, curr) => acc + curr, 0) + 40;
    }
  })
}
}
