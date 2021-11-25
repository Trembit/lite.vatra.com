import { JanusErrorDto } from './janus-error.dto';

export interface RoomExistsDto {
  videoroom: 'success';
  room: number; // <unique numeric ID>
  exists: boolean;
}

export type RoomExistsResponse = RoomExistsDto | JanusErrorDto;
