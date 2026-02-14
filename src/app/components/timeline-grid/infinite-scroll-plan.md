# Timeline Grid Infinite Scroll Architecture Plan

**Status**: Design Phase
**Date**: 2026-02-14
**Approach**: Hybrid Strategy (CDK Virtual Scroll + Time-indexed Virtualization)

---

## Overview

The timeline grid requires virtualization in two independent dimensions:
- **Vertical (Left Panel)**: Work center list - large dataset, needs DOM virtualization
- **Horizontal (Right Panel)**: Date columns - time-indexed, needs range-based virtualization

To balance **performance**, **maintainability**, and **architectural fit**, we use:
- **Left Panel**: CDK Virtual Scrolling (proven, simple, performant)
- **Right Panel**: Strategy 2 Time-indexed Virtualization (natural fit for timeline)
- **Synchronization**: Shared `visibleWorkCenterRange` signal between panels

---

## Architecture Overview

```
TimelineDataService
├── Work Center Management
│   ├── allWorkCenters (cached, paginated)
│   ├── visibleWorkCenterRange (shared signal)
│   └── loadWorkCenterPage(startIndex)
│
├── Date Range Management
│   ├── visibleDateRange (time-indexed)
│   └── updateVisibleDateRange(range)
│
└── Work Order Management
    ├── workOrderCache (indexed by centerId)
    └── loadWorkOrders(centerIds, dateRange)

TimelineGridComponent
├── Left Panel (CDK Virtual Scroll)
│   ├── onLeftPanelScrolledIndexChange()
│   └── Renders: cdk-virtual-scroll-viewport
│
├── Right Panel (Strategy 2)
│   ├── onRightPanelHorizontalScroll()
│   └── Renders: Date headers + Grid rows
│
└── Auto-fetch Effect
    └── Triggered by: visibleWorkCenters + visibleDateRange changes
```

---

## Left Panel: CDK Virtual Scrolling Strategy

### How It Works

CDK Virtual Scroll virtualizes the work center list by:
1. Managing viewport size and scroll position
2. Only rendering visible items + small buffer (30-40 items max)
3. Automatically pre-loading next/previous items
4. Reusing DOM nodes as user scrolls

### Configuration

```typescript
// Constants
itemSize = 48; // Work center row height (pixels)
itemBuffer = 5; // Buffer items above/below viewport

// Computed
visibleCount = Math.ceil(viewportHeight / itemSize) + (itemBuffer * 2)
// Result: ~30-40 DOM nodes at any time
```

### Data Flow

```
User scrolls down
        ↓
CDK detects scroll
        ↓
onLeftPanelScrolledIndexChange() fires
        ↓
Calculate: scrollTop, viewportHeight, itemSize
        ↓
Call: dataService.onLeftPanelScroll(scrollTop, viewportHeight, itemSize)
        ↓
Service updates: visibleWorkCenterRange signal
        ↓
Component's visibleWorkCenters computed re-evaluates
        ↓
Service pre-fetches next page if needed
        ↓
Right panel automatically updates (same visibleWorkCenters)
```

### Benefits

✅ Constant DOM size (30-40 nodes, regardless of total dataset)
✅ Smooth scrolling performance
✅ Automatic node reuse
✅ Built-in scroll position management
✅ Pre-fetching handled by service

---

## Right Panel: Strategy 2 Time-Indexed Virtualization

### How It Works

Instead of virtualizing by DOM position, virtualize by TIME/DATE:
1. User scrolls horizontally through timeline
2. Detect when scrolling near left/right edges
3. Expand visible date range (add 3 months)
4. New date columns are automatically rendered
5. Render ALL visible work orders in the visible date range

### Configuration

```typescript
// Loaded range (very large buffer for smooth scrolling)
visibleDateRange = {
  start: today - 12 months,
  end: today + 12 months
}
// Result: 24 date columns loaded (12 months history + 12 months future)

// Initial scroll position
scrollPosition = (monthsFromStart - 1) * columnWidth
// Result: Today is the second visible month
// User sees: [previous month, current month, next months...]
```

// On edge scroll
expandDateRange(direction): Add 3 more months
// Result: Range expands to 15 columns

// Expansion threshold
scrollLeft < 200px → expand left
scrollLeft > (scrollWidth - clientWidth - 200px) → expand right
```

### Data Flow

```
User scrolls right (horizontal)
        ↓
onRightPanelHorizontalScroll() detects position
        ↓
Check: scrollLeft near right edge?
        ↓
YES → expandDateRange('right')
        ↓
Service updates: visibleDateRange signal
        ↓
Component's visibleDates computed re-evaluates
        ↓
Grid automatically renders new date columns
        ↓
Auto-fetch effect triggers:
  - Get visible center IDs
  - Fetch work orders for new date range
```

### Why Strategy 2 for Timeline?

✅ Work orders are **spatially indexed by date** (natural grouping)
✅ Think in "date ranges" not "list positions"
✅ Horizontal scrolling is primary interaction
✅ Work orders are **sparse** (~50 visible at a time)
✅ Scales to 100K+ orders (only visible ones in DOM)
✅ More intuitive for calendar/timeline UX

---

## Synchronization Strategy

### Vertical Synchronization (LEFT & RIGHT panels)

Both panels are linked vertically:

```
Left Panel Row Index        Right Panel Row Index
(CDK managed)               (Same visible centers)
    ↓                              ↓
    └──→ visibleWorkCenterRange ←──┘
         (shared signal)

When left panel scrolls → visibleWorkCenterRange updates
                      → Right panel rows automatically update
```

**Key Principle**: Both panels render the SAME work centers at the SAME scroll position.

### Horizontal Independence (RIGHT panel only)

Horizontal scroll only affects date range (left panel unaffected):

```
Right Panel Horizontal Scroll
            ↓
    onRightPanelHorizontalScroll()
            ↓
    visibleDateRange updates
            ↓
    Grid columns expand/contract
            ↓
    (Left panel unchanged)
```

---

## Data Service Architecture

### Signal Hierarchy

```typescript
// Input signals (user interactions)
visibleWorkCenterRange  // From left panel scroll
visibleDateRange        // From right panel scroll (12 months before + 12 months after)

// Derived computed signals
visibleWorkCenters = computed(() => {
  return allWorkCenters.slice(startIndex, startIndex + count)
})

visibleDates = computed(() => {
  // Generate array of months between start and end (24 months total)
})

// Initial scroll position
scrollToPosition = (monthsFromStart - 1) * columnWidth
// Result: User sees previous month + current month + future months
// Today is positioned as the second visible month

// On-demand cached data
allWorkCenters[]        // Paginated, grows as user scrolls
workOrderCache Map      // Indexed by centerId, keyed by date range
```

### Data Loading Strategy

**Work Centers**:
```
1. User scrolls to position X
2. Calculate needed page: (X / pageSize)
3. Check if page cached
4. If not cached: fetch page
5. Store in allWorkCenters
6. visibleWorkCenters automatically returns slice
```

**Work Orders**:
```
1. visibleWorkCenters signal changes
2. visibleDateRange signal changes
3. Effect detects both changes
4. Extract centerIds from visibleWorkCenters
5. Fetch orders for centers + date range
6. Cache in workOrderCache (indexed by centerId)
7. Template renders orders from cache
```

### Pre-fetching

```typescript
// When approaching end of loaded data
if (scrollPosition + buffer > cachedData.length) {
  loadNextPage()  // Fetch before user reaches bottom
}

// Result: Seamless scrolling, no loading pauses
```

---

## Template Structure

### Left Panel (CDK Virtual Scroll)

```html
<cdk-virtual-scroll-viewport
  #leftVirtualScroll
  [itemSize]="48"
  [minBufferPx]="240"      <!-- 5 items × 48px -->
  [maxBufferPx]="480"      <!-- 10 items × 48px -->
  class="left-panel"
  (scrolledIndexChange)="onLeftPanelScrolledIndexChange($event)">

  <div class="left-panel-header">Work Center</div>

  <div *cdkVirtualFor="let center of workCenterCache()"
       class="work-center-row">
    {{ center.data.name }}
  </div>
</cdk-virtual-scroll-viewport>
```

### Right Panel (Strategy 2)

```html
<div class="right-panel"
     #rightPanel
     (scroll)="onRightPanelHorizontalScroll($event)">

  <!-- Date Headers (expand/contract based on visibleDateRange) -->
  <div class="header-container">
    <div *ngFor="let date of visibleDates()"
         class="date-column-header">
      {{ formatDateHeader(date) }}
    </div>
  </div>

  <!-- Grid Rows (from CDK-managed visibleWorkCenters) -->
  <div class="grid-content">
    <div *ngFor="let center of visibleWorkCenters()"
         class="grid-row">

      <!-- Grid Cells (columns from Strategy 2 visibleDates) -->
      <div *ngFor="let date of visibleDates()"
           class="grid-cell">

        <!-- Work orders (rendered sparsely) -->
        <div *ngFor="let order of getOrdersForCenter(center.docId)"
             class="work-order">
          {{ order.data.name }}
        </div>
      </div>
    </div>
  </div>
</div>
```

---

## Performance Characteristics

### Left Panel (CDK Virtual Scroll)

```
Dataset Size: 10,000 work centers
Viewport: 600px height (12-13 rows visible)
Buffer: 5 items above/below

DOM Nodes at any time: ~30-40 rows
Re-renders per scroll event: Only visible items
Memory footprint: Minimal
Scroll smoothness: Excellent
```

### Right Panel (Strategy 2)

```
Dataset Size: 100,000+ work orders
Loaded date range: 12 months before + 12 months after today (24 months total)
Initial scroll position: Today is second visible month (previous + current visible)
Visible work orders: ~50 (sparse distribution)

Initial DOM Nodes: ~30-40 rows × 24 columns = 720-960 cells (+ sparse orders)
User sees: Previous month, current month, and months ahead
Scroll smoothness: Smooth in both directions - no lag when scrolling to past
Expansion: Only needed after user scrolls through 12-month buffer in either direction
Memory footprint: Stable, minimal growth until buffer exhausted (takes longer to exhaust)
```

### Combined (Both Panels)

```
Total DOM nodes: ~400-500
Change detection: Only visible items
Event debouncing:
  - Vertical scroll: 100ms debounce (pre-fetch)
  - Horizontal scroll: 100ms debounce (expand range)
Network requests:
  - Work centers: On-demand pagination (20-50 items)
  - Work orders: Batched by visible range
Caching: Persistent in-memory service signals
```

---

## Implementation Phases

### Phase 1: Foundation
- [ ] Implement TimelineDataService with signal-based state
- [ ] Implement work center pagination and caching
- [ ] Add CDK Virtual Scroll to left panel
- [ ] Implement left panel scroll handler

### Phase 2: Right Panel Integration
- [ ] Implement Strategy 2 date range expansion
- [ ] Implement right panel horizontal scroll handler
- [ ] Add work order fetching logic
- [ ] Implement auto-fetch effect for work orders

### Phase 3: Synchronization & Refinement
- [ ] Test vertical synchronization between panels
- [ ] Test horizontal scroll independence
- [ ] Add loading indicators
- [ ] Add error handling
- [ ] Performance testing with large datasets

### Phase 4: Polish & Optimization
- [ ] Scroll position persistence
- [ ] Prefetching optimization
- [ ] Animation transitions
- [ ] Accessibility improvements

---

## Key Implementation Details

### Shared Scroll State

```typescript
// Service manages this single source of truth
private visibleWorkCenterRange = signal({ startIndex: 0, count: 20 });

// Both panels use this computed
visibleWorkCenters = computed(() => {
  const all = this.allWorkCenters();
  const range = this.visibleWorkCenterRange();
  return all.slice(range.startIndex, range.startIndex + range.count);
});
```

### Auto-fetch Trigger

```typescript
effect(() => {
  const centers = this.visibleWorkCenters();
  const dateRange = this.visibleDateRange();
  const centerIds = centers.map(c => c.docId);

  // Automatically fetches when EITHER signal changes
  if (centerIds.length > 0) {
    this.dataService.loadWorkOrders(centerIds, dateRange);
  }
});
```

### Debouncing

```typescript
// Separate debounce timers for each scroll direction
private verticalScrollTimeout: any;
private horizontalScrollTimeout: any;

// Prevents excessive service calls during fast scrolling
clearTimeout(this.verticalScrollTimeout);
this.verticalScrollTimeout = setTimeout(() => {
  // Update service
}, 100);
```

---

## Testing Strategy

### Unit Tests
- [ ] Service: Work center pagination logic
- [ ] Service: Work order caching logic
- [ ] Component: Scroll handler calculations
- [ ] Component: TrackBy functions

### Integration Tests
- [ ] Left panel scroll → visibleWorkCenterRange updates
- [ ] Right panel scroll → visibleDateRange updates
- [ ] Both panels stay synchronized
- [ ] Work orders fetched for visible range

### Performance Tests
- [ ] 10,000 work centers: Scroll smoothness
- [ ] 100,000 work orders: Sparse rendering
- [ ] Network: Pagination requests don't overlap
- [ ] Memory: No memory leaks on extended scrolling

---

## Edge Cases & Considerations

### Empty Datasets
- Handle when no work centers exist
- Handle when no work orders for date range
- Show appropriate loading/empty states

### Rapid Scrolling
- Debounce prevents excessive API calls
- Buffer ensures items ready before visible
- Pre-fetch prevents flashing gaps

### Scroll Position Restoration
- If component destroyed/recreated, preserve scroll position
- Restore work center index and date range
- Reload work orders from cache if available

### Network Failures
- Retry failed work order fetches
- Cache successful responses
- Show error state in grid

---

## Future Enhancements

- [ ] Virtual scrolling for horizontal (CDK Virtual Scroll for columns)
- [ ] Infinite scroll in both directions simultaneously
- [ ] Scroll position persistence to localStorage
- [ ] Optimistic scroll position updates (don't wait for data)
- [ ] Work order drag-and-drop between cells
- [ ] Keyboard navigation and shortcuts
- [ ] Accessibility: Screen reader support, ARIA labels

---

## References

- CDK Virtual Scroll: https://material.angular.io/cdk/scrolling/overview
- Strategy 2 (Timeline Config): See timeline-config.ts
- Component Spec: See timeline-grid.md
