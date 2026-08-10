import { EventEmitter } from 'events';
import TypedEventEmitter from 'typed-emitter';
import { PalabraTtsEvents } from '~/transport/PalabraTtsWebSocketTransport.model';

export class PalabraTtsBaseEventEmitter extends (EventEmitter as new () => TypedEventEmitter<PalabraTtsEvents>) {}
