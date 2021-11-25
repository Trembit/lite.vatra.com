import { JanusErrorDto } from './janus-error.dto';

export interface CreateRoomDto {
  videoroom: 'created';
  room: number; // <unique numeric ID>
  permanent: boolean; // <true if saved to config file, false if not>
}

export type CreateRoomResponse = CreateRoomDto | JanusErrorDto;
