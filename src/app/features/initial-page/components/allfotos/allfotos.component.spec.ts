import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AllfotosComponent } from './allfotos.component';

describe('AllfotosComponent', () => {
  let component: AllfotosComponent;
  let fixture: ComponentFixture<AllfotosComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AllfotosComponent]
    });
    fixture = TestBed.createComponent(AllfotosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
