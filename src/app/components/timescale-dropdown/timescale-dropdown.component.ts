import { Component, EventEmitter, Output, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgSelectModule } from '@ng-select/ng-select';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-timescale-dropdown',
  standalone: true,
  imports: [CommonModule, NgSelectModule, FormsModule],
  templateUrl: './timescale-dropdown.component.html',
  styleUrls: ['./timescale-dropdown.component.scss'],
  // encapsulation: ViewEncapsulation.None is often needed to style ng-select internals
  encapsulation: ViewEncapsulation.None
})
export class TimescaleDropdownComponent {
  @Output() selectionChange = new EventEmitter<string>();

  options = ['Hour', 'Day', 'Week', 'Month'];
  selectedTimescale = 'Month';

  onChange(value: string) {
    this.selectionChange.emit(value);
  }
}
