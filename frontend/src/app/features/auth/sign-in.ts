import { Component, OnInit, OnDestroy, ViewChild, ElementRef, effect } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../shared/auth/auth.service';

@Component({
  selector: 'app-sign-in',
  standalone: true,
  imports: [],
  templateUrl: './sign-in.html',
})
export class SignIn implements OnInit, OnDestroy {
  @ViewChild('clerkMount', { static: true }) clerkMount!: ElementRef<HTMLDivElement>;

  constructor(
    private auth: AuthService,
    private router: Router,
  ) {
    // Redirect once the user signs in
    effect(() => {
      if (this.auth.isLoggedIn()) {
        this.router.navigate(['/feed']);
      }
    });
  }

  ngOnInit(): void {
    this.auth.mountSignIn(this.clerkMount.nativeElement);
  }

  ngOnDestroy(): void {
    this.auth.unmountSignIn(this.clerkMount.nativeElement);
  }
}
