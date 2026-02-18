import { Injectable, signal } from '@angular/core';
import { WorkOrderPanelComponent } from '../components/work-order-panel/work-order-panel.component';

@Injectable({ providedIn: 'root' })
export class WorkOrderPanelService {
  private panelInstance = signal<WorkOrderPanelComponent | null>(null);

  setPanel(panel: WorkOrderPanelComponent) {
    this.panelInstance.set(panel);
  }

  getPanel() {
    return this.panelInstance();
  }

  open() {
    this.panelInstance()?.open();
  }

  close() {
    this.panelInstance()?.close();
  }
}
