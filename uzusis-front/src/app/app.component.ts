import { Component, HostListener } from '@angular/core';
import { SpinnerService } from './core/service/spinner.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  carregando$ = this.spinnerService.situacaoSpinner$;

  constructor(private spinnerService: SpinnerService) {}
}
