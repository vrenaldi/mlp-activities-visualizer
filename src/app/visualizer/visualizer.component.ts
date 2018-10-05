import { Component, OnInit, Input, OnChanges, ViewChild, AfterViewInit, HostListener } from '@angular/core';
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
  toolbarHeight: number;
  unsubscribe: Subject<any> = new Subject();

  svg; svgWidth; svgHeight;
  layerSpacing; nodeRadius;

  @ViewChild("container") container;
  @Input() selectedFile: string;
  @Input() runVisualization: boolean;

  @HostListener('window:resize', ['$event'])
  onResize(event) {
    this.svgWidth = window.innerWidth / 1.5;
    this.svgHeight = window.innerHeight / 1.5;
    this.redraw();
  }

  constructor(private dataService: DataService) { }

  ngOnChanges() {
    if (this.runVisualization) this.visualize();
  }

  ngOnInit() {
    this.dataService.toolbarHeight.pipe(takeUntil(this.unsubscribe))
      .subscribe(toolbarHeight => { this.toolbarHeight = toolbarHeight; });

    this.svgWidth = window.innerWidth / 1.5;
    this.svgHeight = window.innerHeight / 1.5;
    this.nodeRadius = 10;
  }

  ngAfterViewInit() {
    this.svg = d3.select(this.container.nativeElement)
      .append('svg')
      .attr('width', window.innerWidth / 1.5)
      .attr('height', window.innerHeight / 1.5);
  }

  visualize() {
    this.dataService.getTrainingResult(this.selectedFile).pipe(takeUntil(this.unsubscribe))
      .subscribe(result => {
        console.log(result);
        this.setupWeights(result);
        this.setupTopology(this.selectedFile);
      });
  }
  
  setupWeights(filteredChanges) {
    // this.context = this.canvas.getContext('2d');
    // const customBase = document.createElement('base');
    // this.base = d3.select(customBase);


    // const filteredData = [];
    // this.minMaxDiffs = [];

    // if (filteredChanges.weights && filteredChanges.weights.currentValue) {
    //   const trainingResult = filteredChanges.weights.currentValue;

    //   if (!this.fromJson) {
    //     let lastEpoch = Object.keys(trainingResult).pop();
    //     if (lastEpoch == "epoch_0") this.prevFilteredData = undefined;

    //     Object.keys(trainingResult[lastEpoch]).forEach((layer, layerIndex) => {
    //       if (layer !== 'output') {
    //         this.minMaxDiffs.push({ minDiff: 0, maxDiff: 0 });

    //         trainingResult[lastEpoch][layer].forEach((destination, destinationIndex) => {
    //           destination.forEach((source, sourceIndex) => {
    //             let diff: number;
    //             if (this.prevFilteredData && lastEpoch != "epoch_0") {
    //               for (let i = 0; i < this.prevFilteredData.length; i++) {
    //                 if (this.prevFilteredData[i].layer == layerIndex && this.prevFilteredData[i].target == destinationIndex && this.prevFilteredData[i].source == sourceIndex) {
    //                   diff = Math.abs(source - this.prevFilteredData[i].value);

    //                   if (sourceIndex === 0) {
    //                     this.minMaxDiffs[layerIndex].minDiff = diff;
    //                     this.minMaxDiffs[layerIndex].maxDiff = diff;
    //                   } else {
    //                     if (diff < this.minMaxDiffs[layerIndex].minDiff) { this.minMaxDiffs[layerIndex].minDiff = diff; }
    //                     if (diff > this.minMaxDiffs[layerIndex].maxDiff) { this.minMaxDiffs[layerIndex].maxDiff = diff; }
    //                   }
    //                   break;
    //                 }
    //               }
    //             }

    //             filteredData.push({
    //               layer: layerIndex,
    //               source: sourceIndex,
    //               target: destinationIndex,
    //               value: source,
    //               diff: diff,
    //               unitSpacing: (this.canvas.height / +destination.length),
    //               targetUnitSpacing: (this.canvas.height / +trainingResult[lastEpoch][layer].length)
    //             });
    //           });
    //         });
    //       }
    //     });
    //     if (lastEpoch != "epoch_0") this.prevFilteredData = filteredData;
    //     this.activities = [];

    //     this.bindWeights(filteredData);
    //     console.log(this.activities);
    //     this.draw();
    //   }
    // }
    // else {
    //   this.prevFilteredData = undefined;
    //   this.activities = [];
    // }
  }

  setupTopology(selectedFile: string) {
    let layers: number[] = selectedFile.substring(4, selectedFile.length - 6)
      .replace(/ +/g, "")
      .split(",")
      .map(layer => +layer);

    let filteredLayerCount = 0;
    const filteredData = [];

    layers.forEach(layer => {
      for (let i = 0; i < layer; i++) {
        filteredData.push({ layer: filteredLayerCount, unit: i, unitSpacing: (this.svgHeight / layer) });
      }
      filteredLayerCount++;
    });
    for (let i = 0; i < 10; i++) {
      filteredData.push({ layer: filteredLayerCount, unit: i, unitSpacing: (this.svgHeight / 10) });
    }
    filteredLayerCount++;
    this.layerSpacing = (this.svgWidth / filteredLayerCount);
    this.bindTopology(filteredData);
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
      .attr('r', this.nodeRadius)
      .attr('fill', function (d) { return self.generateColor(d, "topology"); });

    const exitSel = circles.exit()
      .transition()
      .attr('r', 0)
      .remove();
  }


  generateColor(d, mode: string): string {
    // let color = "#EEEEEE";
    let color = "#000";
    let activity = 0;
    let recordActivities = false;

    // if (mode == "weights") {
    //   let range = Math.abs(this.minMaxDiffs[d.layer].maxDiff - this.minMaxDiffs[d.layer].minDiff);
    //   let diffPercentage = d.diff / range;

    //   if (diffPercentage > .9) {
    //     color = "#E57373";
    //     activity = 1;
    //     recordActivities = true;
    //   }
    //   else if (diffPercentage > .6) {
    //     color = "#FFCDD2";
    //     activity = 0.5;
    //     recordActivities = true;
    //   }

    //   if (recordActivities) {
    //     this.activities.push({
    //       layer: d.layer,
    //       source: d.source,
    //       target: d.target,
    //       activity: activity
    //     });
    //   }
    // }

    // if (mode == "topology") {
    //   for (let i = 0; i < this.activities.length; i++) {
    //     if ((this.activities[i].layer == d.layer && this.activities[i].source == d.unit) || (this.activities[i].layer == d.layer - 1 && this.activities[i].target == d.unit)) {
    //       switch (this.activities[i].activity) {
    //         case 1: {
    //           color = "rgba(229, 115, 115, .35)";
    //           break;
    //         }
    //         case 0.5: {
    //           color = "rgba(229, 115, 115, .175)";
    //           break;
    //         }
    //       }
    //       break;
    //     }
    //   }
    // }

    return color;
  }

  redraw() {
    this.svg
      .attr('width', this.svgWidth)
      .attr('height', this.svgHeight);
  }
}
