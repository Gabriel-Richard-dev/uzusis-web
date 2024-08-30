import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfirmarSenhaComponent } from './confirmar-senha.component';

describe('ConfirmarSenhaComponent', () => {
  let component: ConfirmarSenhaComponent;
  let fixture: ComponentFixture<ConfirmarSenhaComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ConfirmarSenhaComponent]
    });
    fixture = TestBed.createComponent(ConfirmarSenhaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
