import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  readonly basePath = "/assets/";

  toolbarHeight: BehaviorSubject<number>;

  constructor(private http: HttpClient) {
    this.toolbarHeight = new BehaviorSubject(56);
  }

  getTrainingResult(filename: string) {
    return this.http.get(this.basePath + filename);
  }
}
