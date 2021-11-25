import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'firstWord' })
export class GetFirstWord implements PipeTransform
{
  transform(value: string): string {
    value = ('' + value).trim();
    if (!value) {
      return '';
    }

    if (value.indexOf(' ') === -1) {
      return value[0];
    } else {
      const splitRes = value.split(' ');

      return splitRes[0][0] + splitRes[1][0];
    }
  }

}
