/* eslint-disable @typescript-eslint/no-unsafe-return */

import { EventHandler, EventHandlerList, EventList, EventParameters, EventReturn, EventSubscriptions, EventUnion, IEventApi, IEventHostInternal } from "./IExcevent";
import PriorityList from "./PriorityList";

// export type EventRecord = Record<string, (...args: any[]) => any>;
type CoerceVoidToUndefined<T> = T extends void ? undefined : T;

type Mutable<T> = { -readonly [P in keyof T]: T[P] };

class EventEmitter<HOST, EVENTS> {

	private subscriptions: EventSubscriptions<HOST, EVENTS> = {};

	public constructor (private readonly host: HOST) { }

	public emit<EVENT extends keyof EVENTS> (event: EVENT, ...args: EventParameters<EVENTS, EVENT>) {
		const handlerLists = this.getHandlerLists(event);
		if (handlerLists.length === 0)
			return [];

		const api = this.createApi(event);
		return PriorityList.mapAll(handlerLists, (api, handler) => {
			(api as Mutable<typeof api>).index++;

			if (!Array.isArray(handler))
				return handler(api, ...args);

			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			const [subscriber, property] = handler;
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
			return subscriber[property](api, ...args);
		}, api);
	}

	public query<EVENT extends keyof EVENTS> (event: EVENT, ...args: EventParameters<EVENTS, EVENT>) {
		const handlerLists = this.getHandlerLists(event);
		if (handlerLists.length === 0)
			return undefined;

		const api = this.createApi(event);

		type Output = CoerceVoidToUndefined<EventReturn<EVENTS, EVENT>>;
		let result: Output | undefined;
		PriorityList.mapAll(handlerLists, (api, handler) => {
			(api as Mutable<typeof api>).index++;
			let output: Output;
			if (Array.isArray(handler)) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				const [subscriber, property] = handler;
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
				output = subscriber[property](api, ...args);

			} else {
				output = handler(api, ...args);
			}

			if (output !== undefined) {
				api.break = true;
				result = output;
			}

			return output;
		}, api);

		return result;
	}

	public subscribe<EVENT extends EventList<EVENTS>> (events: EVENT, handler: EventHandler<HOST, EVENTS, EventUnion<EVENTS, EVENT>>, ...additionalHandlers: EventHandler<HOST, EVENTS, EventUnion<EVENTS, EVENT>>[]): this;
	public subscribe<EVENT extends EventList<EVENTS>> (events: EVENT, priority: number, ...handlers: EventHandler<HOST, EVENTS, EventUnion<EVENTS, EVENT>>[]): this;
	public subscribe<EVENT extends EventList<EVENTS>> (events: EVENT, priority: number | EventHandler<HOST, EVENTS, EventUnion<EVENTS, EVENT>>, ...handlers: EventHandler<HOST, EVENTS, EventUnion<EVENTS, EVENT>>[]) {
		if (typeof priority !== "number") {
			handlers.push(priority);
			priority = 0;
		}

		for (const event of Array.isArray(events) ? events : [events])
			EventSubscriptions.get(this.subscriptions, event)
				.addMultiple(priority, ...handlers);

		return this;
	}

	public unsubscribe<EVENT extends EventList<EVENTS>> (events: EVENT, handler: EventHandler<HOST, EVENTS, EventUnion<EVENTS, EVENT>>, ...additionalHandlers: EventHandler<HOST, EVENTS, EventUnion<EVENTS, EVENT>>[]): this;
	public unsubscribe<EVENT extends EventList<EVENTS>> (events: EVENT, priority: number, ...handlers: EventHandler<HOST, EVENTS, EventUnion<EVENTS, EVENT>>[]): this;
	public unsubscribe<EVENT extends EventList<EVENTS>> (events: EVENT, priority: number | EventHandler<HOST, EVENTS, EventUnion<EVENTS, EVENT>>, ...handlers: EventHandler<HOST, EVENTS, EventUnion<EVENTS, EVENT>>[]) {
		if (typeof priority !== "number") {
			handlers.push(priority);
			priority = 0;
		}

		for (const event of Array.isArray(events) ? events : [events])
			EventSubscriptions.get(this.subscriptions, event, false)
				?.removeMultiple(priority, ...handlers);

		return this;
	}

	public async waitFor<EVENT extends EventList<EVENTS>> (events: EVENT, priority = 0) {
		return new Promise<EventParameters<EVENTS, EventUnion<EVENTS, EVENT>>>(resolve => {
			const realHandler = (host: any, ...args: any[]): any => {
				this.unsubscribe(events, priority, realHandler);
				resolve(args as any);
			};

			this.subscribe(events, priority, realHandler);
		});
	}

	private getHandlerLists (event: keyof EVENTS) {
		const subscriptions = this.subscriptions[event];
		const emitTo: EventHandlerList<HOST, EVENTS>[] = subscriptions === undefined ? [] : [subscriptions];
		for (const { [event]: otherSubscriptionsOfEvent } of IEventHostInternal.getSubscriptions<EVENTS>(this.host))
			if (otherSubscriptionsOfEvent)
				emitTo.push(otherSubscriptionsOfEvent);

		return emitTo;
	}

	private createApi<EVENT extends keyof EVENTS> (event: EVENT): IEventApi<HOST, EVENTS, EVENT> {
		return {
			host: this.host,
			event,
			index: -1,
			break: false,
		};
	}
}

namespace EventEmitter {
	export class Host<EVENTS> {
		public readonly event = new EventEmitter<this, EVENTS>(this);
	}
}

export default EventEmitter;
