/* eslint-disable @typescript-eslint/no-unsafe-return */

import Excevent from "./Excevent";
import { EventBusOrHost, EventHandler, EventHandlersByPriority, EventHostOrClass, EventList, EventParameters, EventReturn, Events, EventSubscriptions, EventUnion, IEventApi, IEventHostInternal } from "./IExcevent";
import PriorityMap from "./PriorityMap";

type CoerceVoidToUndefined<T> = T extends void ? undefined : T;
type Mutable<T> = { -readonly [P in keyof T]: T[P] };
type AnyFunction = (...args: any[]) => any;

class EventEmitter<HOST, EVENTS, BUSES = never> {

	private subscriptions: EventSubscriptions<HOST, EVENTS> = {};

	// @ts-ignore
	public constructor (private readonly host: HOST, private excevent?: Excevent<BUSES>) { }

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

				const handlerOutput = handler(api, ...args);

				if (!api.disregard)
					result.push(handlerOutput);

				if (api.break)
					return result;
			}

			for (const [property, subscribers] of Object.entries(handlersByType.references)) {
				for (const subscriber of subscribers) {
					mutableApi.index++;

					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
					const handlerOutput = subscriber[property](api, ...args);

					if (!api.disregard)
						result.push(handlerOutput);

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
				if (output !== undefined && !api.disregard) {
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
					if (output !== undefined && !api.disregard) {
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

	public subscribe<EVENT extends EventList<EVENTS>> (events: EVENT, ...handlers: EventHandler<HOST, EVENTS, EventUnion<EVENTS, EVENT>>[]): this;
	public subscribe<EVENT extends EventList<EVENTS>> (events: EVENT, priority: number, ...handlers: EventHandler<HOST, EVENTS, EventUnion<EVENTS, EVENT>>[]): this;
	public subscribe<EVENT extends EventList<EVENTS>> (events: EVENT, priority: number | EventHandler<HOST, EVENTS, EventUnion<EVENTS, EVENT>>, ...handlers: EventHandler<HOST, EVENTS, EventUnion<EVENTS, EVENT>>[]) {
		if (typeof priority !== "number") {
			if (priority !== undefined) {
				handlers.push(priority);
			}

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

	public unsubscribe<EVENT extends EventList<EVENTS>> (events: EVENT, ...handlers: EventHandler<HOST, EVENTS, EventUnion<EVENTS, EVENT>>[]): this;
	public unsubscribe<EVENT extends EventList<EVENTS>> (events: EVENT, priority: number, ...handlers: EventHandler<HOST, EVENTS, EventUnion<EVENTS, EVENT>>[]): this;
	public unsubscribe<EVENT extends EventList<EVENTS>> (events: EVENT, priority: number | EventHandler<HOST, EVENTS, EventUnion<EVENTS, EVENT>>, ...handlers: EventHandler<HOST, EVENTS, EventUnion<EVENTS, EVENT>>[]) {
		if (typeof priority !== "number") {
			if (priority !== undefined) {
				handlers.push(priority);
			}

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

	/**
	 * Returns a promise that will be resolved when any of the given events are emitted on this object.
	 * @param events The events to resolve the promise on.
	 * @param priority The priority of waiting for the given events, compared to other event handlers. Defaults to `-Infinity`
	 */
	public async waitFor<EVENT extends EventList<EVENTS>> (events: EVENT, priority = -Infinity) {
		return new Promise<EventParameters<EVENTS, EventUnion<EVENTS, EVENT>>>(resolve => {
			const realHandler = (api: IEventApi<HOST, EVENTS, keyof EVENTS>, ...args: any[]): any => {
				this.unsubscribe(events, priority, realHandler);
				resolve(args as any);
				api.disregard = true;
			};

			this.subscribe(events, priority, realHandler);
		});
	}

	public until<EVENT extends EventList<EVENTS>> (event: EVENT, initializer: (subscriber: IUntilThisSubscriber<BUSES>) => any): this;
	public until<UNTIL_HOST extends (BUSES extends null ? EventHostOrClass<any> : EventBusOrHost<any>), UNTIL_EVENTS extends Events<UNTIL_HOST, BUSES>, EVENT extends EventList<UNTIL_EVENTS>> (host: UNTIL_HOST, event: EVENT, initializer: (subscriber: IUntilSubscriber<HOST, EVENTS>) => any): IUntilSubscriber<HOST, EVENTS>;
	public until (host: any, event?: string | string[] | ((until: any) => any), initializer?: (until: any) => any) {
		if (typeof event === "function") {
			initializer = event;
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			event = host;
			host = undefined;

			const subscriptions: [host: any, event: string, priority: number, ...handlers: AnyFunction[]][] = [];
			const untilSubscriber: IUntilThisSubscriber<BUSES> = {
				subscribe: (host, event, priority, ...handlers) => {
					if (typeof priority !== "number") {
						if (priority !== undefined) {
							handlers.push(priority);
						}

						priority = 0;
					}

					subscriptions.push([host, event as string, priority, ...handlers]);
					return untilSubscriber;
				},
			};

			initializer(untilSubscriber);
			if (subscriptions.length > 0) {
				for (const [host, event, priority, ...handlers] of subscriptions) {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
					if ("event" in host && host.event instanceof EventEmitter) {
						// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
						host.event.subscribe(event, priority, ...handlers);
					}
				}

				this.subscribe(event as EventList<EVENTS>, -Infinity, (api: IEventApi<any, any, any>, _: any): any => {
					// unsubscribe
					for (const [host, event, priority, ...handlers] of subscriptions) {
						// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
						if ("event" in host && host.event instanceof EventEmitter) {
							// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
							host.event.unsubscribe(event, priority, ...handlers);
						}
					}

					api.disregard = true;
				});
			}

			return this;
		}

		const subscriptions: [event: string, priority: number, ...handlers: AnyFunction[]][] = [];
		const untilSubscriber: IUntilSubscriber<any, any> = {
			subscribe: (event, priority, ...handlers) => {
				if (typeof priority !== "number") {
					if (priority !== undefined) {
						handlers.push(priority);
					}

					priority = 0;
				}

				subscriptions.push([event as string, priority, ...handlers]);
				return untilSubscriber;
			},
		};

		initializer!(untilSubscriber);
		if (subscriptions.length > 0) {
			// TODO use excevent createSubscriber
			// @ts-ignore
			for (const [event, priority, ...handlers] of subscriptions) {
				// TODO use excevent subscriber
			}

			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
			host.subscribe(event as EventList<EVENTS>, -Infinity, (api: IEventApi<any, any, any>, _: any): any => {
				// unsubscribe
				// @ts-ignore
				for (const [event, priority, ...handlers] of subscriptions) {
					// TODO use excevent subscriber
				}

				api.disregard = true;
			});
		}

		return this;
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
			disregard: false,
		};
	}
}

namespace EventEmitter {
	export function Host<BUSES> (excevent?: Excevent<BUSES>) {
		return class <EVENTS> {
			public readonly event = new EventEmitter<this, EVENTS, BUSES>(this, excevent);
		}
	}
}

export default EventEmitter;

export interface IUntilSubscriber<HOST, EVENTS> {
	subscribe<EVENT extends EventList<EVENTS>> (events: EVENT, ...handlers: EventHandler<HOST, EVENTS, EventUnion<EVENTS, EVENT>>[]): this;
	subscribe<EVENT extends EventList<EVENTS>> (events: EVENT, priority: number, ...handlers: EventHandler<HOST, EVENTS, EventUnion<EVENTS, EVENT>>[]): this;
}

export interface IUntilThisSubscriber<BUSES> {
	subscribe<HOST, EVENTS extends Events<HOST, BUSES>, EVENT extends EventList<EVENTS>> (host: HOST, events: EVENT, ...handlers: EventHandler<HOST, EVENTS, EventUnion<EVENTS, EVENT>>[]): this;
	subscribe<HOST, EVENTS extends Events<HOST, BUSES>, EVENT extends EventList<EVENTS>> (host: HOST, events: EVENT, priority: number, ...handlers: EventHandler<HOST, EVENTS, EventUnion<EVENTS, EVENT>>[]): this;
}
