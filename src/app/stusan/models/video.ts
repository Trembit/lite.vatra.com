import { JanusJS } from '../../../assets/stusan/scripts/janus';
import { VideoType } from '@enums';

export interface Video {
  audioKindAdded?: boolean;
  videoKindAdded?: boolean;
  stream: MediaStream;
  pluginHandle: JanusJS.PluginHandle;
  id: number;
  name: string | null;
  remote: boolean;
  type: VideoType;
  mutedMic?: boolean;
  mutedCam?: boolean;
}


export interface ConnectionInfoModel extends MediaTrackSettings {
  videoCodec?: string;
  bitrate?: string;
}
