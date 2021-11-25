import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, HostBinding, Input, OnDestroy,
  OnInit, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';

import { MicState, Video } from '@models';
import { LayoutType, VideoType } from '@enums';
import { JanusService } from '@shared/services/janus.service';
import { StateService } from '@shared/services/state.service';
import { VideoComponent } from '@shared/components/video/video.component';

@Component({
  selector: 'stusan-videos',
  templateUrl: './videos.component.html',
  styleUrls: ['./videos.component.scss'],
  changeDetection: ChangeDetectionStrategy.Default,
})
export class VideosComponent implements OnInit, AfterViewInit, OnDestroy {
  destroyed$ = new Subject<boolean>();

  public videosArray: Video[];
  public videosArrayLength = 0;
  @Input() set videos(arr: Video[] | null) {
    this.videosArray = arr || [];
    if (this.videosArrayLength > this.videosArray.length) {
      this.setStartEndIndexes();
    }
    this.videosArrayLength = this.videosArray.length;
    this.pageLimit = Math.ceil(this.videosArrayLength / this.pageSize);
    this.onSetVideos(this.videosArray);
  }
  get videos(): Video[] {
    return this.videosArray;
  }

  @ViewChildren('videoContainer') videoContainers: QueryList<ElementRef>;
  @ViewChildren('other') otherVideos: QueryList<VideoComponent>;
  @HostBinding('class') layoutType: LayoutType = LayoutType.Leader;
  @ViewChild('sourceWrapper', { static: false, read: CdkScrollable }) sourceWrapper: CdkScrollable;

  public videosOffset = 0;
  public offsetArray: any[] = [];
  public VideoTypeEnum = VideoType;
  public readonly VIDEO_SELFIE = 'data-selfie';
  public readonly VIDEO_MAIN = 'data-main';
  public readonly VIDEO_PREVIOUS = 'data-previous';
  public readonly VIDEO_NEXT = 'data-next';
  public leader: Video;
  public ownVideoId = 0;

  public othersArray: Video[];
  public othersArrayLength = 0;

  needScroll = true; // false was before
  isScrollLeft = true;
  isScrollRight = true;

  startIndex = 0;
  endIndex = 2;
  pageSize = 3;
  currentPage = 0;
  pageLimit = 0;
  tileItemsOnScreen = 6;

  constructor( public janusService: JanusService, public stateService: StateService ) {
    // this.test(7); // For testing /////////////////////
  }

  async ngOnInit(): Promise<void> {
    this.ownVideoId = this.janusService.getLocalUserId();
    this.stateService.layoutType$.pipe(takeUntil(this.destroyed$)).subscribe((layoutType: LayoutType) => {
      this.layoutType = layoutType;
      this.setStartEndIndexes();
    });

    this.janusService.camState$.pipe(
        filter((camState: MicState) => camState.enabled === false),
        takeUntil(this.destroyed$),
      ).subscribe((camState: MicState) => {
        if (this.layoutType === LayoutType.Leader && this.leader.id !== this.ownVideoId && camState.userId === this.leader.id ) {
          // set the leader to own
          const ownVideo = this.videosArray.find((source) => source.id === this.ownVideoId);
          if (!ownVideo) {
            return;
          }
          this.setLeader(ownVideo);
        }

      });
  }

  setStartEndIndexes() {
    if (this.layoutType === LayoutType.Leader) {
      this.startIndex = 0;
      this.endIndex = 2;
    } else {
      this.startIndex = 0;
      this.currentPage = 0;
      this.endIndex = this.tileItemsOnScreen - 1; // the limit is 6 users for Tile Layout
      // for all visible videos must send video: true

      this.videosArray.forEach((currentVideo, index) => {
        if ( index < this.tileItemsOnScreen ) {
          currentVideo.pluginHandle.send({ message: { request: 'configure', video: true } });
        }
      });
    }
  }
  onPrevTile() {
    if (0 <= this.currentPage - 1) {
      this.currentPage--;
      this.startIndex = this.currentPage * this.pageSize;
    }
  }
  onNextTile() {
    if (this.currentPage + 1 < this.pageLimit) { // can be wrong
      this.currentPage++;
      this.startIndex = this.currentPage * this.pageSize;
    }
  }
  showPrev() {
    if (0 <= this.startIndex - 1) {
      this.startIndex--;
      this.endIndex--;
    }
  }
  showNext() {
    if (this.othersArrayLength > this.endIndex + 1) {
      this.startIndex++;
      this.endIndex++;
    }
  }

  private onSetVideos(videos: Video[]) {
    if (this.layoutType === LayoutType.Leader) {
      const ids = this.videosArray.map((video) => video.id );
      if (this.videosArrayLength === 1) {
        this.leader = videos[0];
      }
      // If No Leader OR Leader is a dead(stopped shared)
      else if ((!this.leader || ids.indexOf(this.leader.id) === -1) && this.videosArrayLength > 0) {
        this.leader = videos[0];
      }
    }
    this.filterOthersFromLeader();
  }

  private filterOthersFromLeader() {
    this.othersArray = this.videosArray.filter((source) => this.leader && source.id !== this.leader.id);
    this.othersArrayLength = this.othersArray.length;
  }

  setLeader(source: Video) {
    this.leader = {...source};

    this.filterOthersFromLeader();
  }

  othersChanged(event: MutationRecord[]) {
    // this.setScrollStatus();
  }

  test(quantity = 6) {
    setTimeout(async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      const videos: any[] = [];
      for (let i = 0; i < quantity; i++) {
        videos.push({
          stream,
          pluginHandle: null,
          id: Math.floor(1000 + Math.random() * 9000),
          name: Math.floor(1000 + Math.random() * 9000),
          remote: i !== 0,
          type: 'video',
        });
      }
      this.janusService.videos$.next(videos);
      // setTimeout(() => {
      //   console.log('[test] ', this.sourceWrapper);
      // })
    }, 3000);
  }

  tilesClasses(tiles: number): string | string[] {
    if (tiles === 1) {
      return 'only';
    } else if (tiles === 2) {
      return 'two';
    } else if (tiles === 4) {
      return 'four';
    } else if (tiles === 3) {
      return 'four';
    } else if (tiles > 3 && tiles < 8) {
      return 'three-in-row';
    } else if (tiles % 4 === 0 || tiles < 10) {
      return 'three-in-row';
      // return 'four-in-row';
    } else if (tiles >= 10) {
      return 'three-in-row';
      // return 'five-in-row';
    }
    return 'three-in-row';
  }

  othersClasses(tiles: number): string {
    // othersClasses(videosArrayLength) for class="viewport"
    if (tiles <= 4) {
      return 'lt-four';
    // } else if (tiles === 4) {
      // return 'four';
    } else {
      return 'gt-four';
    }
  }

  ngAfterViewInit(): void {
    // this.setScrollStatus();
  }

  public id(index: number, item: Video): number {
    return item.id;
  }

  noVideo(stream: MediaStream) {
    return stream.getVideoTracks().length === 0;
  }
  noAudio(stream: MediaStream) {
    return stream.getAudioTracks().length === 0;
  }

  onVideoClick(element: HTMLDivElement): void {
    if (this.layoutType === LayoutType.Leader) {
      if (element.hasAttribute(this.VIDEO_PREVIOUS)) {
        this.videosOffset--;
      } else if (element.hasAttribute(this.VIDEO_NEXT)) {
        this.videosOffset++;
      } else {
        // Reset previous main video
        this.videoContainers.forEach((video: ElementRef) => {
          video.nativeElement.removeAttribute(this.VIDEO_MAIN);
        });

        // Set current video as main
        element.setAttribute(this.VIDEO_MAIN, 'true');
      }

    }
  }

  scrollSource(next: boolean) {
    const distance = Math.ceil(this.sourceWrapper.getElementRef().nativeElement.getBoundingClientRect().width);
    const to = !!next ? { start: this.sourceWrapper.measureScrollOffset('start') + distance } : {
      end: this.sourceWrapper.measureScrollOffset('end') + distance
    };
    this.sourceWrapper.scrollTo({
      ...to,
      behavior: 'smooth',
    });
    // this.setScrollStatus();
  }
  setScrollStatus() {
    if (this.sourceWrapper) {
      const el = this.sourceWrapper.getElementRef().nativeElement;
      this.needScroll = el.offsetWidth < el.scrollWidth;
      this.isScrollLeft = this.sourceWrapper.measureScrollOffset('start') > 0;
      this.isScrollRight = this.sourceWrapper.measureScrollOffset('end') > 0;
    }
  }

  ngOnDestroy() {
    this.destroyed$.next(true);
    this.destroyed$.complete();
  }

}
