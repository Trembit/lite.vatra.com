import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { ObserversModule } from '@angular/cdk/observers';
import { PlatformModule } from '@angular/cdk/platform';

import { IconComponent } from './components/icon/icon.component';
import { ControlButtonComponent } from './components/control-button/control-button.component';
import { MicWarningPopupComponent } from './components/mic-warning-popup/mic-warning-popup.component';
import { ToggleComponent } from './components/toggle/toggle.component';
import { DropdownComponent } from './components/dropdown/dropdown.component';
import { VideoComponent } from './components/video/video.component';
import { SettingsComponent } from '@shared/components/settings/settings.component';
import { GetFirstWord } from './pipes/first-word.pipe';
import { SoundService } from './services/sound.service';

const components = [
  GetFirstWord,
  IconComponent,
  ControlButtonComponent,
  MicWarningPopupComponent,
  ToggleComponent,
  DropdownComponent,
  VideoComponent,
  SettingsComponent,
];

@NgModule({
  declarations: [
    ...components,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ScrollingModule,
    ObserversModule,
    PlatformModule,
  ],
  exports: [
    ...components,
    ScrollingModule,
    ObserversModule,
    PlatformModule,
  ],
  providers: [
    SoundService,
  ],
})
export class SharedModule { }
