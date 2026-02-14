/**
 * Base Document Structure
 * All documents follow this wrapper pattern with a discriminator field
 */

/**
 * Generic document base type for all entities
 */
export interface Document<T = any> {
  docId: string;
  docType: string;
  data: T;
}

/**
 * Work Center Document
 * Represents a production line, machine, or work area where work orders are scheduled
 */
export interface WorkCenterData {
  name: string;
}

export interface WorkCenterDocument extends Document<WorkCenterData> {
  docType: 'workCenter';
}

/**
 * Work Order Status Types
 */
export type WorkOrderStatus = 'open' | 'in-progress' | 'complete' | 'blocked';

/**
 * Zoom Level Types for Timeline
 */
export type ZoomLevel = 'hour' | 'day' | 'week' | 'month';

/**
 * Work Order Document
 * Represents a scheduled task/order on a specific work center
 */
export interface WorkOrderData {
  name: string;
  workCenterId: string; // FK reference to WorkCenterDocument.docId
  status: WorkOrderStatus;
  startDate: string; // ISO 8601 datetime format: "2025-01-15T09:30:00"
  endDate: string; // ISO 8601 datetime format: "2025-01-15T17:30:00"
}

export interface WorkOrderDocument extends Document<WorkOrderData> {
  docType: 'workOrder';
}

/**
 * Union type for all document types
 * Useful for type guards and generic handlers
 */
export type AnyDocument = WorkCenterDocument | WorkOrderDocument;

/**
 * Type guard functions
 */
export function isWorkCenterDocument(doc: AnyDocument): doc is WorkCenterDocument {
  return doc.docType === 'workCenter';
}

export function isWorkOrderDocument(doc: AnyDocument): doc is WorkOrderDocument {
  return doc.docType === 'workOrder';
}
