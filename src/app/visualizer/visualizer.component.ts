import { Component, OnInit, Input, OnChanges, ViewChild, AfterViewInit, HostListener, Output, EventEmitter } from '@angular/core';
import { DataService } from '../services/data.service';

import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import * as d3 from "d3";

@Component({
  selector: 'app-visualizer',
  templateUrl: './visualizer.component.html',
  styleUrls: ['./visualizer.component.scss']
})
export class VisualizerComponent implements OnChanges, OnInit, AfterViewInit {
  currEpoch: string;
  toolbarHeight: number;
  unsubscribe: Subject<any> = new Subject();

  svg; svgWidth; svgHeight;
  layerSpacing; nodeRadius;
  minMaxDiffs; activities;
  topology;

  @ViewChild("container") container;
  @Input() selectedFile: string;
  @Input() runVisualization: boolean;
  @Output() endofVisualization: EventEmitter<boolean>;

  @HostListener('window:resize', ['$event'])
  onResize(event) {
    this.svgWidth = window.innerWidth / 1.5;
    this.svgHeight = window.innerHeight / 1.5;
    this.redraw();
  }

  constructor(private dataService: DataService) {
    this.endofVisualization = new EventEmitter<boolean>();
  }

  ngOnChanges() {
    if (this.runVisualization) this.visualize();
  }

  ngOnInit() {
    this.dataService.toolbarHeight.pipe(takeUntil(this.unsubscribe))
      .subscribe(toolbarHeight => { this.toolbarHeight = toolbarHeight; });

    this.svgWidth = window.innerWidth / 1.5;
    this.svgHeight = window.innerHeight / 1.5;
    this.nodeRadius = 10;

    this.activities = [];
  }

  ngAfterViewInit() {
    this.svg = d3.select(this.container.nativeElement)
      .append('svg')
      .attr('width', window.innerWidth / 1.5)
      .attr('height', window.innerHeight / 1.5);
  }

  visualize() {
    this.dataService.getTrainingResults(this.selectedFile).pipe(takeUntil(this.unsubscribe))
      .subscribe(trainingResults => {
        this.setupTopology(this.selectedFile);
        this.bindTopology(this.topology);

        this.setupWeights(trainingResults);
      });
  }

  setupTopology(selectedFile: string) {
    let layers: number[] = this.selectedFile.substring(4, this.selectedFile.length - 6)
      .replace(/ +/g, "")
      .split(",")
      .map(layer => +layer);
    const filteredData = [];

    layers.forEach((layer, layerIndex) => {
      for (let i = 0; i < layer; i++) {
        filteredData.push({ layer: layerIndex, unit: i, unitSpacing: (this.svgHeight / layer) });
      }
    });
    for (let i = 0; i < 10; i++) {
      filteredData.push({ layer: layers.length, unit: i, unitSpacing: (this.svgHeight / 10) });
    }

    this.layerSpacing = (this.svgWidth / (layers.length + 1));
    this.topology = filteredData;
  }

  bindTopology(filteredData) {
    const circles = this.svg.selectAll('circle')
      .data(filteredData);

    const self = this;
    const enterSel = circles.enter()
      .append("circle")
      .attr('class', 'circle')
      .attr('cx', function (d, i) {
        const cx: number = (self.layerSpacing * d.layer) + (self.layerSpacing / 2);
        return cx;
      })
      .attr('cy', function (d, i) {
        const cy: number = (d.unitSpacing * d.unit) + (d.unitSpacing / 2);
        return cy;
      })
      .attr('r', this.nodeRadius)
      .attr('fill', function (d) { return self.generateColor(d, "topology"); });

    circles
      .merge(enterSel)
      .transition()
      .duration(250)
      .attr('r', this.nodeRadius)
      .attr('fill', function (d) { return self.generateColor(d, "topology"); });

    const exitSel = circles.exit()
      .transition()
      .duration(250)
      .attr('r', 0)
      .remove();
  }

  setupWeights(trainingResults) {
    let prevFilteredData;
    const filteredData = [];
    this.minMaxDiffs = [];

    Object.keys(trainingResults).forEach((epoch, epochIndex) => {
      if (epoch == "epoch_0") prevFilteredData = undefined;

      setTimeout(() => {
        this.currEpoch = epoch;
        Object.keys(trainingResults[epoch]).forEach((layer, layerIndex) => {
          if (layer != "input" && layer != 'output') {
            this.minMaxDiffs.push({ minDiff: 0, maxDiff: 0 });

            trainingResults[epoch][layer].forEach((destination, destinationIndex) => {
              destination.forEach((source, sourceIndex) => {
                let diff: number;

                if (prevFilteredData && epoch != "epoch_0") {
                  for (let i = 0; i < prevFilteredData.length; i++) {
                    if (prevFilteredData[i].layer == (layerIndex - 1) && prevFilteredData[i].target == destinationIndex && prevFilteredData[i].source == sourceIndex) {
                      diff = Math.abs(source - prevFilteredData[i].value);
                      this.updateWeightsDifferences((layerIndex - 1), sourceIndex, diff);
                      break;
                    }
                  }
                }

                filteredData.push({
                  layer: (layerIndex - 1),
                  source: sourceIndex,
                  target: destinationIndex,
                  value: source,
                  diff: diff,
                  unitSpacing: (this.svgHeight / +destination.length),
                  targetUnitSpacing: (this.svgHeight / +trainingResults[epoch][layer].length)
                });

              });
            });

          }
        });

        if (epoch != "epoch_0") prevFilteredData = filteredData;
        this.activities = [];

        this.bindWeights(filteredData);
        this.bindTopology(this.topology);

        if (epoch == "epoch_49") this.endofVisualization.emit(true);
      }, 1500 * epochIndex);

    });
  }

  bindWeights(filteredData) {
    const line = this.svg.selectAll('line')
      .data(filteredData);

    const self = this;
    const enterSel = line.enter()
      .append('line')
      .attr('class', 'line')
      .attr('x1', function (d, i) {
        const x1: number = (self.layerSpacing * d.layer) + (self.layerSpacing / 2);
        return x1;
      })
      .attr('y1', function (d, i) {
        const y1: number = (d.unitSpacing * d.source) + (d.unitSpacing / 2);
        return y1;
      })
      .attr('x2', function (d, i) {
        const x1: number = (self.layerSpacing * (d.layer + 1)) + (self.layerSpacing / 2);
        return x1;
      })
      .attr('y2', function (d, i) {
        const y1: number = (d.targetUnitSpacing * d.target) + (d.targetUnitSpacing / 2);
        return y1;
      })
      .attr('stroke', function (d) { return self.generateColor(d, "weights");; });

    line
      .merge(enterSel)
      .transition()
      .duration(250)
      .attr('stroke', function (d) { return self.generateColor(d, "weights");; });

    const exitSel = line.exit()
      .transition()
      .duration(250)
      .attr('style', function (d) { return 'stroke:#fff; stroke-width:0'; })
      .remove();
  }

  generateColor(d, mode: string): string {
    let color = "#EEEEEE";
    let activity = 0;
    let recordActivities = false;

    if (mode == "weights") {
      let range = Math.abs(this.minMaxDiffs[d.layer].maxDiff - this.minMaxDiffs[d.layer].minDiff);
      let diffPercentage = d.diff / range;

      if (diffPercentage > .9) {
        color = "#E57373";
        activity = 1;
        recordActivities = true;
      }
      else if (diffPercentage > .6) {
        color = "#FFCDD2";
        activity = 0.5;
        recordActivities = true;
      }

      if (recordActivities) {
        this.activities.push({
          layer: d.layer,
          source: d.source,
          target: d.target,
          activity: activity
        });
      }
    }

    if (mode == "topology") {
      for (let i = 0; i < this.activities.length; i++) {
        if ((this.activities[i].layer == d.layer && this.activities[i].source == d.unit) || (this.activities[i].layer == d.layer - 1 && this.activities[i].target == d.unit)) {
          switch (this.activities[i].activity) {
            case 1: {
              color = "rgba(229, 115, 115, .35)";
              break;
            }
            case 0.5: {
              color = "rgba(229, 115, 115, .175)";
              break;
            }
          }
          break;
        }
      }
    }

    return color;
  }

  updateWeightsDifferences(layerIndex: number, sourceIndex: number, diff: number) {
    if (sourceIndex === 0) {
      this.minMaxDiffs[layerIndex].minDiff = diff;
      this.minMaxDiffs[layerIndex].maxDiff = diff;
    } else {
      if (diff < this.minMaxDiffs[layerIndex].minDiff) { this.minMaxDiffs[layerIndex].minDiff = diff; }
      if (diff > this.minMaxDiffs[layerIndex].maxDiff) { this.minMaxDiffs[layerIndex].maxDiff = diff; }
    }
  }

  redraw() {
    this.svg
      .attr('width', this.svgWidth)
      .attr('height', this.svgHeight);
  }
}
