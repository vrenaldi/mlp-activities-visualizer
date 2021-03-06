import { Component, OnInit, OnDestroy } from '@angular/core';
import { BreakpointObserver } from '@angular/cdk/layout';

import { Subject } from 'rxjs';
import { takeUntil } from "rxjs/operators";

import { DataService } from './services/data.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  toolbarHeight: number;

  files: File[];
  selectedFile: string;
  isRunning: boolean;

  vizOptions;

  unsubscribe: Subject<any> = new Subject();

  constructor(
    private breakpointObserver: BreakpointObserver,
    private dataService: DataService
  ) { }

  ngOnInit() {
    this.breakpointObserver.observe("(max-width: 600px)").pipe(takeUntil(this.unsubscribe))
      .subscribe(result => {
        if (result.matches) this.dataService.toolbarHeight.next(56);
        else this.dataService.toolbarHeight.next(64);
      });

    this.dataService.toolbarHeight.pipe(takeUntil(this.unsubscribe))
      .subscribe(toolbarHeight => { this.toolbarHeight = toolbarHeight; });

    this.files = [
      { value: "MLP[10,10].json", viewValue: "MLP[10, 10]" },
      { value: "MLP[20,15,10].json", viewValue: "MLP[20, 15, 10]" }
    ];
  }

  visualize() {
    this.isRunning = true;
    this.updateVizOptions();
  }

  stopViz() {
    this.isRunning = false;
    this.updateVizOptions();
  }

  updateVizOptions() {
    this.vizOptions = {
      selectedFile: this.selectedFile,
      isRunning: this.isRunning
    };
  }

  ngOnDestroy() {
    this.unsubscribe.next();
    this.unsubscribe.complete();
  }
}

interface File {
  value: string;
  viewValue: string;
}