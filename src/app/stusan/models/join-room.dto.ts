import { JanusErrorDto } from './janus-error.dto';

interface Publishers {
  id: string; // <unique ID of active publisher #1>
  display?: string; // <display name of active publisher #1, if any>
  audio_codec: string; // <audio codec used by active publisher #1, if any>
  video_codec: string; // <video codec used by active publisher #1, if any>
  simulcast: boolean; // <true if the publisher uses simulcast (VP8 and H.264 only)>
  talking: boolean; //  <true|false, whether the publisher is talking or not (only if audio levels are used)>
}

interface Attendees {
  id: string; // <unique ID of attendee #1>
  display: string; // <display name of attendee #1, if any>
}

export interface JoinRoomDto {
  videoroom: 'joined';
  room: string; // <room ID>
  description?: string; // <description of the room, if available>
  id: string; // <unique ID of the participant>
  private_id: string; // <a different unique ID associated to the participant; meant to be private>
  publishers: Publishers[]; // Other active publishers
  attendees: Attendees[]; // Other attendees, only present when notify_joining is set to TRUE for rooms
}

export interface Participants {
  display: string;
  id: number;
  publisher: boolean
  ; talking?: boolean;
}

export type JoinRoomResponse = JoinRoomDto | JanusErrorDto;
