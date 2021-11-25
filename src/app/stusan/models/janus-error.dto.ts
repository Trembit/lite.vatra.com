export interface JanusErrorDto {
  videoroom: 'event';
  error_code: number; // <numeric ID, check Macros below>
  error: string; // <error description as a string>
}
