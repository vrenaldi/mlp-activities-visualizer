import { Component, OnInit, Input, OnChanges } from '@angular/core';
import { DataService } from '../services/data.service';

import * as d3 from "d3";

@Component({
  selector: 'app-visualizer',
  templateUrl: './visualizer.component.html',
  styleUrls: ['./visualizer.component.scss']
})
export class VisualizerComponent implements OnInit, OnChanges {
  @Input() selectedFile: string;
  @Input() runVisualization: boolean;

  constructor(private dataService: DataService) { }

  ngOnInit() { }

  ngOnChanges() {
    if (this.runVisualization) this.visualize();
  }

  visualize() {
    this.dataService.getTrainingResult(this.selectedFile);
  }
}
