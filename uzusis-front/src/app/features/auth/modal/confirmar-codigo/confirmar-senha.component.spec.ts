import { ComponentFixture, TestBed } from '@angular/core/testing';

import {ConfirmarCodigoComponent } from './confirmar-codigo.component';

describe('ConfirmarSenhaComponent', () => {
  let component: ConfirmarCodigoComponent;
  let fixture: ComponentFixture<ConfirmarCodigoComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ConfirmarCodigoComponent]
    });
    fixture = TestBed.createComponent(ConfirmarCodigoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
