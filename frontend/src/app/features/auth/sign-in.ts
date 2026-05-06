import { Component, OnInit, OnDestroy, ViewChild, ElementRef, effect } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../shared/auth/auth.service';

@Component({
  selector: 'app-sign-in',
  standalone: true,
  imports: [],
  templateUrl: './sign-in.html',
  styleUrl:    './sign-in.css',
})
export class SignIn implements OnInit, OnDestroy {
  @ViewChild('clerkMount', { static: true }) clerkMount!: ElementRef<HTMLDivElement>;

  constructor(
    private auth: AuthService,
    private router: Router,
  ) {
    // Wait for clerkSync (dbId set), then route based on whether profile is complete
    effect(() => {
      const u = this.auth.user();
      if (u?.dbId != null) {
        if (u.username) {
          this.router.navigate(['/feed']);
        } else {
          this.router.navigate(['/profile/edit'], { queryParams: { setup: 'true' } });
        }
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
