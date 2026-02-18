import { Injectable, signal } from '@angular/core';
import { WorkCenterDocument, WorkOrderDocument } from '../../model';

export interface WorkCenterWithOrders extends WorkCenterDocument {
  workOrders: WorkOrderDocument[];
}

interface SampleData {
  metadata: { generatedAt: string; version: string };
  data: {
    workCenters: WorkCenterDocument[];
    workOrders: WorkOrderDocument[];
  };
}

@Injectable({ providedIn: 'root' })
export class WorkCenterService {
  private workCentersSignal = signal<WorkCenterWithOrders[]>([]);
  readonly workCenters = this.workCentersSignal.asReadonly();

  constructor() {
    this.fetchWorkCenters();
  }

  private async fetchWorkCenters(): Promise<void> {
    const response = await fetch('sample-data-big.json');
    const json: SampleData = await response.json();

    const ordersByCenter = new Map<string, WorkOrderDocument[]>();
    for (const wo of json.data.workOrders) {
      const list = ordersByCenter.get(wo.data.workCenterId) ?? [];
      list.push(wo);
      ordersByCenter.set(wo.data.workCenterId, list);
    }

    const linked: WorkCenterWithOrders[] = json.data.workCenters.map((wc) => ({
      ...wc,
      workOrders: ordersByCenter.get(wc.docId) ?? [],
    }));

    this.workCentersSignal.set(linked);
  }
}
