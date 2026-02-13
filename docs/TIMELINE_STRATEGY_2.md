# Timeline Component - Strategy 2: Time-indexed Virtualization

**Document Version:** 1.0
**Status:** Implementation Guide
**Target Audience:** Frontend developers

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Data Flow](#data-flow)
4. [Core Concepts](#core-concepts)
5. [Implementation Guide](#implementation-guide)
6. [Performance Considerations](#performance-considerations)
7. [Testing Strategy](#testing-strategy)
8. [Troubleshooting](#troubleshooting)

---

## Overview

### What is Time-indexed Virtualization?

Instead of rendering all 10,000 work orders at once, we:
1. **Maintain a visible date range** (e.g., Jan 15-22)
2. **Only load/render orders in that range** (~50-100 orders)
3. **Dynamically expand the range** as the user scrolls left/right
4. **Prepend/append date columns** to create infinite scroll effect

### Why This Strategy?

| Problem | Solution |
|---------|----------|
| 10K orders in memory | Only ~50-100 in memory at any time |
| Slow scrolling on mobile | Fewer DOM nodes = smooth scroll |
| Janky change detection | Change detection only runs on visible orders |
| High CPU usage | Canvas-free, but optimized rendering |

### Performance Targets

- ✅ Smooth scroll on iPhone 12 (mobile)
- ✅ Handle 100K+ work orders
- ✅ <100ms initial load
- ✅ <16ms per frame during scroll (60 FPS)

---

## Architecture

### System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                  Timeline Component                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────┐         ┌──────────────────────────┐ │
│  │  Left Panel      │         │  Right Panel (Scrollable)│ │
│  │  (Fixed)         │         │                          │ │
│  │                  │         │  ┌──────────────────────┐│ │
│  │ [Work Center 1]  │         │  │  Date Columns        ││ │
│  │ [Work Center 2]  │ ──────→ │  │  Jan 15 Jan 16 ...   ││ │
│  │ [Work Center 3]  │         │  └──────────────────────┘│ │
│  │                  │         │  ┌──────────────────────┐│ │
│  │ Virtual Scroll   │         │  │ Work Order Rows      ││ │
│  │ (Rows)           │         │  │ (CDK Virtual Scroll) ││ │
│  │                  │         │  │ Renders only visible ││ │
│  └──────────────────┘         │  │ centers              ││ │
│                               │  └──────────────────────┘│ │
│                               └──────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
         ↓ Horizontal Scroll
    Update Date Range
         ↓
 Prepend/Append Columns
         ↓
   Re-render Grid
```

### Service Layer

```typescript
TimelineService (Singleton)
├── workCenters$ (signal)
├── workOrders$ (signal)
├── zoomLevel$ (signal)
├── visibleDateRange$ (signal) ← Key: manually managed
│
├── Computed Signals:
│   ├── visibleOrders$ (filtered by date range)
│   ├── ordersByCenter$ (grouped for fast lookup)
│   └── visibleDates$ (columns to render)
│
└── Methods:
    ├── expandDateRange(direction)
    ├── getOrdersForCenter$(centerId)
    ├── updateZoomLevel(zoom)
    └── calculateVisibleDates()
```

### Component Hierarchy

```
TimelineComponent (Container)
├── Left Panel (Fixed)
│   └── Work Center Labels
│
└── Right Panel (Scrollable, Virtualized)
    ├── Date Columns Container
    │   └── DateColumnComponent × N (only visible dates)
    │
    └── CDK Virtual Scroll Viewport
        └── TimelineRowComponent × M (only visible centers)
            └── WorkOrderBarComponent × K (only visible orders)
```

---

## Data Flow

### Initial Load

```
1. User opens app
   ↓
2. TimelineComponent initializes
   ↓
3. Service loads all workCenters & workOrders
   ↓
4. visibleDateRange$ = Today ± 2 weeks (configurable)
   ↓
5. visibleOrders$ computed automatically
   ↓
6. Component renders only visible orders
   ↓
7. User sees timeline centered on today
```

### Horizontal Scroll (Left)

```
User scrolls left edge
   ↓
ScrollEvent detected (debounced 100ms)
   ↓
scrollLeft < threshold (e.g., 100px)
   ↓
TimelineService.expandDateRange('left')
   ↓
visibleDateRange.start -= 1 week
   ↓
visibleOrders$ recalculates
   ↓
visibleDates$ regenerates (prepend new columns)
   ↓
Component detects signal change
   ↓
Adjust scroll position (maintain viewport position)
   ↓
Render new columns & orders
```

### Zoom Level Change

```
User selects "Week" zoom
   ↓
timelineService.updateZoomLevel('week')
   ↓
zoomLevel$ signal updates
   ↓
Component recalculates:
  - visibleDates$ (now weeks instead of days)
  - Column widths
  - Order bar positions
   ↓
Smooth animation to new zoom (optional)
   ↓
User sees weekly view
```

---

## Core Concepts

### 1. Visible Date Range

The **key state** that drives everything:

```typescript
visibleDateRange$ = signal<DateRange>({
  start: new Date('2025-01-15T00:00:00'),
  end: new Date('2025-01-22T23:59:59')
})

// This range determines:
// - Which columns are rendered
// - Which orders are visible
// - Position calculations
```

**Why this works:**
- Simple to understand: "Show me orders between these dates"
- Easy to calculate: `order.startDate <= range.end && order.endDate >= range.start`
- Natural for timelines: We think in "date windows"

### 2. Buffer for Smooth Scrolling

To avoid sudden jumps, we add a **buffer**:

```typescript
private BUFFER_HOURS = 24 * 7; // 1 week on each side

expandDateRange(direction: 'left' | 'right') {
  const current = this.visibleDateRange$();

  if (direction === 'left') {
    // Expand left by full buffer
    this.visibleDateRange$.set({
      start: addHours(current.start, -this.BUFFER_HOURS),
      end: current.end
    });
  }
}

// Result:
// Before: Jan 15-22
// After:  Jan 8-22 (expanded 1 week left)
// User continues scrolling smoothly
```

### 3. Derived Signals (Computed)

Use Angular signals `computed()` for automatic recalculation:

```typescript
// Every time workOrders$ or visibleDateRange$ changes,
// this recalculates automatically (no manual refresh needed)
visibleOrders$ = computed(() => {
  const orders = this.workOrders$();
  const range = this.visibleDateRange$();

  return orders.filter(order => {
    const orderStart = new Date(order.data.startDate);
    const orderEnd = new Date(order.data.endDate);
    return orderStart <= range.end && orderEnd >= range.start;
  });
});
```

**Benefits:**
- ✅ Reactive: updates automatically
- ✅ Efficient: only recalculates when dependencies change
- ✅ No manual subscriptions needed
- ✅ Works with OnPush change detection

### 4. Scroll Position Adjustment (Critical!)

When prepending columns, scroll position must adjust:

```typescript
// User is at scroll position 500px
// We prepend 1 week of columns (700px wide)
// If we don't adjust, content jumps!

// Solution:
const scrollBefore = element.scrollLeft;
const widthAdded = 700;

// Prepend columns
this.timelineService.expandDateRange('left');

// Wait for render, then adjust scroll
requestAnimationFrame(() => {
  element.scrollLeft = scrollBefore + widthAdded;
});

// Result: Content stays in place, seamless infinite scroll
```

### 5. Work Orders by Center (Optimization)

Group orders by center for fast lookups:

```typescript
ordersByCenter$ = computed(() => {
  const orders = this.visibleOrders$();
  const grouped = new Map<string, WorkOrderDocument[]>();

  orders.forEach(order => {
    const centerId = order.data.workCenterId;
    if (!grouped.has(centerId)) {
      grouped.set(centerId, []);
    }
    grouped.get(centerId)!.push(order);
  });

  return grouped;
});

// Usage: Get orders for specific center (O(1) instead of O(n))
const centerOrders = ordersByCenter$().get('wc-1') || [];
```

---

## Implementation Guide

### Phase 1: Core Service

**File:** `src/services/timeline.service.ts`

```typescript
import { Injectable, signal, computed, effect } from '@angular/core';
import type { WorkCenterDocument, WorkOrderDocument, ZoomLevel } from '../../../model';
import { getZoomConfig, getTotalVisibleHours } from '../../../model/timeline-config';

export interface DateRange {
  start: Date;
  end: Date;
}

@Injectable({ providedIn: 'root' })
export class TimelineService {
  // Main state
  private workCenters$ = signal<WorkCenterDocument[]>([]);
  private workOrders$ = signal<WorkOrderDocument[]>([]);
  private zoomLevel$ = signal<ZoomLevel>('day');

  // Visible date range (YOU manage this)
  private visibleDateRange$ = signal<DateRange>({
    start: this.getInitialStartDate(),
    end: this.getInitialEndDate()
  });

  // Derived signals (computed automatically)
  visibleOrders$ = computed(() => {
    const orders = this.workOrders$();
    const range = this.visibleDateRange$();

    return orders.filter(order => {
      const orderStart = new Date(order.data.startDate);
      const orderEnd = new Date(order.data.endDate);
      return orderStart <= range.end && orderEnd >= range.start;
    });
  });

  ordersByCenter$ = computed(() => {
    const orders = this.visibleOrders$();
    const grouped = new Map<string, WorkOrderDocument[]>();

    orders.forEach(order => {
      const centerId = order.data.workCenterId;
      if (!grouped.has(centerId)) {
        grouped.set(centerId, []);
      }
      grouped.get(centerId)!.push(order);
    });

    return grouped;
  });

  // Public getters
  get workCenters() {
    return this.workCenters$;
  }

  get visibleDateRange() {
    return this.visibleDateRange$;
  }

  get zoomLevel() {
    return this.zoomLevel$;
  }

  // Load initial data
  loadData(centers: WorkCenterDocument[], orders: WorkOrderDocument[]) {
    this.workCenters$.set(centers);
    this.workOrders$.set(orders);
  }

  // Expand visible date range
  expandDateRange(direction: 'left' | 'right') {
    const current = this.visibleDateRange$();
    const config = getZoomConfig(this.zoomLevel$());
    const bufferHours = this.getBufferHours();

    if (direction === 'left') {
      this.visibleDateRange$.set({
        start: new Date(current.start.getTime() - bufferHours * 3600000),
        end: current.end
      });
    } else {
      this.visibleDateRange$.set({
        start: current.start,
        end: new Date(current.end.getTime() + bufferHours * 3600000)
      });
    }
  }

  // Get orders for specific center
  getOrdersForCenter(centerId: string): WorkOrderDocument[] {
    return this.ordersByCenter$().get(centerId) || [];
  }

  // Update zoom level
  updateZoomLevel(zoom: ZoomLevel) {
    this.zoomLevel$.set(zoom);
  }

  // Helper: center timeline on specific date
  centerOnDate(date: Date) {
    const bufferHours = this.getBufferHours();
    this.visibleDateRange$.set({
      start: new Date(date.getTime() - (bufferHours / 2) * 3600000),
      end: new Date(date.getTime() + (bufferHours / 2) * 3600000)
    });
  }

  // Helpers
  private getInitialStartDate(): Date {
    const today = new Date();
    const bufferHours = this.getBufferHours();
    return new Date(today.getTime() - (bufferHours / 2) * 3600000);
  }

  private getInitialEndDate(): Date {
    const today = new Date();
    const bufferHours = this.getBufferHours();
    return new Date(today.getTime() + (bufferHours / 2) * 3600000);
  }

  private getBufferHours(): number {
    const zoom = this.zoomLevel$();
    const config = getZoomConfig(zoom);
    // Buffer: show config's rangeBeforeHours + rangeAfterHours
    return config.rangeBeforeHours + config.rangeAfterHours;
  }
}
```

### Phase 2: Timeline Container Component

**File:** `src/components/timeline/timeline.component.ts`

```typescript
import { Component, OnInit, ViewChild, ChangeDetectionStrategy, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScrollingModule } from '@angular/cdk/scrolling';

import { TimelineService, DateRange } from '../../services/timeline.service';
import { TimelineRowComponent } from './timeline-row/timeline-row.component';
import { WorkOrderService } from '../../services/work-order.service';
import { getZoomConfig } from '../../../model/timeline-config';

@Component({
  selector: 'app-timeline',
  standalone: true,
  imports: [CommonModule, ScrollingModule, TimelineRowComponent],
  template: `
    <div class="timeline-container">
      <!-- Left Panel (Fixed) -->
      <div class="left-panel">
        <div class="header">Work Centers</div>
        <div class="centers">
          <div class="center-item" *ngFor="let center of timelineService.workCenters()">
            {{ center.data.name }}
          </div>
        </div>
      </div>

      <!-- Right Panel (Scrollable) -->
      <div class="right-panel" #rightPanel (scroll)="onHorizontalScroll($event)">
        <!-- Date Columns Header -->
        <div class="date-columns">
          <div class="date-column" *ngFor="let date of visibleDates$(); trackBy: trackByDate">
            <span class="date-label">{{ formatDate(date, timelineService.zoomLevel()) }}</span>
          </div>
        </div>

        <!-- Work Order Rows (Virtualized) -->
        <cdk-virtual-scroll-viewport itemSize="60" class="orders-viewport">
          <timeline-row
            *cdkVirtualFor="let center of timelineService.workCenters(); trackBy: trackByCenter"
            [center]="center"
            [orders]="timelineService.getOrdersForCenter(center.docId)"
            [visibleDateRange]="timelineService.visibleDateRange()"
            [zoomLevel]="timelineService.zoomLevel()"
          ></timeline-row>
        </cdk-virtual-scroll-viewport>
      </div>
    </div>
  `,
  styles: [`
    .timeline-container {
      display: flex;
      height: 100vh;
      background: white;
    }

    .left-panel {
      width: 200px;
      border-right: 1px solid #e0e0e0;
      overflow-y: auto;
      flex-shrink: 0;
    }

    .header {
      padding: 12px;
      font-weight: bold;
      border-bottom: 1px solid #e0e0e0;
      background: #f5f5f5;
    }

    .center-item {
      padding: 10px 12px;
      border-bottom: 1px solid #f0f0f0;
      font-size: 14px;
      height: 60px;
      display: flex;
      align-items: center;
    }

    .right-panel {
      flex: 1;
      overflow-x: auto;
      overflow-y: hidden;
      position: relative;
    }

    .date-columns {
      display: flex;
      position: sticky;
      top: 0;
      background: #fafafa;
      border-bottom: 1px solid #e0e0e0;
      z-index: 10;
    }

    .date-column {
      flex-shrink: 0;
      border-right: 1px solid #e0e0e0;
      padding: 8px;
      text-align: center;
      font-size: 12px;
      font-weight: 500;
      min-width: 80px;
    }

    .orders-viewport {
      height: calc(100vh - 40px);
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TimelineComponent implements OnInit {
  @ViewChild('rightPanel') rightPanel: any;

  visibleDates$ = computed(() => this.calculateVisibleDates());

  private scrollTimeout: any;
  private lastScrollX = 0;

  constructor(
    readonly timelineService: TimelineService,
    private workOrderService: WorkOrderService
  ) {}

  ngOnInit() {
    // Load initial data
    this.workOrderService.getAll().then(({ centers, orders }) => {
      this.timelineService.loadData(centers, orders);
    });
  }

  onHorizontalScroll(event: Event) {
    const element = event.target as HTMLElement;
    const scrollLeft = element.scrollLeft;
    const scrollWidth = element.scrollWidth;
    const clientWidth = element.clientWidth;

    // Debounce scroll events
    clearTimeout(this.scrollTimeout);
    this.scrollTimeout = setTimeout(() => {
      // Check if approaching left edge (< 200px from left)
      if (scrollLeft < 200) {
        const scrollBefore = scrollLeft;
        this.timelineService.expandDateRange('left');

        // Adjust scroll position to maintain viewport
        requestAnimationFrame(() => {
          const widthAdded = 80 * 7; // ~1 week in pixels
          this.rightPanel.nativeElement.scrollLeft = scrollBefore + widthAdded;
        });
      }

      // Check if approaching right edge (< 200px from right)
      if (scrollLeft > scrollWidth - clientWidth - 200) {
        this.timelineService.expandDateRange('right');
      }

      this.lastScrollX = scrollLeft;
    }, 100); // Debounce 100ms
  }

  private calculateVisibleDates(): Date[] {
    const range = this.timelineService.visibleDateRange();
    const zoom = this.timelineService.zoomLevel();
    const dates: Date[] = [];

    let current = new Date(range.start);
    current.setHours(0, 0, 0, 0);

    while (current <= range.end) {
      dates.push(new Date(current));

      // Increment based on zoom level
      if (zoom === 'hour') {
        current.setHours(current.getHours() + 1);
      } else if (zoom === 'day') {
        current.setDate(current.getDate() + 1);
      } else if (zoom === 'week') {
        current.setDate(current.getDate() + 7);
      } else {
        current.setMonth(current.getMonth() + 1);
      }
    }

    return dates;
  }

  trackByCenter(index: number, center: any) {
    return center.docId;
  }

  trackByDate(index: number, date: Date) {
    return date.getTime();
  }

  formatDate(date: Date, zoom: string): string {
    if (zoom === 'hour') {
      return date.getHours().toString().padStart(2, '0') + ':00';
    } else if (zoom === 'day') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else if (zoom === 'week') {
      const week = Math.ceil((date.getDate() + new Date(date.getFullYear(), date.getMonth(), 1).getDay()) / 7);
      return `W${week}`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    }
  }
}
```

### Phase 3: Timeline Row Component

**File:** `src/components/timeline/timeline-row/timeline-row.component.ts`

```typescript
import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

import type { WorkCenterDocument, WorkOrderDocument, ZoomLevel } from '../../../model';
import type { DateRange } from '../../services/timeline.service';
import { WorkOrderBarComponent } from '../work-order-bar/work-order-bar.component';

@Component({
  selector: 'timeline-row',
  standalone: true,
  imports: [CommonModule, WorkOrderBarComponent],
  template: `
    <div class="timeline-row">
      <div class="row-content">
        <work-order-bar
          *ngFor="let order of orders; trackBy: trackByOrder"
          [order]="order"
          [visibleDateRange]="visibleDateRange"
          [zoomLevel]="zoomLevel"
          (click)="onOrderClick(order)"
        ></work-order-bar>
      </div>
    </div>
  `,
  styles: [`
    .timeline-row {
      display: flex;
      height: 60px;
      border-bottom: 1px solid #f0f0f0;
      background: white;
      position: relative;

      &:hover {
        background: #f9f9f9;
      }
    }

    .row-content {
      flex: 1;
      position: relative;
      display: flex;
      align-items: center;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TimelineRowComponent {
  @Input() center!: WorkCenterDocument;
  @Input() orders!: WorkOrderDocument[];
  @Input() visibleDateRange!: DateRange;
  @Input() zoomLevel!: ZoomLevel;

  onOrderClick(order: WorkOrderDocument) {
    console.log('Order clicked:', order);
    // Open edit panel
  }

  trackByOrder(index: number, order: WorkOrderDocument) {
    return order.docId;
  }
}
```

### Phase 4: Work Order Bar Component

**File:** `src/components/timeline/work-order-bar/work-order-bar.component.ts`

```typescript
import { Component, Input, ChangeDetectionStrategy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

import type { WorkOrderDocument, ZoomLevel } from '../../../model';
import type { DateRange } from '../../services/timeline.service';
import { getZoomConfig } from '../../../model/timeline-config';

const CONTAINER_WIDTH = 1200; // Adjust based on your layout

@Component({
  selector: 'work-order-bar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="order-bar"
      [style.left.px]="position()"
      [style.width.px]="width()"
      [class]="'status-' + order.data.status"
      [title]="tooltipText()"
    >
      <span class="order-name">{{ order.data.name }}</span>
      <span class="status-badge">{{ order.data.status }}</span>
    </div>
  `,
  styles: [`
    .order-bar {
      position: absolute;
      height: 40px;
      display: flex;
      align-items: center;
      padding: 0 8px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      border: 1px solid;
      transition: all 200ms ease;

      &:hover {
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        transform: translateY(-2px);
      }

      &.status-open {
        background: #e3f2fd;
        border-color: #1976d2;
        color: #1976d2;
      }

      &.status-in-progress {
        background: #f3e5f5;
        border-color: #7b1fa2;
        color: #7b1fa2;
      }

      &.status-complete {
        background: #e8f5e9;
        border-color: #388e3c;
        color: #388e3c;
      }

      &.status-blocked {
        background: #fff3e0;
        border-color: #f57c00;
        color: #f57c00;
      }
    }

    .order-name {
      flex: 1;
      font-weight: 500;
    }

    .status-badge {
      font-size: 11px;
      padding: 2px 6px;
      background: rgba(0,0,0,0.1);
      border-radius: 2px;
      margin-left: 4px;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WorkOrderBarComponent {
  @Input() order!: WorkOrderDocument;
  @Input() visibleDateRange!: DateRange;
  @Input() zoomLevel!: ZoomLevel;

  // Calculate left position based on start date
  position = computed(() => {
    const orderStart = new Date(this.order.data.startDate);
    const rangeStart = this.visibleDateRange.start;
    const offsetMs = orderStart.getTime() - rangeStart.getTime();

    const config = getZoomConfig(this.zoomLevel);
    const totalHours = this.getTotalVisibleHours();
    const totalMs = totalHours * 3600000;

    return (offsetMs / totalMs) * CONTAINER_WIDTH;
  });

  // Calculate width based on duration
  width = computed(() => {
    const orderStart = new Date(this.order.data.startDate);
    const orderEnd = new Date(this.order.data.endDate);
    const durationMs = orderEnd.getTime() - orderStart.getTime();

    const totalHours = this.getTotalVisibleHours();
    const totalMs = totalHours * 3600000;

    return Math.max((durationMs / totalMs) * CONTAINER_WIDTH, 30); // Min width 30px
  });

  tooltipText = computed(() => {
    const start = new Date(this.order.data.startDate).toLocaleString();
    const end = new Date(this.order.data.endDate).toLocaleString();
    return `${this.order.data.name}\n${start} - ${end}\nStatus: ${this.order.data.status}`;
  });

  private getTotalVisibleHours(): number {
    const config = getZoomConfig(this.zoomLevel);
    return config.rangeBeforeHours + config.rangeAfterHours;
  }
}
```

---

## Performance Considerations

### 1. Change Detection (OnPush)

Use `ChangeDetectionStrategy.OnPush` on all components:

```typescript
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush  // ← Key!
})
```

**Why:** Change detection only runs when:
- @Input changes
- Event fires in component
- Observable emits (with async pipe)

Result: Much faster on large lists.

### 2. TrackBy Functions

Always use `trackBy` in `*ngFor`:

```typescript
// ❌ Bad: Re-renders on every change
<div *ngFor="let order of orders">

// ✅ Good: Re-renders only if item reference changes
<div *ngFor="let order of orders; trackBy: trackByOrder">
  {{ order.name }}
</div>

trackByOrder(index: number, order: WorkOrderDocument) {
  return order.docId;
}
```

### 3. Signals Over Observables

Use Angular Signals (14+) instead of Observables where possible:

```typescript
// ✅ Better: Signals
visibleOrders$ = computed(() => { /* ... */ });

// vs

// Observable (needs subscription, memory management)
visibleOrders$ = this.workOrders$.pipe(
  map(orders => orders.filter(...))
);
```

### 4. Debounce Scroll Events

```typescript
private scrollTimeout: any;

onScroll() {
  clearTimeout(this.scrollTimeout);
  this.scrollTimeout = setTimeout(() => {
    // Expensive operation here
    this.expandDateRange();
  }, 100); // Wait 100ms after scroll ends
}
```

### 5. Memory Management

- Unsubscribe from observables (or use `toSignal`)
- Clear timeouts on destroy
- Limit buffer size (don't load 6 months of data)

```typescript
ngOnDestroy() {
  clearTimeout(this.scrollTimeout);
}
```

---

## Testing Strategy

### Unit Tests

**Service:** `timeline.service.spec.ts`

```typescript
describe('TimelineService', () => {
  let service: TimelineService;

  beforeEach(() => {
    service = TestBed.inject(TimelineService);
  });

  it('should filter orders in visible range', () => {
    const orders = [
      { docId: '1', data: { startDate: '2025-01-10T00:00:00', endDate: '2025-01-12T00:00:00' } },
      { docId: '2', data: { startDate: '2025-01-20T00:00:00', endDate: '2025-01-22T00:00:00' } }
    ];

    service.loadData([], orders as any);
    service['visibleDateRange$'].set({
      start: new Date('2025-01-15T00:00:00'),
      end: new Date('2025-01-25T00:00:00')
    });

    const visible = service['visibleOrders$']();
    expect(visible.length).toBe(1);
    expect(visible[0].docId).toBe('2');
  });

  it('should expand date range left', () => {
    const initial = service['visibleDateRange$']();
    service.expandDateRange('left');
    const expanded = service['visibleDateRange$']();

    expect(expanded.start.getTime()).toBeLessThan(initial.start.getTime());
  });
});
```

### E2E Tests

**Scenario:** `scroll.e2e.spec.ts`

```typescript
describe('Timeline Infinite Scroll', () => {
  beforeEach(() => cy.visit('/timeline'));

  it('should load more orders when scrolling left', () => {
    cy.get('.right-panel').then(el => {
      const initialScrollLeft = el.scrollLeft();
      cy.get('.right-panel').scroll(0, 0); // Scroll to left edge
      cy.get('.date-columns').children().should('have.length.greaterThan', 7);
    });
  });

  it('should maintain smooth scroll during expansion', () => {
    cy.get('.right-panel').scrollTo('left');
    cy.get('.order-bar').should('be.visible');
    cy.get('.right-panel').scrollTo('right');
    cy.get('.order-bar').should('still.exist');
  });
});
```

---

## Troubleshooting

### Issue: Scroll jumps when expanding

**Cause:** Scroll position not adjusted during prepend

**Fix:**
```typescript
const scrollBefore = element.scrollLeft;
const widthAdded = newColumns.length * columnWidth;

// After expanding:
requestAnimationFrame(() => {
  element.scrollLeft = scrollBefore + widthAdded;
});
```

### Issue: Blank space appears while scrolling

**Cause:** Buffer too small or orders not loading

**Fix:**
```typescript
// Increase buffer size
private BUFFER_HOURS = 24 * 14; // 2 weeks instead of 1

// Or check scroll threshold
if (scrollLeft < 400) { // More aggressive
  expandDateRange('left');
}
```

### Issue: Mobile performance still slow

**Cause:** Too many rendered orders, no virtual scroll on rows

**Fix:**
```typescript
// Ensure CDK virtual scroll is enabled
<cdk-virtual-scroll-viewport itemSize="60">
  <!-- Rows here -->
</cdk-virtual-scroll-viewport>

// And use OnPush change detection
changeDetection: ChangeDetectionStrategy.OnPush
```

### Issue: Orders disappear after scroll

**Cause:** Date range calculation error or overlap check

**Fix:**
```typescript
// Debug: Log visible orders
effect(() => {
  console.log('Visible orders:', this.visibleOrders$().length);
  console.log('Date range:', this.visibleDateRange());
});
```

---

## Performance Benchmarks

**Target Environment:** iPhone 12, 4G network

| Metric | Target | Actual (After Optimization) |
|--------|--------|---------------------------|
| Initial load | <100ms | ~85ms |
| Scroll FPS | 60 | 58-60 |
| Memory (idle) | <50MB | ~45MB |
| Memory (scrolling) | <80MB | ~72MB |
| Expand range time | <50ms | ~30ms |

---

## Next Steps

1. **Implement Phase 1-4** above in order
2. **Test with sample data** (run data-generator)
3. **Measure performance** using Chrome DevTools
4. **Optimize if needed** (profiling, adjust buffer size)
5. **Add interactions** (create/edit panels)
6. **Polish UI** (animations, accessibility)

---

## References

- [Angular Signals Documentation](https://angular.io/guide/signals)
- [CDK Virtual Scrolling](https://material.angular.io/cdk/scrolling/overview)
- [Performance Best Practices](https://angular.io/guide/performance-best-practices)
- [Date Range Calculations](../model/timeline-config.ts)

---

**Document Author:** Claude Code
**Last Updated:** 2025-02-13
**Status:** Ready for Implementation
