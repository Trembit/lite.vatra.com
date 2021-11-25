import { ErrorHandler, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { MatDialogModule } from '@angular/material/dialog';
import * as Sentry from '@sentry/angular';
import { OverlayModule } from '@angular/cdk/overlay';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { SharedModule } from './stusan/shared/shared.module';
import { PopupComponent } from './stusan/shared/services/popup/popup.component';
import { CustomizationService } from './stusan/services/customization.service';
import { environment } from 'src/environments/environment';

@NgModule({
  declarations: [
    AppComponent,
    PopupComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    MatDialogModule,
    OverlayModule,
    SharedModule,

  ],
  providers: [
    CustomizationService,
    {
      provide: ErrorHandler,
      useValue: Sentry.createErrorHandler({
        // @todo: turn On if needed
        showDialog: false, // environment.production, // turn on only for production
      }),
    },
  ],
  bootstrap: [AppComponent],
})
export class AppModule { }
