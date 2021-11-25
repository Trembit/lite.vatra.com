import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  { path: '', loadChildren: () => import('./stusan/login/login.module').then(m => m.LoginModule) },
  { path: 'login/:roomName', loadChildren: () => import('./stusan/login/login.module').then(m => m.LoginModule) },
  { path: ':roomName', loadChildren: () => import('./stusan/room/room.module').then(m => m.RoomModule) },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule { }
