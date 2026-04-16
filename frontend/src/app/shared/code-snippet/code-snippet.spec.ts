import { Component, Input } from '@angular/core';
import { Highlight } from 'ngx-highlightjs';

@Component({
  selector: 'app-code-snippet',
  standalone: true,
  imports: [Highlight],
  template: `
    <pre><code [highlight]="code" [language]="language"></code></pre>
  `
})
export class CodeSnippetComponent {
  @Input() code = '';
  @Input() language = 'typescript';
}
