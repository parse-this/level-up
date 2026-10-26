import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/** Settings shell: page header + settings home or a sub-page. */
@Component({
  selector: 'app-settings',
  imports: [RouterOutlet],
  template: `
    <h1 class="page-title">Settings <span class="page-subtitle">— Options menu</span></h1>
    <router-outlet />
  `,
})
export class Settings {}
