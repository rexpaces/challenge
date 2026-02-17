import { Component, signal } from '@angular/core';
import { TimelineGridComponent } from './components/timeline-grid/timeline-grid.component';
import { TimelineGridV2Component } from './components/timeline-grid-v2/timeline-grid-v2.component';
import { PageLayoutComponent } from './components/page-layout/page-layout.component';
import { TimescaleDropdownComponent } from './components/timescale-dropdown/timescale-dropdown.component';

@Component({
  selector: 'app-root',
  imports: [TimelineGridComponent, TimelineGridV2Component, PageLayoutComponent, TimescaleDropdownComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('work-order');
  protected readonly timescale = signal<'Day' | 'Week' | 'Month'>('Month');

  onSelection(event: string) {
    // Filter out 'Hour' since it's not implemented yet
    if (event === 'Day' || event === 'Week' || event === 'Month') {
      this.timescale.set(event);
    }
  }
}
