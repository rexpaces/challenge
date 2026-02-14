import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TimelineGridComponent } from './components/timeline-grid/timeline-grid.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, TimelineGridComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('work-order');
}
