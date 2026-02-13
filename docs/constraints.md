# Data Modeling Constraints

---

## **Time Constraints**

```typescript
// 1. Date Format & Validity
- All dates: ISO 8601 datetime strings ("2025-01-15T09:30:00")
- workOrder.endDate > workOrder.startDate  // Always true
- Both dates required (no null/undefined)

// 2. Zoom Level Impacts Date Granularity
zoomLevel: 'hour' | 'day' | 'week' | 'month'
// - Hour: Show individual hours (±6 hours from reference, 12 hours total)
// - Day: Show individual days (±14 days from today)
// - Week: Show weeks (±8 weeks from today)
// - Month: Show months (±6 months from today)
// (All ranges configurable in timeline-config.ts)

// 3. Current Day Tracking
todayDate: Date  // Used for:
  - Vertical indicator on timeline
  - Default centering when app loads
  - Calculating relative positions

// 4. Visible Date Range (calculated from zoom + scroll)
visibleRange: {
  start: Date;
  end: Date;
}
// Order is visible if: order.startDate <= range.end AND order.endDate >= range.start
```

**Modeling tip:** Store dates as ISO strings, but always parse to `Date` objects for calculations.

---

## **Dependency Constraints**

```typescript
// 1. Foreign Key Relationship
interface WorkOrderDocument {
  data: {
    workCenterId: string;  // MUST reference existing WorkCenter.docId
  }
}

// Constraint: workOrder.workCenterId must exist in workCenters array
// Error handling: Prevent creating order for non-existent center

// 2. Cascade Considerations
// If deleting a WorkCenter:
//   - Should delete ALL associated WorkOrders? OR
//   - Prevent deletion if orders exist?
// → Project doesn't specify; recommend: Prevent deletion (safer)

// 3. Overlap Constraint (temporal + spatial)
interface OverlapCheck {
  centerId: string;        // Same work center
  newStart: string;
  newEnd: string;
  excludeOrderId?: string; // For edit: exclude self from comparison
}

// Overlap exists if:
// ∃ existingOrder where:
//   - existingOrder.workCenterId === centerId
//   - NOT (existingOrder.endDate < newStart OR existingOrder.startDate > newEnd)
//   - existingOrder.docId !== excludeOrderId
```

**Modeling tip:** Add an `isOverlapping()` method to your service that validates before create/update operations.

---

## **Location Constraints**

```typescript
// 1. Work Center Scope
// Each work center is a separate "lane" on timeline
interface WorkCenterRow {
  centerId: string;
  centerName: string;
  orders: WorkOrderDocument[];  // All orders for THIS center only
}

// Constraint: Orders sorted by startDate within each center

// 2. Spatial Positioning (pixel-based)
// Bar position = f(startDate, visibleRange, zoomLevel)
// Bar width = f(endDate - startDate, zoomLevel)

// Example calculation:
function getBarPosition(order: WorkOrder, range: DateRange, colWidth: number) {
  const totalDays = daysBetween(range.start, range.end);
  const offsetDays = daysBetween(range.start, order.startDate);
  return (offsetDays / totalDays) * containerWidth;
}

// Constraint: Bar must fit within visible area
// If order spans beyond visible range, clip/truncate display

// 3. Fixed vs Scrollable Areas
// Layout constraint:
//   ┌─────────────────┬──────────────────┐
//   │  FIXED PANEL    │  SCROLLABLE AREA │
//   │ (work centers)  │  (timeline grid) │
//   └─────────────────┴──────────────────┘
//
// Left panel width: Fixed (e.g., 200px)
// Right panel: Horizontally scrollable only
```

**Modeling tip:** Decouple work center list from timeline grid. They scroll independently.

---

## **Practical Data Validation Rules**

Create these validation functions:

```typescript
// 1. Date Validation
isValidDateRange(start: string, end: string): boolean {
  return new Date(start) < new Date(end);
}

// 2. Overlap Detection
hasOverlap(orders: WorkOrder[], centerId: string, newStart: string, newEnd: string, excludeId?: string): boolean {
  const centerOrders = orders.filter(o => o.workCenterId === centerId && o.docId !== excludeId);
  const newStartDate = new Date(newStart);
  const newEndDate = new Date(newEnd);

  return centerOrders.some(order => {
    const orderStart = new Date(order.startDate);
    const orderEnd = new Date(order.endDate);
    // Overlaps if: NOT (one ends before other starts)
    return !(orderEnd <= newStartDate || orderStart >= newEndDate);
  });
}

// 3. Reference Validity
centerExists(orders: WorkOrder[], centerId: string): boolean {
  return this.workCenters.some(c => c.docId === centerId);
}

// 4. Visibility Calculation
isOrderVisible(order: WorkOrder, visibleRange: DateRange): boolean {
  const orderStart = new Date(order.startDate);
  const orderEnd = new Date(order.endDate);
  return orderStart <= visibleRange.end && orderEnd >= visibleRange.start;
}
```

---

## **Summary Table**

| Constraint Type | What to Model | Impact |
|---|---|---|
| **Time** | Date format, validity, zoom ranges, visible window | Calculate bar positions, determine what renders |
| **Dependency** | workCenterId FK relationship, orphan prevention | Prevent invalid references, cascade rules |
| **Location** | Center-scoped orders, pixel positioning, layout | Render in correct rows, handle overlaps, fixed sidebar |
| **Overlap** | No two orders on same center share time range | Validation before create/update |

The hardest part will be **time + location**: converting ISO date strings into pixel positions that respect the zoom level and scroll offset.
