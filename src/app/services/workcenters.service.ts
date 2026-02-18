import { Injectable, signal } from '@angular/core';
import { WorkCenterDocument, WorkOrderData, WorkOrderDocument } from '../../model';

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

  readonly lastSavedWorkOrder = signal<WorkOrderDocument | null>(null);

  addWorkOrder(order: WorkOrderDocument): void {
    const centers = this.workCentersSignal();
    const idx = centers.findIndex((wc) => wc.docId === order.data.workCenterId);
    if (idx < 0) return;

    const updated = centers.map((wc, i) =>
      i === idx ? { ...wc, workOrders: [...wc.workOrders, order] } : wc,
    );
    this.workCentersSignal.set(updated);
    this.lastSavedWorkOrder.set(order);
  }

  updateWorkOrder(order: WorkOrderDocument): void {
    const centers = this.workCentersSignal();
    const updated = centers.map((wc) => {
      const hasOrder = wc.workOrders.some((o) => o.docId === order.docId);
      if (!hasOrder) return wc;
      return {
        ...wc,
        workOrders: wc.workOrders.map((o) => (o.docId === order.docId ? order : o)),
      };
    });
    this.workCentersSignal.set(updated);
    this.lastSavedWorkOrder.set(order);
  }

  deleteWorkOrder(docId: string): void {
    const updated = this.workCentersSignal().map((wc) => ({
      ...wc,
      workOrders: wc.workOrders.filter((o) => o.docId !== docId),
    }));
    this.workCentersSignal.set(updated);
  }

  getOrdersForCenter(workCenterId: string): WorkOrderDocument[] {
    return this.workCenters().find((wc) => wc.docId === workCenterId)?.workOrders ?? [];
  }

  ordersOverlap(order1: WorkOrderData, order2: WorkOrderData): boolean {
    const end1 = new Date(order1.endDate).getTime();
    const start1 = new Date(order1.startDate).getTime();
    const end2 = new Date(order2.endDate).getTime();
    const start2 = new Date(order2.startDate).getTime();

    // Overlap if: NOT (one ends strictly before other starts)
    // Touching edges (end1 === start2) count as overlap
    return !(end1 < start2 || start1 > end2);
  }

  hasOverlapOnCenter(
    newOrder: WorkOrderData,
    existingOrders: WorkOrderDocument[],
    excludeDocId?: string,
  ): boolean {
    return existingOrders
      .filter((o) => o.data.workCenterId === newOrder.workCenterId)
      .filter((o) => !excludeDocId || o.docId !== excludeDocId)
      .some((o) => this.ordersOverlap(o.data, newOrder));
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
