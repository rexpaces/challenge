This specification outlines the development of the `TimescaleDropdownComponent`, a custom UI element designed to provide a split-button style interface using Angular and `ng-select`.

---

## 🛠 Technical Stack

* **Framework:** Angular (Standalone Component)
* **Styling:** SCSS
* **Library:** `@ng-select/ng-select`
* **Font Family:** `CircularStd-Book`

---

## 📐 Component Architecture

The component will wrap `ng-select` to leverage its robust accessibility and keyboard navigation features, but it will use custom templates to achieve the "split-side" button design.

### 1. The Trigger Button (Split Design)

The "button" is essentially the `ng-select-container`. It is divided into two distinct zones:

| Side | Attribute | Specification |
| --- | --- | --- |
| **Left** | Label Zone | `width: 75px`, `background: #F1F3F8`, `border-radius: 5px 0 0 5px`. Contains "Timescale". |
| **Right** | Value Zone | `width: 71px`, `background: #FFFFFF`, `border-radius: 0 5px 5px 0`. Contains selected value + Icon. |

### 2. The Floating Dropdown (Panel)

* **Dimensions:** `200px` x `136px`.
* **Position:** `5px` below the button, left-aligned.
* **Shadows:** * Outer: `0 4.5px 5px -1px rgba(216, 220, 235, 1)`
* Middle: `0 2.5px 3px -1.5px rgba(200, 207, 233, 1)`
* Border-glow: `0 0 0 1px rgba(104, 113, 150, 0.1)`



---

## 💻 Implementation Guide

### Component Logic (`.ts`)

The component should manage an array of options and an `@Output` to emit selection changes.

```typescript
import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgSelectModule } from '@ng-select/ng-select';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-timescale-dropdown',
  standalone: true,
  imports: [CommonModule, NgSelectModule, FormsModule],
  templateUrl: './timescale-dropdown.component.html',
  styleUrls: ['./timescale-dropdown.component.scss']
})
export class TimescaleDropdownComponent {
  options = ['Hour', 'Day', 'Week', 'Month'];
  selectedTimescale = 'Month';

  @Output() changed = new EventEmitter<string>();

  onSelect(value: string) {
    this.changed.emit(value);
  }
}

```

### Layout Template (`.html`)

We will use the `ng-label-tmp` to create the split-side effect and `ng-option-tmp` for the list items.

```html
<ng-select 
  [items]="options" 
  [(ngModel)]="selectedTimescale" 
  [searchable]="false" 
  [clearable]="false"
  (change)="onSelect($event)"
  class="timescale-dropdown">
  
  <ng-template ng-label-tmp let-item="item">
    <div class="split-button">
      <div class="left-side">Timescale</div>
      <div class="right-side">
        <span class="value">{{item}}</span>
        <svg class="arrow" width="10" height="6" viewBox="0 0 10 6">
           <path d="M1 1L5 5L9 1" stroke="#687196" fill="none" />
        </svg>
      </div>
    </div>
  </ng-template>

  <ng-template ng-option-tmp let-item="item" let-index="index">
    <div class="option-item">{{item}}</div>
  </ng-template>

</ng-select>

```

### Styling (`.scss`)

To achieve the exact pixel-perfect design, we must override several default `ng-select` classes.

```scss
$primary-text: #687196;
$active-text: #3E40DB;
$bg-left: #F1F3F8;

::ng-select.timescale-dropdown {
  width: 146px; // 75px + 71px
  height: 25px;

  .ng-select-container {
    min-height: 25px;
    border: none;
    background: transparent;
    
    .ng-value-container {
      padding: 0;
    }
  }

  .split-button {
    display: flex;
    height: 25px;
    cursor: pointer;

    .left-side {
      width: 75px;
      background-color: $bg-left;
      border-radius: 5px 0 0 5px;
      display: flex;
      align-items: center;
      justify-content: center;
      
      // Typography
      color: $primary-text;
      font-size: 13px;
      font-weight: 400;
      line-height: 16px;
      font-family: 'CircularStd-Book', sans-serif;
    }

    .right-side {
      width: 71px;
      background-color: white;
      border-radius: 0 5px 5px 0;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid #E2E5F0; // Optional subtle border for visual separation
      border-left: none;

      .value {
        margin-right: 6.53px;
        font-size: 13px;
        color: $primary-text;
      }
    }
  }

  // Floating Panel
  .ng-dropdown-panel {
    width: 200px;
    margin-top: 5px;
    background: white;
    border: 1px solid $primary-text;
    border-radius: 5px;
    box-shadow: 0 0 0 1px rgba(104, 113, 150, 0.1), 
                0 2.5px 3px -1.5px rgba(200, 207, 233, 1), 
                0 4.5px 5px -1px rgba(216, 220, 235, 1);

    .ng-dropdown-panel-items {
      padding: 17px 0 17px 12px;

      .ng-option {
        height: 18px;
        padding: 0;
        margin-bottom: 10px;
        display: flex;
        align-items: center;
        
        &:last-child { margin-bottom: 0; }

        color: rgba(47, 48, 89, 1);
        font-family: 'CircularStd-Book';
        font-size: 14px;

        &.ng-option-selected {
          color: $active-text;
        }
        
        &.ng-option-marked {
          background-color: transparent; // Disable default hover bg
        }
      }
    }
  }
}

```

---

## 📝 Usage Notes

* **Font Assets:** Ensure that `CircularStd-Book` is correctly loaded in your global `styles.scss` or `index.html`.
* **Z-Index:** If this dropdown is used inside a header, ensure the `ng-dropdown-panel` has a `z-index` higher than the main content area.

Would you like me to generate a specific SVG path for the arrow icon to match your design exactly?
