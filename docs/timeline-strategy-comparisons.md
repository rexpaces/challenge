Strategy Options

  1️⃣ CDK Virtual Scrolling (Horizontal + Vertical)

  How it works:
  Work Center 1  [████ Order ████      ████ Order ████]
  Work Center 2  [        ████ Order ████              ]
  Work Center 3  [████ Order ████                      ]
                 └─ Only render visible portion ─┘

  Pros:
  - ✅ Native Angular (CDK)
  - ✅ Maintains DOM interactivity
  - ✅ Simple to implement
  - ✅ Works with click/hover events

  Cons:
  - ❌ Still renders many DOM nodes (performance hit at 10K+ orders)
  - ❌ Complex scroll position math
  - ❌ Difficult to handle dynamic column widths

  Best for: <1000 total work orders

  ---
  2️⃣ Time-indexed Virtualization (Recommended for your case)

  How it works:
  1. Calculate visible date range from scroll position
  2. Query only work orders in that range
  3. Prepend/append date columns and orders as user scrolls
  4. Maintain smooth scroll with padding elements

  Implementation approach:
  // Visible range: Jan 15 - Jan 22
  visibleDateRange: {
    start: new Date('2025-01-15'),
    end: new Date('2025-01-22')
  }

  // Query only orders in this range
  visibleOrders = workOrders.filter(o =>
    new Date(o.startDate) <= visibleRange.end &&
    new Date(o.endDate) >= visibleRange.start
  )

  // On scroll, expand range and prepend/append columns

  Pros:
  - ✅ Renders only necessary orders (thousands → dozens)
  - ✅ Smooth, predictable scrolling
  - ✅ Works great with huge datasets
  - ✅ Easy to implement with signals/reactive forms

  Cons:
  - ❌ Need to manage scroll position during prepend
  - ❌ Requires calculating pixel positions carefully
  - ⚠️  Jump when expanding visible range (if not buffered)

  Best for: Your use case (thousands of orders) ✅

  ---
  3️⃣ Hybrid: Canvas + Virtual DOM

  How it works:
  ┌─────────────────────────────┐
  │ Canvas Layer (static grid)   │ ← Drawn once, scrolls with transform
  ├─────────────────────────────┤
  │ Virtual DOM Layer (orders)   │ ← Only visible orders rendered
  └─────────────────────────────┘

  Pros:
  - ✅ Extremely performant (thousands of orders)
  - ✅ Canvas = fast rendering
  - ✅ Virtual DOM layer for interactivity

  Cons:
  - ❌ Complex implementation
  - ❌ Canvas doesn't support native events (need custom hit detection)
  - ❌ Harder to maintain

  Best for: 10K+ orders with maximum performance

  ---
  4️⃣ Scroll-driven Pagination (Simplest)

  How it works:
  Detect scroll approaching edges
  → Load next time chunk
  → Prepend/append columns
  → Adjust scroll position
  → Repeat

  Pros:
  - ✅ Simple to understand
  - ✅ Works well with Observables/Signals
  - ✅ Natural feel (like infinite scroll)

  Cons:
  - ❌ Scroll position jumps on prepend
  - ❌ Complex position math

  ---
  My Recommendation: Hybrid Approach

  Combine Time-indexed virtualization + CDK Virtual Scroll for rows:

  // 1. Virtual scroll for work centers (rows)
  <cdk-virtual-scroll-viewport itemSize="60" class="timeline-viewport">
    <div *cdkVirtualFor="let center of visibleCenters">
      <!-- 2. Time-indexed work orders for this center -->
      <timeline-row [center]="center" [visibleRange]="visibleDateRange$ | async">
    </div>
  </cdk-virtual-scroll-viewport>

  Data flow:
  1. User scrolls horizontally
     ↓
  2. Scroll event detected (debounced)
     ↓
  3. Calculate new visibleDateRange
     ↓
  4. Prepend/append date columns (CSS transforms, no DOM manipulation)
     ↓
  5. Filter workOrders in new range
     ↓
  6. Virtual scroll re-renders only visible centers
     ↓
  7. Only visible orders for visible centers are in DOM

  ---
  Performance Architecture

  // Service layer (responsible for data efficiency)
  @Injectable()
  export class TimelineService {
    private workOrders$ = signal<WorkOrderDocument[]>([]);
    private visibleRange$ = signal<DateRange>({...});

    // Derived signal: only orders in visible range
    visibleOrders$ = computed(() => {
      const orders = this.workOrders$();
      const range = this.visibleRange$();
      return orders.filter(o => this.isInRange(o, range));
    });

    // Optimize: Group by center for faster lookups
    ordersByCenter$ = computed(() => {
      const orders = this.visibleOrders$();
      return groupBy(orders, o => o.data.workCenterId);
    });
  }

  // Component uses OnPush change detection
  @Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    // ...
  })
  export class TimelineComponent {
    visibleOrders = toSignal(this.timeline.visibleOrders$);

    @HostListener('scroll', ['$event'])
    onScroll(event: Event) {
      // Debounced scroll handler
      this.updateVisibleRange();
    }
  }

  ---
  Key Implementation Details

  ┌──────────────────┬─────────────────────────────────────────┐
  │      Aspect      │                Strategy                 │
  ├──────────────────┼─────────────────────────────────────────┤
  │ Virtual Scroll   │ CDK for rows, time-based for columns    │
  ├──────────────────┼─────────────────────────────────────────┤
  │ Change Detection │ OnPush + Signals                        │
  ├──────────────────┼─────────────────────────────────────────┤
  │ Scroll Events    │ Debounce to ~100ms                      │
  ├──────────────────┼─────────────────────────────────────────┤
  │ Position Calc    │ Pre-compute pixel offsets for each date │
  ├──────────────────┼─────────────────────────────────────────┤
  │ Buffer           │ Render ±1 week beyond visible range     │
  ├──────────────────┼─────────────────────────────────────────┤
  │ TrackBy          │ Use docId to prevent re-renders         │
  ├──────────────────┼─────────────────────────────────────────┤
  │ State            │ Use Signals for reactive updates        │
  └──────────────────┴─────────────────────────────────────────┘

  ---
  Should I design this in detail now, or do you have other questions?

  I can create:
  1. Service architecture for managing visible date range
  2. Component structure for efficient rendering
  3. Scroll handler implementation with prepend/append logic
  4. Performance optimization checklist

  What would be most helpful?


   Strategy 1: CDK Virtual Scrolling (Index-based)                                                                                           
                 
  CDK virtualizes based on item indices in a list:                                                                                          
                                                                                                                                            
  // You have an array of ALL work orders
  workOrders = [order1, order2, order3, ..., order10000]

  // CDK figures out which indices are visible based on scroll position
  // CDK renders items at indices 150-200 (for example)
  // As you scroll, CDK updates which indices are visible

  <cdk-virtual-scroll-viewport>
    <div *cdkVirtualFor="let order of workOrders; trackBy: trackByFn">
      <!-- Renders only ~50 orders at a time -->
    </div>
  </cdk-virtual-scroll-viewport>

  CDK's logic:
  Viewport height: 600px
  Item height: 60px
  → Can show ~10 items
  Scroll position: 1000px down
  → Show items 150-160

  ---
  Strategy 2: Time-indexed Virtualization (Date-range-based)

  You manually manage what date range is visible:

  // Visible date range (YOU manage this)
  visibleRange = { start: Jan 15, end: Jan 22 }

  // Only orders in this range are in memory
  visibleOrders = workOrders.filter(o =>
    new Date(o.startDate) <= visibleRange.end &&
    new Date(o.endDate) >= visibleRange.start
  )

  // Render only these orders
  <div *ngFor="let order of visibleOrders; trackBy: trackByFn">
    <!-- Renders only ~30 orders in this date range -->
  </div>

  // On horizontal scroll, YOU update the range
  onScroll(scrollLeft) {
    if (scrollLeft < leftThreshold) {
      visibleRange.start = visibleRange.start.subtract(1, 'week')
      // Prepend columns
    }
  }

  ---
  Visual Difference

  CDK Virtual Scrolling (Strategy 1)

  All 10,000 work orders exist in data
          ↓
  CDK manages: "Which indices (0-10000) are visible?"
          ↓
  Renders indices 2500-2550 (for example)
          ↓
  As you scroll horizontally, CDK re-calculates indices
          ↓
  Problem: ALL 10,000 orders stay in memory
           Need to scroll through 10,000 items
           Works better for VERTICAL scrolling

  Time-indexed Virtualization (Strategy 2)

  All 10,000 work orders exist in database
          ↓
  YOU manage: "Which date range (Jan 15-22) is visible?"
          ↓
  Only ~50 orders in that range loaded into memory
          ↓
  As you scroll horizontally, YOU expand the date range
          ↓
  Benefit: Only visible date window in memory
           Natural for timeline/calendar UIs
           Works better for HORIZONTAL scrolling

  ---
  Key Differences

  ┌────────────────────────┬───────────────────────────┬───────────────────────────────┐
  │         Aspect         │    CDK Virtual Scroll     │  Time-indexed Virtualization  │
  ├────────────────────────┼───────────────────────────┼───────────────────────────────┤
  │ What you virtualize    │ List indices (0, 1, 2...) │ Date ranges (Jan 15-22)       │
  ├────────────────────────┼───────────────────────────┼───────────────────────────────┤
  │ Data structure         │ Linear array              │ Spatial (dates)               │
  ├────────────────────────┼───────────────────────────┼───────────────────────────────┤
  │ You manage visibility? │ No (CDK does it)          │ Yes (you do it)               │
  ├────────────────────────┼───────────────────────────┼───────────────────────────────┤
  │ Scroll direction       │ Vertical (naturally)      │ Horizontal (naturally)        │
  ├────────────────────────┼───────────────────────────┼───────────────────────────────┤
  │ Data in memory         │ All 10K items             │ Only visible window (~50-100) │
  ├────────────────────────┼───────────────────────────┼───────────────────────────────┤
  │ Expand visible range   │ Automatic (scroll)        │ Manual (prepend/append)       │
  ├────────────────────────┼───────────────────────────┼───────────────────────────────┤
  │ Add columns            │ Automatic                 │ You add columns as needed     │
  └────────────────────────┴───────────────────────────┴───────────────────────────────┘

  ---
  Concrete Example: Scrolling 10,000 work orders

  Using CDK Virtual Scrolling ❌

  // All 10,000 in memory at once
  const allOrders = workOrderService.getAll(); // 10K items

  // Scroll horizontally...
  // CDK tries to figure out: "which indices are visible?"
  // Problem: All 10K are in the DOM/state
  // Scroll is jittery because CDK recalculates indices constantly

  Using Time-indexed Virtualization ✅

  // Only orders in visible date window
  visibleRange$ = signal({ start: Jan 15, end: Jan 22 })
  visibleOrders$ = computed(() => {
    const orders = workOrderService.getAll();
    const range = visibleRange$();
    return orders.filter(o => isInRange(o, range)); // ~30 orders
  })

  // Scroll horizontally...
  // Update date range: Jan 15 → Jan 22 → Jan 29
  // Only relevant orders in DOM
  // Scroll is smooth because fewer items

  ---
  Which to use for your timeline?

  Use Strategy 2 (Time-indexed) because:

  1. ✅ Work orders are spatially indexed by date, not by list position
  2. ✅ Natural fit for timeline/calendar UI
  3. ✅ You already think in "date ranges" not "item indices"
  4. ✅ Horizontal scrolling is the main interaction
  5. ✅ Scales to 100K+ orders easily (only ~50 visible at a time)

  CDK works better for:
  - Vertical scrolling (inbox, list of comments)
  - Linear data (sorted by time, but rendering all at once)
  - When you want automatic virtualization

  ---
  Does this clarify the difference? CDK is automatic index-based, Time-indexed is manual date-based. For a timeline, manual control over the
   date window is more efficient
