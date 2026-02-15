This is a clean, structured layout specification. To achieve the "render different child content" requirement in Angular, **Content Projection** (`<ng-content>`) is indeed the most efficient and standard approach.

Below is the organized technical specification for your component.

---

# Technical Specification: `PageLayoutComponent`

## 1. Overview

The `PageLayoutComponent` is a **standalone Angular component** designed to provide a consistent structural wrapper for various pages. It handles fixed dimensions, specific typography for page titles, and uses content projection to inject feature-specific UI.

## 2. Component Configuration

* **Type:** Standalone Component
* **Selector:** `app-page-layout`
* **Encapsulation:** Scoped (Default)
* **Projection Strategy:** Single-slot `ng-content`

## 3. Visual Layout & Dimensions

| Element | Property | Value |
| --- | --- | --- |
| **Global Background** | `background-color` | `rgba(255, 255, 255, 1)` |
| **Page Padding** | `padding-left` | `101px` |
| **Header Height** | `height` | `50px` |
| **Header Padding** | `padding` | `20px 0 20px 101px` |
| **Title Top Margin** | `margin-top` | `45px` (Space from header) |
| **Content Gap** | `margin-top` | `24px` (Space below title) |

---

## 4. Typography: Page Title

The title "Work Orders:" is a primary UI element. Note that while the design specifies a font-style of "medium," in CSS this is typically handled via `font-weight: 500`.

* **Color:** `rgba(3, 9, 41, 1)`
* **Font Family:** `CircularStd-Medium, sans-serif`
* **Font Size:** `24px`
* **Font Weight:** `500`
* **Line Height:** `34px`
* **Element Height:** `34px`

---

## 5. Implementation Guide

### Component Structure (`page-layout.component.ts`)

The component should accept a `title` input to remain dynamic across different pages.

```typescript
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-page-layout',
  standalone: true,
  template: `
    <div class="page-wrapper">
      <header class="page-header">
        </header>
      
      <main class="page-container">
        <h1 class="page-title">{{ title }}</h1>
        
        <div class="content-projection-area">
          <ng-content></ng-content>
        </div>
      </main>
    </div>
  `,
  styleUrls: ['./page-layout.component.scss']
})
export class PageLayoutComponent {
  @Input() title: string = 'Work Orders:';
}

```

### Styling Logic (`page-layout.component.scss`)

```scss
:host {
  display: block;
  min-height: 100vh;
  background-color: rgba(255, 255, 255, 1);
}

.page-header {
  width: 100%;
  height: 50px;
  padding: 20px 0 20px 101px;
  box-sizing: border-box; /* Ensures padding doesn't add to height */
}

.page-container {
  padding-left: 101px;
}

.page-title {
  margin-top: 45px;
  height: 34px;
  color: rgba(3, 9, 41, 1);
  font-family: 'CircularStd-Medium', sans-serif;
  font-size: 24px;
  font-weight: 500;
  line-height: 34px;
}

.content-projection-area {
  margin-top: 24px;
  display: block;
}

```

---

## 6. Usage Example

To use this component in a feature module, simply wrap your specific page content within the tags:

```html
<app-page-layout title="Work Orders:">
  <app-work-order-table></app-work-order-table>
</app-page-layout>

```

Would you like me to refine the CSS to include a CSS Grid or Flexbox approach for handling the "filling up available space" requirement for the projected content?
