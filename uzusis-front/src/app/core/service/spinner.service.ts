import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SpinnerService {

  private pendentes = 0;
  private loadingSubject = new BehaviorSubject<boolean>(false);
  situacaoSpinner$ = this.loadingSubject.asObservable();

  showSpinner() {
    this.pendentes++;
    this.loadingSubject.next(true);
  }

  hideSpinner() {
    this.pendentes = Math.max(0, this.pendentes - 1);
    this.loadingSubject.next(this.pendentes > 0);
  }
}
