import { Component, Input, ViewChildren } from '@angular/core';
import { DialogRef } from '@angular/cdk/dialog';
import { FormControl, FormGroup, Validators } from '@angular/forms'
import { AuthService } from '../../auth.service';
import { ICodigoEmail } from 'src/app/core/interfaces/auth';
import Swal from 'sweetalert2';
@Component({
  selector: 'app-confirmar-senha',
  templateUrl: './confirmar-senha.component.html',
  styleUrls: ['./confirmar-senha.component.scss']
})
export class ConfirmarCodigoComponent {
  constructor(dialogRef: DialogRef<ConfirmarCodigoComponent>, private authService: AuthService){
    
    this.form = this.toFormGroup(this.formInput);

  }
  concatenatedValuesLenght = 0
  concatenedValue = ""
  email = ""

  form: FormGroup; // Definindo a variável form
  formInput = ['input1', 'input2', 'input3', 'input4', 'input5'];
  @ViewChildren('formRow') rows: any;
  
  ngOnInit(){
  this.email = localStorage.getItem("emailGuardar") || ""
  }

  toFormGroup(elements: any) {
    const group: any = {};
    elements.forEach((key: string | number) => {
      group[key] = new FormControl('', Validators.required);
    });
    return new FormGroup(group);
   }

   keyUpEvent(event:any, index: number) {
    let pos = index;
    if (event.keyCode === 8 && event.which === 8) {
     pos = index - 1 ;
    } else {
     pos = index + 1 ;
    }
    if (pos > -1 && pos < this.formInput.length ) {
     this.rows._results[pos].nativeElement.focus();
    }
    const formValues = this.form.value;
    const concatenatedValues = this.formInput.map(input => formValues[input]).join('');
    const concatenatedValuesLenght = concatenatedValues.length
    
    
    this.concatenedValue = concatenatedValues
    this.concatenatedValuesLenght = concatenatedValues.length
    
    if(this.concatenatedValuesLenght === 5){

      this.authService.enviarCodigoEmailCadastro(this.concatenedValue)
  
    }

    
   }


   enviarCodigoEmail(){
      
      if(this.concatenatedValuesLenght === 5){

    this.authService.enviarCodigoEmailCadastro(this.concatenedValue)
   }

   else{
    Swal.fire({
      position: "center",
      icon: "error",
      title: "Ops...",
      text: 'Você não prencheu todos os campos',
      showConfirmButton: false,
      timer: 1500,
    });
   }
  }
   
 
}
