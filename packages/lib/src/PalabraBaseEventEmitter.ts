import { EventEmitter } from 'events';
import TypedEventEmitter from 'typed-emitter';
import { PalabraEvents } from '~/transport/PalabraWebRtcTransport.model';

export class PalabraBaseEventEmitter extends (EventEmitter as new () => TypedEventEmitter<PalabraEvents>) {}