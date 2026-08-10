import { EventEmitter } from 'events';
import TypedEventEmitter from 'typed-emitter';
import { PalabraAsrEvents } from '~/transport/PalabraAsrWebSocketTransport.model';

export class PalabraAsrBaseEventEmitter extends (EventEmitter as new () => TypedEventEmitter<PalabraAsrEvents>) {}
