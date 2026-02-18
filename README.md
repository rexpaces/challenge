# Timeline Scheduler Challenge

This project is a high-performance timeline/grid scheduling application built with the latest version of **Angular**. It focuses on rendering realistic work centers and orders efficiently across a time-based axis.


---

## 📝 Summary

This challenge was an opportunity to dive deep into the latest Angular features. A significant portion of the development time was dedicated to the **Timeline Grid**. After three iterations, the final version strikes a balance between **clean code** and **high-performance rendering**. 

The current solution is flexible: although full horizontal infinite scroll is pending, users can traverse any date range by switching timescales, which recomputes the grid based on the visible date range.


---

## 📂 Project Structure

The repository is organized as follows:

* **`/` (Root):** The main Angular workspace and application.
* **`/src`:** The Angular codebase, featuring the timeline grid logic.
* **`/public`:** Contains two JSON data samples used for initial state.
* **`/data-generator`:** A Node.js CLI tool built to generate realistic work center and order datasets using **Ollama**.

---

## 🛠 Development Process & History

This project evolved through several architectural iterations to balance performance with maintainability:

1.  **Data Strategy:** Reviewed data structures and built a custom generator to create varied datasets for stress testing.
2.  **Architectural Research:** Investigated grid rendering strategies for large datasets and infinite loading.
3.  **Iteration 1:** Used `CDK Virtual Scroll` for vertical work centers and a custom `*ngFor` horizontal scroll. The UI was split into two separate panels (Left/Right).
4.  **Iteration 2 (Optimization):** Merged the two-panel system into a single `CDK Virtual Scroll` to reduce the number of `*ngFor` directives and improve synchronization.
5.  **Iteration 3 (CSS Grid):** Replaced manual data grid cell rendering with a **CSS Grid** approach to significantly reduce the DOM node count.
6.  **Final POC:** Refactored the timeline grid into a simplified, date-range-driven component. While horizontal infinite scroll was temporarily removed for complexity, the current architecture supports easy re-implementation via `timeUnits` computation.

---

## 🚀 Performance & Technical Highlights

* **Change Detection:** Uses `OnPush` strategy across the board.
* **Rendering:** Optimized with `trackBy` functions.
* **Stress Testing:** Maintains smooth performance even with a **20x CPU slowdown** and thousands of DOM nodes.
* **AI Collaboration:** Leveraged **Claude Code** for POC generation and boilerplate, with manual refactoring for complex logic and the final timeline architecture.

---

## ✅ Features & Status

### Core Functionality (Done)
* **Timeline Grid:** High-performance rendering of work centers and time-based orders.
* **Order Management:** * Work order bar components.
    * Reactive forms for order creation with custom validations.
    * Full integration of creation/update logic with the grid.
* **Visual Aids:** Current date markers and time-line indicators.
* **Testing:** Unit tests for main components and validators.

### Bonus Points
| Feature | Status | Notes |
| :--- | :--- | :--- |
| **Unit Tests** | ✅ Done | Main components and validators covered. |
| **Performance** | ✅ Done | Optimized for low-end hardware. |
| **Tooltips** | ✅ Done  | On bar hover |
| **Infinite Scroll** | ⚠️ Partial | Vertical is functional; horizontal is date-traversable. | easy to implement in the next iteration
| **Keyboard Nav** | ❌ Not Done | Planned for future release. |
| **"Today" Button** | ❌ Not Done | - |

| **Local Storage** | ❌ Not Done | Persistence not yet implemented. |
