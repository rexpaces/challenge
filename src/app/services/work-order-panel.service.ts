import { Injectable, signal } from '@angular/core';
import { WorkOrderDocument } from '../../model';
import { WorkCenterWithOrders } from './workcenters.service';
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

  open(workCenter: WorkCenterWithOrders, startDate?: Date) {
    this.panelInstance()?.open(workCenter, startDate);
  }

  openForEdit(workCenter: WorkCenterWithOrders, data: WorkOrderDocument) {
    this.panelInstance()?.openForEdit(workCenter, data);
  }

  close() {
    this.panelInstance()?.close();
  }
}
