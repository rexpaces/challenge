import { Component, signal } from '@angular/core';
import { TimelineGridComponent } from './components/timeline-grid/timeline-grid.component';
import { PageLayoutComponent } from './components/page-layout/page-layout.component';
import { TimescaleDropdownComponent } from './components/timescale-dropdown/timescale-dropdown.component';

@Component({
  selector: 'app-root',
  imports: [TimelineGridComponent, PageLayoutComponent, TimescaleDropdownComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('work-order');

  onSelection(event: string) {

  }
}
