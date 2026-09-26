import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { RouterModule } from '@angular/router';

import { EstadoComponent } from './estado.component';
import { IconeComponent } from './icone.component';
import { QtdComponent } from './qtd.component';

const COMPONENTES = [EstadoComponent, IconeComponent, QtdComponent];

/**
 * Só o que o shell (header, sacola, footer, 404) usa: é o que o AppModule importa, e fica no bundle inicial.
 * O resto do Material mora no SharedModule, que as features importam, e vai para os chunks lazy.
 * Dialog e SnackBar ficam aqui porque o AvisoService (root, usado pelo AuthService no boot) injeta os dois
 * serviços, que no Material 16 são providos pelos módulos e não em 'root'.
 */
@NgModule({
  declarations: COMPONENTES,
  imports: [CommonModule, MatButtonModule, MatDialogModule, MatProgressSpinnerModule, MatSnackBarModule],
  exports: [CommonModule, FormsModule, RouterModule, MatBadgeModule, MatButtonModule, MatMenuModule,
    MatProgressSpinnerModule, MatSidenavModule, ...COMPONENTES],
})
export class BaseModule {}
