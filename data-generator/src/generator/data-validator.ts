/**
 * Data validation utilities
 * Ensures generated data is valid and has no overlaps
 */

import type { WorkOrderDocument, WorkOrderStatus } from './config';

/**
 * Work order data (internal type)
 */
interface WorkOrderData {
  name: string;
  workCenterId: string;
  status: 'open' | 'in-progress' | 'complete' | 'blocked';
  startDate: string;
  endDate: string;
}

export class DataValidator {
  /**
   * Check if a new work order overlaps with existing orders on the same work center
   * Orders that touch at edges (end time = start time) are considered overlapping
   */
  static hasOverlapOnCenter(
    newOrder: WorkOrderData,
    existingOrders: WorkOrderDocument[]
  ): boolean {
    return existingOrders
      .filter(o => o.data.workCenterId === newOrder.workCenterId)
      .some(o => this.ordersOverlap(o.data, newOrder));
  }

  /**
   * Check if two orders overlap
   * Treats touching edges (end1 = start2) as overlapping
   * Uses strict inequality: NOT (end1 < start2 OR start1 > end2)
   */
  private static ordersOverlap(order1: WorkOrderData, order2: WorkOrderData): boolean {
    const end1 = new Date(order1.endDate).getTime();
    const start1 = new Date(order1.startDate).getTime();
    const end2 = new Date(order2.endDate).getTime();
    const start2 = new Date(order2.startDate).getTime();

    // Overlap if: NOT (one ends strictly before other starts)
    // Using < instead of <= to treat touching edges as overlap
    // Example: if order1 ends at 10:00 and order2 starts at 10:00:
    //   end1 < start2 → 10:00 < 10:00 → FALSE
    //   start1 > end2 → FALSE (assuming order1 starts before order2 ends)
    //   !(FALSE || FALSE) = TRUE (overlap detected) ✓
    return !(end1 < start2 || start1 > end2);
  }

  /**
   * Validate work order data structure and values
   */
  static isValidWorkOrder(order: WorkOrderData): boolean {
    try {
      // Validate name
      if (!order.name || typeof order.name !== 'string' || order.name.trim().length === 0) {
        return false;
      }

      // Validate workCenterId
      if (!order.workCenterId || typeof order.workCenterId !== 'string' || order.workCenterId.trim().length === 0) {
        return false;
      }

      // Validate status
      const validStatuses: WorkOrderStatus[] = ['open', 'in-progress', 'complete', 'blocked'];
      if (!order.status || !validStatuses.includes(order.status)) {
        return false;
      }

      // Validate date format and ordering
      const startDate = new Date(order.startDate);
      const endDate = new Date(order.endDate);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return false;
      }

      if (startDate >= endDate) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate work center name
   */
  static isValidWorkCenter(name: string): boolean {
    return typeof name === 'string' && name.trim().length > 0;
  }

  /**
   * Check if work center name already exists
   */
  static isDuplicateWorkCenter(name: string, existingCenters: { name: string }[]): boolean {
    const normalizedName = name.trim().toLowerCase();
    return existingCenters.some(
      center => center.name.trim().toLowerCase() === normalizedName
    );
  }

  /**
   * Check if work order name already exists for a center
   */
  static isDuplicateWorkOrder(
    name: string,
    existingOrders: WorkOrderDocument[],
    centerId: string
  ): boolean {
    const normalizedName = name.trim().toLowerCase();
    return existingOrders
      .filter(o => o.data.workCenterId === centerId)
      .some(o => o.data.name.trim().toLowerCase() === normalizedName);
  }
}
