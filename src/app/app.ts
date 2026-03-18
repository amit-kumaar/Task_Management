import { Component, signal } from '@angular/core';
import { TaskManagementComponent } from './task-management';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [TaskManagementComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('Task Management');
}
