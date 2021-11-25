import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RoomRoutingModule } from './room-routing.module';
import { SharedModule } from '@shared/shared.module';
import { RoomComponent } from './room.component';
import { HeaderComponent } from './header/header.component';
import { ControlsComponent } from './controls/controls.component';
import { VideosComponent } from './videos/videos.component';
import { ChatComponent } from './chat/chat.component';

@NgModule({
  declarations: [
    RoomComponent,
    HeaderComponent,
    ControlsComponent,
    VideosComponent,
    ChatComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RoomRoutingModule,
    SharedModule,
  ],
})
export class RoomModule { }
