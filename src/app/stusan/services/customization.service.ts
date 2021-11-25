import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

import { CustomizationModel } from '../models/customization.model';

@Injectable({ providedIn: 'root' })
export class CustomizationService {
  readonly siriusHost = 'grouproom.sirius.video';
  // readonly siriusHost = 'localhost'; // for tests

  config: CustomizationModel = {
    homeLogo: '/assets/stusan/images/logo.png', // if null - hide logo
    roomLogo: '/assets/stusan/images/stusan-logo-small.svg',
    homeShowDescription: {ideal: true}, // true by default, false for grouproom.sirius.video.
    mediaEchoCancellation: {ideal: true}, // by default
    mediaAutoGainControl: {ideal: true}, // by default
    mediaNoiseSuppression: {ideal: true}, // by default
    favicon: 'favicon.ico',
    server: environment.janus.server,
    bitrate: 768000,
    title: 'TheVatra',
  };

  constructor() {
    // console.log('[Custom] constr hostname: ', window.location.hostname);
    if (this.isSirius()) {
      // this.config.homeLogo = '/assets/stusan/images/sirius.logo.png';
      this.config.homeLogo = '/assets/stusan/images/sirius.home.logo.png'; // oct-18
      this.config.roomLogo = '/assets/stusan/images/sirius.room.logo.png';
      this.config.homeShowDescription = false;

      this.config.mediaAutoGainControl = false;
      this.config.mediaNoiseSuppression = false;
      this.config.favicon = './assets/favicon/favicon-sirius.png';
      this.config.title = 'Sirius video';
      this.config.server = 'wss://grouproom-media-wss.sirius.video:443';
      this.config.bitrate = 128000; // 128 kbps
    }
  }

  public isSirius(): boolean {
    return window.location.hostname.indexOf(this.siriusHost) !== -1;
  }
}
