import 'rxjs/add/observable/merge';
import 'rxjs/add/operator/switchMap';

import { Injectable } from '@angular/core';
import { AngularFireDatabase, FirebaseListObservable } from 'angularfire2/database';
import { Observable } from 'rxjs/Observable';
import { ReplaySubject } from 'rxjs/ReplaySubject';
import { AuthService } from '../auth';
import { firebase } from '../firebase';
// import { firestore } from 'firebase';
import { ITask, Task } from './models';
import Dexie from 'dexie';


@Injectable()
export class TasksService {
  visibleTasks$: Observable<ITask[]>;
  visibleTasks: ITask[];
  db: any;
  afDb: AngularFireDatabase;
  tasks: Observable<ITask[]>;

  private filter$: ReplaySubject<any> = new ReplaySubject(1);
  private tasks$: FirebaseListObservable<ITask[]>;


  constructor(afDb: AngularFireDatabase, auth: AuthService) {
    this.createDatabase();
    auth.uid$
    .take(1)
      .subscribe(async uid => {
        this.db.open();
        const path = `/tasks/${uid}`;
        this.tasks$ = afDb.list(path);
        await this.db.user.toArray().then((users)=>{
          let user = users[0];
          if((!user) || (user.uid!=uid)){
            this.db.user.clear();
            this.db.todos.clear();
            this.db.user.add({uid: uid})
            .catch(e => {
              alert('Error: ' + (e.stack || e));
            });
            this.tasks$.subscribe(tasks =>{
              console.log("Fetched");
              tasks.forEach((task)=>{
                this.db.todos.add({$key: task.$key.toString(), completed: task.completed, createdAt: task.createdAt, title: task.title});
              })
              this.visibleTasks$ = this.filter$.switchMap(async (filter) => {
                if(filter === null){
                  console.log(await this.db.todos.toArray());
                  return await this.db.todos.toArray();
                }
                return await this.db.todos.filter((task) => { return task.completed == filter }).toArray(function (filteredArray) {
                  console.log(JSON.stringify(filteredArray));
                  return filteredArray;
                });
              });
            });
          }else{
            this.tasks$.subscribe(()=>{
              this.visibleTasks$ = this.filter$.switchMap(async (filter) => {
                if(filter === null){
                  return await this.db.todos.toArray();
                }
                return await this.db.todos.filter((task) => { return task.completed == filter; }).toArray();
              });
            });
          }
        });
      });
  }

  refreshIDB():void{
    this.tasks$.subscribe(tasks =>{
      this.db.todos.clear();
      tasks.forEach((task)=>{
        this.db.todos.add({$key: task.$key.toString(), completed: task.completed, createdAt: task.createdAt, title: task.title});
      })
      this.visibleTasks$ = this.filter$.switchMap(async (filter) => {
        if(filter === null){
          return await this.db.todos.toArray();
        }
        return await this.db.todos.filter((task) => { return task.completed == filter }).toArray();
      });
    });
  }

  filterTasks(filter: string): void {
    switch (filter) {
      case 'false':
        this.filter$.next(false);
        break;

      case 'true':
        this.filter$.next(true);
        break;

      default:
        this.filter$.next(null);
        break;
    }
  }

  createTask(title: string): firebase.Promise<any> {
    let newTask = new Task(title);
    return this.tasks$.push(newTask).then((task)=>{
      this.db.todos.add({$key: task.key, completed: newTask.completed, createdAt: newTask.createdAt, title: newTask.title});
    });
  }

  removeTask(task: ITask): firebase.Promise<any> {
    this.db.todos.delete(task.$key.toString());
    return this.tasks$.remove(task.$key);
  }

  updateTask(task: ITask, changes: any): firebase.Promise<any> {
    this.db.todos.update(task.$key.toString(), changes);
    return this.tasks$.update(task.$key, changes);
  }

  createDatabase():void{
    this.db = new Dexie("Weava");
    this.db.version(1).stores({
      todos: '$key,completed,createdAt,title',
      user: "uid"
    });
  }
}
