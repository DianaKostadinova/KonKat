import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QA } from './qa';

describe('QA', () => {
  let component: QA;
  let fixture: ComponentFixture<QA>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QA],
    }).compileComponents();

    fixture = TestBed.createComponent(QA);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
