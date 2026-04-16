import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HomeFeed } from './home-feed';

describe('HomeFeed', () => {
  let component: HomeFeed;
  let fixture: ComponentFixture<HomeFeed>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeFeed],
    }).compileComponents();

    fixture = TestBed.createComponent(HomeFeed);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
