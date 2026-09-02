import { NgModule } from '@angular/core';
import {CommonModule, NgOptimizedImage} from '@angular/common';

import {RouterLink, RouterLinkActive, RouterOutlet} from "@angular/router";

import {MaterialModule} from "../material.module";

@NgModule({
  declarations: [
    
    
  ],
    imports: [
        CommonModule,
        RouterOutlet,
        NgOptimizedImage,
        MaterialModule,
        RouterLinkActive,
        RouterLink
    ],
  exports: [
  ]
})
export class LayoutsModule { }
