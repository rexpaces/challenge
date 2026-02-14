# Timeline Grid Component Specification

**Status**: V1 - Basic Grid Structure (Layout & Styling Fixed)
**Last Updated**: 2026-02-14

## Overview

The Timeline Grid component is a two-panel layout for visualizing work centers and their schedules on a timeline. This V1 implementation provides the basic grid structure with month-level zoom, showing work centers on the left and an empty timeline grid on the right.

## Component Features

### Left Panel (Fixed)
- **Dimensions**: 382px width, min-height 749px
- **Content**: Vertical list of work centers
- **Scrolling**: Fixed horizontally, scrollable vertically only
- **Border**: 1px solid #E6EBF0

#### Header
- Text: "Work Center"
- Layout: Flexbox alignment (vertically centered)
- Styling:
  - Color: rgba(104, 113, 150, 1)
  - Font: CircularStd-Regular, 14px, weight 400
  - Line-height: 17px
  - Height: 32px
  - Padding-left: 31px
  - Border-bottom: 1px solid #E6EBF0

#### Work Center Rows
- **Height**: 48px (flexbox with vertical centering)
- **Padding-left**: 31px
- **Layout**: Flexbox with centered alignment
- **Text Styling**:
  - Color: rgba(3, 9, 41, 1)
  - Font: CircularStd-Regular, 14px, weight 400
  - Line-height: 17px
- **Borders**: 1px solid #E6EBF0 (top and bottom)
- **Background**: rgba(255, 255, 255, 1) (white)
- **Hover State**: Background color #F3F4FF (with smooth transition)
- **First Row**: Height 60px with extra top padding (28px) to align with header
- **Last Row**: Has bottom border

### Right Panel (Scrollable)
- **Content**: Date column headers and grid cells
- **Scrolling**: Horizontal scroll for infinite timeline
- **Background**: #F7F9FC (light gray for grid area)

#### Date Column Headers
- **Current Zoom**: Month level only (V1)
- **Date Format**: "Aug 2024", "Sep 2024", "Oct 2024", etc.
- **Column Width**: 120px (from TIMELINE_CONFIG for month zoom)
- **Height**: 32px
- **Layout**: Flexbox with centered alignment (horizontal & vertical)
- **Text Styling**:
  - Color: rgba(104, 113, 150, 1)
  - Font: CircularStd-Regular, 14px, weight 400
  - Line-height: 17px
  - Text alignment: center
- **Border**: 1px solid #E6EBF0 (bottom edge only)
- **Positioning**: Sticky header (z-index: 1000) that stays visible when scrolling vertically

#### Grid Cells
- **Height**: 48px (inherits from grid row)
- **Width**: 120px per column (flexible via CSS)
- **Borders**: 1px solid #E6EBF0 (right edge only)
- **Background**: #F7F9FC
- **Flex-shrink**: 0 (prevents column compression)

#### Grid Rows (Work Center Rows in Timeline)
- **Height**: 48px (flexbox layout)
- **Layout**: Flexbox with flex direction row
- **Background**: #F7F9FC (normal), #F3F4FF (hover)
- **Hover Behavior**: Row background changes with smooth transition
- **First Row**: Height 60px to align with header
- **Smooth Transitions**: All hover state changes use CSS transitions

### Overall Container
- **Background**: rgba(255, 255, 255, 1) (white)
- **Border**: 1px solid #E6EBF0 (outer container)
- **Layout**: Flexbox with height 100%
- **Left Panel**: Width 382px, flex-shrink 0 (fixed width)
- **Right Panel**: Flex 1 (fills remaining space), horizontal scroll enabled
- **Sizing**: Full height container with proper overflow handling

## Data Structure

### Work Centers
- Loaded from mock data (8 sample centers)
- Structure: `WorkCenterDocument`
  - `docId`: string (e.g., "wc-1")
  - `docType`: "workCenter"
  - `data.name`: string (e.g., "Assembly Line A")

### Visible Date Range
- **Default**: Loaded range is 12 months before to 12 months after today (24-month buffer)
- **Initial Scroll Position**: Today is the second visible month (previous month + current month visible)
- **Calculation**: Based on TIMELINE_CONFIG (month zoom level)
- **Format**: ISO 8601 datetime
- **User can expand**: Left/right edge detection triggers 3-month expansion
- **Smooth Scrolling**: Very large buffer allows smooth scroll in both directions with no lag when scrolling to past

## Implementation Details

### Component: `TimelineGridComponent`
- **Standalone**: Yes (Angular standalone component)
- **Change Detection**: OnPush (for performance)
- **State Management**: Angular signals (`signal`, `computed`)

### Key Signals
- `workCenterList`: Array of WorkCenterDocument (read-only)
- `visibleDateRange`: Object with start/end Date
- `visibleDates`: Computed array of Date objects for visible months
- `columnWidth`: Computed width in pixels (120 for month zoom)

### Methods
- `initializeVisibleRange()`: Sets initial 6-month window centered on today
- `loadWorkCenters()`: Loads mock work center data
- `onHorizontalScroll()`: Detects when scrolling near edges and expands date range
- `expandDateRange(direction)`: Expands visible range left or right by 3 months
- `formatDateHeader(date)`: Formats date as "Aug 2024" style
- `trackByCenter()`: TrackBy function for *ngFor (uses docId)
- `trackByDate()`: TrackBy function for *ngFor (uses timestamp)

## Infinite Scroll Behavior

### Scroll Detection
- Debounced on scroll events (100ms delay)
- Triggers when user scrolls within 200px of left/right edge

### Date Range Expansion
- **Left edge**: Expands start date 3 months earlier
- **Right edge**: Expands end date 3 months later
- **Result**: New date columns automatically prepend/append

## Styling Notes

### Layout Architecture
- **Container**: Flexbox layout (left panel fixed width, right panel flexible)
- **Left Panel**: Column layout with fixed width (382px), scrollable content
- **Right Panel**: Horizontal scroll container with flexbox rows
- **Alignment**: All text uses flexbox centering instead of padding-based alignment for consistency
- **Column Width**: Enforced via `flex-shrink: 0` on grid cells to maintain 120px width during scroll
- **First Row**: Special 60px height to align with header area

### Visual Effects
- Hover effects apply smooth transitions across entire rows (left + right panels)
- Header stays sticky during vertical scroll (position: sticky, z-index: 1000)
- Font family: CircularStd-Regular with system font fallback
- All height values are fixed (no min-height constraints) for predictable layout

### Fixed Issues
- **Text Vertical Alignment**: Changed from padding-based to flexbox centering for precise alignment
- **Column Width Stability**: Added `flex-shrink: 0` to prevent column compression during scroll
- **Header Consistency**: Unified 32px header height with proper centering
- **Border Alignment**: Removed unnecessary borders for cleaner grid appearance
- **First Row Spacing**: Added special handling to account for header height alignment

## Future Iterations

V2 and beyond will add:
- [ ] Work order rendering
- [ ] Additional zoom levels (hour, day, week)
- [ ] Scroll position adjustment for seamless infinite scroll
- [ ] CDK Virtual Scroll for performance (if needed)
- [ ] Work order interactions (click, drag, edit)
- [ ] Proper data service integration (replace mock data)
- [ ] Responsive design for mobile
- [ ] Accessibility improvements (ARIA labels, keyboard navigation)

## Notes

- This is a basic grid structure with no work orders rendered yet
- All styling matches design specifications exactly
- Component is compatible with TIMELINE_STRATEGY_2.md architecture
- Mock data is hardcoded; future versions will integrate with TimelineService
