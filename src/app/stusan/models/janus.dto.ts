import Janus from '../../../assets/stusan/scripts/janus';
import { JanusJS } from '../../../assets/stusan/scripts/janus';

export interface JanusInterface extends Janus {
  reconnect: (options: JanusJS.ReconnectOptions) => void;
}
