import { Component, Input, ViewChildren } from '@angular/core';
import { DialogRef } from '@angular/cdk/dialog';
import { FormControl, FormGroup, Validators } from '@angular/forms'
import { AuthService } from '../../auth.service';
@Component({
  selector: 'app-confirmar-senha',
  templateUrl: './confirmar-senha.component.html',
  styleUrls: ['./confirmar-senha.component.scss']
})
export class ConfirmarSenhaComponent {
  constructor(dialogRef: DialogRef<ConfirmarSenhaComponent>, private authService: AuthService){
    
    this.form = this.toFormGroup(this.formInput);

  }
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
    
    if(concatenatedValuesLenght === 5){
      this.authService.enviarCodigoEmailCadastro(concatenatedValues)
  
    }
    
   }


   
 
}
