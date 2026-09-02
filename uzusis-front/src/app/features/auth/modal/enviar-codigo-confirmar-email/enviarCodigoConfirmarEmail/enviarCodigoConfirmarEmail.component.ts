import { Component, OnInit, ViewChildren } from '@angular/core';
import { AuthService } from '../../../auth.service';
import { DialogRef } from '@angular/cdk/dialog';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-enviarCodigoConfirmarEmail',
  templateUrl: './enviarCodigoConfirmarEmail.component.html',
  styleUrls: ['./enviarCodigoConfirmarEmail.component.css']
})
export class EnviarCodigoConfirmarEmailComponent implements OnInit {
  constructor(dialogRef: DialogRef<EnviarCodigoConfirmarEmailComponent>, private authService: AuthService){
    
    this.form = this.toFormGroup(this.formInput);

  }
  ngOnInit(): void {
    throw new Error('Method not implemented.');
  }
  concatenatedValuesLenght = 0
  concatenedValue = ""
  email = ""

  form: FormGroup; // Definindo a variável form
  formInput = ['input1', 'input2', 'input3', 'input4', 'input5'];
  @ViewChildren('formRow') rows: any;
  
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
