export interface MicState {
  userId: number;
  enabled: boolean;
}

export interface MessageData {
  feed: number;
  enabled: boolean;
  type: string;
}

export interface MicStates {
   [key: string]: boolean;
}
