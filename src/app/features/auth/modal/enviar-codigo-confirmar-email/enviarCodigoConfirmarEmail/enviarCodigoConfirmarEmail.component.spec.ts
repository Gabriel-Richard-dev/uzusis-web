/* tslint:disable:no-unused-variable */
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { EnviarCodigoConfirmarEmailComponent } from './enviarCodigoConfirmarEmail.component';

describe('EnviarCodigoConfirmarEmailComponent', () => {
  let component: EnviarCodigoConfirmarEmailComponent;
  let fixture: ComponentFixture<EnviarCodigoConfirmarEmailComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ EnviarCodigoConfirmarEmailComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(EnviarCodigoConfirmarEmailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
