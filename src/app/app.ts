import { Component, inject, signal, ViewChild } from '@angular/core';
import { PageLayoutComponent } from './components/page-layout/page-layout.component';
import { TimescaleDropdownComponent } from './components/timescale-dropdown/timescale-dropdown.component';
import { TimelineGridV3Component } from './components/timeline-grid-v3/timeline-grid-v3.component';
import { WorkOrderPanelComponent } from './components/work-order-panel/work-order-panel.component';
import { WorkOrderPanelService } from './services/work-order-panel.service';

@Component({
  selector: 'app-root',
  imports: [TimelineGridV3Component, PageLayoutComponent, TimescaleDropdownComponent, WorkOrderPanelComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  @ViewChild('workOrderPanel') workOrderPanel!: WorkOrderPanelComponent;

  protected readonly title = signal('work-order');
  protected readonly timescale = signal<'Day' | 'Week' | 'Month'>('Month');
  private workOrderPanelService = inject(WorkOrderPanelService);

  ngAfterViewInit() {
    this.workOrderPanelService.setPanel(this.workOrderPanel);
  }

  onSelection(event: string) {
    // Filter out 'Hour' since it's not implemented yet
    if (event === 'Day' || event === 'Week' || event === 'Month') {
      this.timescale.set(event);
    }
  }
}
