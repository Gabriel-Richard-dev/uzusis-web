import { Component } from '@angular/core';
import { DialogRef } from '@angular/cdk/dialog';
@Component({
  selector: 'app-confirmar-senha',
  templateUrl: './confirmar-senha.component.html',
  styleUrls: ['./confirmar-senha.component.scss']
})
export class ConfirmarSenhaComponent {
  constructor(dialogRef: DialogRef<ConfirmarSenhaComponent>){

  }
ngOnInit(){
  console.log("oi")
}
}
