import { Component, Inject, OnInit } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Title } from '@angular/platform-browser';

import { StateService } from './stusan/shared/services/state.service';
import { ThemeType } from './stusan/enums';
import { CustomizationService } from './stusan/services/customization.service';

@Component({
  selector: 'stusan-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  favIcon: HTMLLinkElement;

  constructor(@Inject(DOCUMENT) private document: Document, private stateService: StateService,
              public customizationService: CustomizationService, private title: Title,
  ) {
    this.favIcon = this.document.querySelector('#appIcon') as HTMLLinkElement;
    this.favIcon.href = customizationService.config.favicon;
  }

  ngOnInit(): void {
    this.title.setTitle(this.customizationService.config.title);


    this.stateService.theme$
      .subscribe((theme: ThemeType) => {
        this.document.documentElement.setAttribute('data-theme', theme);
      });
  }
}
