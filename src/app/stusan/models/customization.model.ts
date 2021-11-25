export interface CustomizationModel {
  homeLogo: string; // if null - hide logo
  roomLogo?: string;
  homeShowDescription: {}; // true by default, false for grouproom.sirius.video.
  mediaEchoCancellation: {}; // by default
  mediaAutoGainControl: {}; // by default
  mediaNoiseSuppression: {}; // by default
  favicon: string;
  title: string;
  server: string;
  bitrate?: number;
}
