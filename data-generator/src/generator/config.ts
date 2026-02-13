/**
 * Configuration types and interfaces for the data generator
 *
 * Note: We don't import types from /model/ to avoid monorepo complexity.
 * Data-generator produces JSON that conforms to the model interfaces,
 * which the frontend/backend consume and validate using their own type imports.
 */

export type WorkOrderStatus = 'open' | 'in-progress' | 'complete' | 'blocked';

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

/**
 * Generator configuration options
 */
export interface GeneratorConfig {
  numCenters: number;
  ordersPerCenter: number;
  batchSize: number;
  model: string;
}

/**
 * Work Center document (matches /model/documents.ts)
 */
export interface WorkCenterDocument {
  docId: string;
  docType: 'workCenter';
  data: {
    name: string;
  };
}

/**
 * Work Order document (matches /model/documents.ts)
 */
export interface WorkOrderDocument {
  docId: string;
  docType: 'workOrder';
  data: {
    name: string;
    workCenterId: string;
    status: 'open' | 'in-progress' | 'complete' | 'blocked';
    startDate: string;
    endDate: string;
  };
}

/**
 * Generated data output structure
 */
export interface GeneratedData {
  workCenters: WorkCenterDocument[];
  workOrders: WorkOrderDocument[];
  stats: {
    totalGenerated: number;
    totalValid: number;
    totalDiscarded: number;
  };
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: GeneratorConfig = {
  numCenters: 5,
  ordersPerCenter: 20,
  batchSize: 5,
  model: 'gemma3:12b'
};
