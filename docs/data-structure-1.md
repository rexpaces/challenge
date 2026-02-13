# Data Structures Overview

The project uses a **document-based data structure** with two main entity types. Here's what you need to design:

## 1. **Base Document Pattern**

Every document follows this wrapper structure:

```typescript
{
  docId: string;        // Unique identifier (UUID or custom)
  docType: string;      // Discriminator: 'workCenter' | 'workOrder'
  data: { }             // Entity-specific fields
}
```

This allows you to store different document types in the same collection and filter by `docType`.

---

## 2. **WorkCenter** (Production Lines/Machines)

```typescript
interface WorkCenterDocument {
  docId: string;
  docType: 'workCenter';
  data: {
    name: string;  // e.g., "Extrusion Line A", "CNC Machine 1"
  };
}
```

**You need:** At least 5 realistic work centers

**Examples:**
- Extrusion Line A
- CNC Machine 1
- Assembly Station
- Quality Control
- Packaging Line

---

## 3. **WorkOrder** (Scheduled Tasks)

```typescript
interface WorkOrderDocument {
  docId: string;
  docType: 'workOrder';
  data: {
    name: string;                 // Order name/ID
    workCenterId: string;         // FK → WorkCenterDocument.docId
    status: 'open' | 'in-progress' | 'complete' | 'blocked';
    startDate: string;            // ISO 8601 format: "2025-01-15T09:30:00"
    endDate: string;              // ISO 8601 format: "2025-01-22T17:30:00"
  };
}
```

**Key relationships:**
- `workCenterId` links each order to a specific work center
- Multiple orders can be on the same work center (but **cannot overlap**)
- Dates determine positioning on the timeline

**You need:** At least 8 work orders with:
- All 4 status types represented
- Multiple (non-overlapping) orders on the same work center
- Various date ranges

---

## 4. **Additional Data Structures You'll Need**

For the UI component state, consider:

```typescript
// For timeline calculations
interface TimelineColumn {
  date: Date;
  position: number;  // pixel offset
}

// For form management
interface WorkOrderFormData {
  name: string;
  status: WorkOrderStatus;
  startDate: Date;
  endDate: Date;
}

// For UI state
interface TimelineState {
  workCenters: WorkCenterDocument[];
  workOrders: WorkOrderDocument[];
  visibleDateRange: { start: Date; end: Date };
  zoomLevel: 'hour' | 'day' | 'week' | 'month';
  selectedWorkCenter?: string;  // For row hover
}
```

---

## 5. **Sample Data Strategy**

Create a `sample-data.ts` file with hardcoded data:

```typescript
export const SAMPLE_WORK_CENTERS: WorkCenterDocument[] = [
  { docId: 'wc-1', docType: 'workCenter', data: { name: 'Extrusion Line A' } },
  { docId: 'wc-2', docType: 'workCenter', data: { name: 'CNC Machine 1' } },
  // ... more
];

export const SAMPLE_WORK_ORDERS: WorkOrderDocument[] = [
  {
    docId: 'wo-1',
    docType: 'workOrder',
    data: {
      name: 'Order #1001',
      workCenterId: 'wc-1',
      status: 'complete',
      startDate: '2025-01-10T08:00:00',
      endDate: '2025-01-15T17:30:00'
    }
  },
  // ... more demonstrating all statuses and centers
];
```

---

## 6. **Key Design Decisions**

| Aspect | Consideration |
|--------|---|
| **Date Format** | Use ISO 8601 datetime strings (`"2025-01-15T09:30:00"`) for storage, convert to `Date` objects for calculations |
| **IDs** | Use UUID v4 or simple strings like `wc-1`, `wo-1` (easier to debug) |
| **Overlap Check** | Compare date ranges for orders on same `workCenterId` |
| **State Management** | Start with component state (no external store), add service if needed |
| **Immutability** | Use spread operator or structured clone for updates |

---

## 7. **Service Architecture Suggestion**

```typescript
@Injectable()
export class WorkOrderService {
  private workCenters$ = signal<WorkCenterDocument[]>([]);
  private workOrders$ = signal<WorkOrderDocument[]>([]);

  // Methods for CRUD operations
  createWorkOrder(order: WorkOrderData): void { }
  updateWorkOrder(id: string, order: WorkOrderData): void { }
  deleteWorkOrder(id: string): void { }
  getOrdersByCenter(centerId: string): WorkOrderDocument[] { }
  hasOverlap(centerId: string, startDate: string, endDate: string, excludeId?: string): boolean { }
}
```

---

## Summary

This data structure is straightforward and flexible. The main challenge will be **date positioning calculations** and **overlap detection logic**, not the data structure itself.
