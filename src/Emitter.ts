/* eslint-disable @typescript-eslint/no-unsafe-return */

import { EventHandler, EventHandlersByPriority, EventList, EventParameters, EventReturn, EventSubscriptions, EventUnion, IEventApi, IEventHostInternal } from "./IExcevent";
import PriorityMap from "./PriorityMap";

// export type EventRecord = Record<string, (...args: any[]) => any>;
type CoerceVoidToUndefined<T> = T extends void ? undefined : T;

type Mutable<T> = { -readonly [P in keyof T]: T[P] };

class EventEmitter<HOST, EVENTS> {

	private subscriptions: EventSubscriptions<HOST, EVENTS> = {};

	public constructor (private readonly host: HOST) { }

	public emit<EVENT extends keyof EVENTS> (event: EVENT, ...args: EventParameters<EVENTS, EVENT>) {
		const handlersByPriority = this.getHandlerLists(event);
		if (handlersByPriority.length === 0)
			return [];

		const api = this.createApi(event);
		return PriorityMap.mapAll(handlersByPriority, (api, handlersByType) => {
			const mutableApi = (api as Mutable<typeof api>);

			const result: any[] = [];
			for (const handler of handlersByType.handlers) {
				mutableApi.index++;
				result.push(handler(api, ...args));
				if (api.break)
					return result;
			}

			for (const [property, subscribers] of Object.entries(handlersByType.references)) {
				for (const subscriber of subscribers) {
					mutableApi.index++;
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
					result.push(subscriber[property](api, ...args));
					if (api.break)
						return result;
				}
			}

			return result;
		}, api)
			.flat();
	}

	public query<EVENT extends keyof EVENTS> (event: EVENT, ...args: EventParameters<EVENTS, EVENT>) {
		const handlersByPriority = this.getHandlerLists(event);
		if (handlersByPriority.length === 0)
			return undefined;

		const api = this.createApi(event);

		type Output = CoerceVoidToUndefined<EventReturn<EVENTS, EVENT>>;
		let result: Output | undefined;
		PriorityMap.mapAll(handlersByPriority, (api, handlersByType) => {
			const mutableApi = (api as Mutable<typeof api>);

			for (const handler of handlersByType.handlers) {
				mutableApi.index++;
				const output = handler(api, ...args);
				if (output !== undefined) {
					api.break = true;
					result = output;
					return;
				}
			}

			for (const [property, subscribers] of Object.entries(handlersByType.references)) {
				for (const subscriber of subscribers) {
					mutableApi.index++;
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
					const output = subscriber[property](api, ...args);
					if (output !== undefined) {
						api.break = true;
						// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
						result = output;
						return;
					}
				}
			}

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

		for (const event of Array.isArray(events) ? events : [events]) {
			const subscriptions = EventSubscriptions.get(this.subscriptions, event);
			const subscribedHandlers = EventSubscriptions.getPriority(subscriptions, priority).handlers;
			for (const handler of handlers)
				subscribedHandlers.add(handler);
		}

		return this;
	}

	public unsubscribe<EVENT extends EventList<EVENTS>> (events: EVENT, handler: EventHandler<HOST, EVENTS, EventUnion<EVENTS, EVENT>>, ...additionalHandlers: EventHandler<HOST, EVENTS, EventUnion<EVENTS, EVENT>>[]): this;
	public unsubscribe<EVENT extends EventList<EVENTS>> (events: EVENT, priority: number, ...handlers: EventHandler<HOST, EVENTS, EventUnion<EVENTS, EVENT>>[]): this;
	public unsubscribe<EVENT extends EventList<EVENTS>> (events: EVENT, priority: number | EventHandler<HOST, EVENTS, EventUnion<EVENTS, EVENT>>, ...handlers: EventHandler<HOST, EVENTS, EventUnion<EVENTS, EVENT>>[]) {
		if (typeof priority !== "number") {
			handlers.push(priority);
			priority = 0;
		}

		for (const event of Array.isArray(events) ? events : [events]) {
			const subscriptions = EventSubscriptions.get(this.subscriptions, event, false);
			const subscribedHandlers = subscriptions?.get(priority)?.handlers;
			if (subscribedHandlers)
				for (const handler of handlers)
					subscribedHandlers.delete(handler);
		}

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
		const emitTo: EventHandlersByPriority<HOST, EVENTS>[] = subscriptions === undefined ? [] : [subscriptions];
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
