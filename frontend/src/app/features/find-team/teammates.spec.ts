import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Teammates } from './teammates';

describe('Teammates', () => {
  let component: Teammates;
  let fixture: ComponentFixture<Teammates>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Teammates],
    }).compileComponents();

    fixture = TestBed.createComponent(Teammates);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
