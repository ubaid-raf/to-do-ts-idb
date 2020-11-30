import { firebase } from '../../firebase';
import { UUID } from 'angular2-uuid';


export interface ITask {
  $key?: string;
  completed: boolean;
  createdAt: Object;
  title: string;
}


export class Task implements ITask {
  completed = false;
  createdAt = firebase.database.ServerValue.TIMESTAMP;
  title;

  constructor(title: string) {
    this.title = title;
  }
}
