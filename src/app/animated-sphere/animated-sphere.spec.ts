import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnimatedSphere } from './animated-sphere';

describe('AnimatedSphere', () => {
  let component: AnimatedSphere;
  let fixture: ComponentFixture<AnimatedSphere>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnimatedSphere]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AnimatedSphere);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
