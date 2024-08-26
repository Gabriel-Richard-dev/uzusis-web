import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { produto } from 'src/app/core/interfaces/produto';

@Component({
  selector: 'app-modals',
  templateUrl: './modals.component.html',
  styleUrls: ['./modals.component.scss']
})
export class ModalsComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data:produto,
  ){}
}
