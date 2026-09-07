import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PesquisarComponent } from './pesquisar.component';

describe('PesquisarComponent', () => {
  let component: PesquisarComponent;
  let fixture: ComponentFixture<PesquisarComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PesquisarComponent]
    });
    fixture = TestBed.createComponent(PesquisarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
