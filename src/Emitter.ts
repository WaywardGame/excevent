/* eslint-disable @typescript-eslint/no-unsafe-return */

import Excevent from "./Excevent";
import { Class, EventBusOrHost, EventHandler, EventHandlersByPriority, EventList, EventParameters, EventReturn, Events, EventSubscriptions, EventUnion, HostInstance, IEventApi, IEventHostInternal, TypedPropertyDescriptorFunctionAnyNOfParams } from "./IExcevent";
import PriorityMap from "./PriorityMap";

type Mutable<T> = { -readonly [P in keyof T]: T[P] };
type AnyFunction = (...args: any[]) => any;
type CoerceVoidToUndefined<T> = T extends void ? undefined : T;

export type EventOutput<EVENTS, EVENT extends keyof EVENTS> = CoerceVoidToUndefined<EventReturn<EVENTS, EVENT>>;
export type EventOutputEnsured<EVENTS, EVENT extends keyof EVENTS> = Exclude<EventOutput<EVENTS, EVENT>, undefined>;

export interface IEventQueryBuilder<EVENTS, EVENT extends keyof EVENTS> {
	where: (predicate: (output: EventOutputEnsured<EVENTS, EVENT>) => any) => this;
	get: (predicate?: ((output: EventOutputEnsured<EVENTS, EVENT>) => any) | undefined) => EventOutput<EVENTS, EVENT> | undefined;
}

const SYMBOL_OWN_SUBSCRIPTIONS = Symbol("EXCEVENT_OWN_SUBSCRIPTIONS");
const SYMBOL_OWN_SET_CLASS = Symbol("EXCEVENT_OWN_SET_CLASS");
interface IHostClass<HOST, EVENTS> {
	[SYMBOL_OWN_SUBSCRIPTIONS]?: [event: keyof EVENTS, property: keyof HOST, priority: number][];
	[SYMBOL_OWN_SET_CLASS]?: any;
}

export default class EventEmitter<HOST, EVENTS, BUSES = null> {

	private subscriptions: EventSubscriptions<HOST, EVENTS> = {};

	// @ts-ignore
	public constructor (private readonly host: HOST, private excevent?: Excevent<BUSES>) {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		const cls = (host as any).constructor as IHostClass<HOST, EVENTS>;
		for (const [event, property, priority] of cls[SYMBOL_OWN_SUBSCRIPTIONS] ?? []) {
			const subscriptions = EventSubscriptions.get(this.subscriptions, event);
			const subscribedReferences = EventSubscriptions.getPriority(subscriptions, priority).references;
			let subscribedInProperty = subscribedReferences[property];
			if (!subscribedInProperty)
				subscribedInProperty = subscribedReferences[property] = new Set();
			subscribedInProperty.add(host);
		}
	}

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

	public query<EVENT extends keyof EVENTS> (event: EVENT, ...args: EventParameters<EVENTS, EVENT>): IEventQueryBuilder<EVENTS, EVENT> {
		type Output = EventOutput<EVENTS, EVENT>;
		type EnsuredOutput = EventOutputEnsured<EVENTS, EVENT>;
		type Predicate = (output: EnsuredOutput) => any;
		const predicates: Predicate[] = [];

		return {
			where (predicate) {
				predicates.push(predicate);
				return this;
			},
			get: (predicate) => {
				const handlersByPriority = this.getHandlerLists(event);
				if (handlersByPriority.length === 0)
					return undefined;

				if (predicate)
					predicates.push(predicate);

				const api = this.createApi(event);

				let result: Output | undefined;
				PriorityMap.mapAll(handlersByPriority, (api, handlersByType) => {
					const mutableApi = (api as Mutable<typeof api>);

					NextHandler: for (const handler of handlersByType.handlers) {
						mutableApi.index++;
						const output = handler(api, ...args);
						if (output !== undefined && !api.disregard) {
							for (const predicate of predicates)
								if (!predicate(output as EnsuredOutput))
									continue NextHandler;

							api.break = true;
							result = output;
							return;
						}
					}

					for (const [property, subscribers] of Object.entries(handlersByType.references)) {
						NextSubscriber: for (const subscriber of subscribers) {
							mutableApi.index++;
							// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
							const output = subscriber[property](api, ...args);
							if (output !== undefined && !api.disregard) {
								for (const predicate of predicates)
									if (!predicate(output as EnsuredOutput))
										continue NextSubscriber;

								api.break = true;
								// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
								result = output;
								return;
							}
						}
					}

				}, api);

				return result;
			},
		};
	}

	public subscribe<EVENT extends EventList<EVENTS>> (events: EVENT, ...handlers: EventHandler<HOST, EVENTS, EventUnion<EVENTS, EVENT>>[]): HOST;
	public subscribe<EVENT extends EventList<EVENTS>> (events: EVENT, priority: number, ...handlers: EventHandler<HOST, EVENTS, EventUnion<EVENTS, EVENT>>[]): HOST;
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

		return this.host;
	}

	public unsubscribe<EVENT extends EventList<EVENTS>> (events: EVENT, ...handlers: EventHandler<HOST, EVENTS, EventUnion<EVENTS, EVENT>>[]): HOST;
	public unsubscribe<EVENT extends EventList<EVENTS>> (events: EVENT, priority: number, ...handlers: EventHandler<HOST, EVENTS, EventUnion<EVENTS, EVENT>>[]): HOST;
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

		return this.host;
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

	public until<EVENT extends EventList<EVENTS>> (event: EVENT, initializer: (subscriber: IUntilThisSubscriber<BUSES>) => any): HOST;
	public until<UNTIL_HOST extends (BUSES extends null ? never : EventBusOrHost<any>), UNTIL_EVENTS extends Events<UNTIL_HOST, BUSES>, EVENT extends EventList<UNTIL_EVENTS>> (host: UNTIL_HOST, event: EVENT, initializer: (subscriber: IUntilSubscriber<HOST, EVENTS>) => any): HOST;
	public until (host: any, event?: string | string[] | ((until: any) => any), initializer?: (until: any) => any) {
		if (typeof event === "function") {
			initializer = event;
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			event = host;
			host = undefined;

			const subscriber = this.excevent?.createSubscriber();

			const subscriptions: [host: any, event: string, priority: number, ...handlers: AnyFunction[]][] = [];
			const untilSubscriber: IUntilThisSubscriber<BUSES> = {
				subscribe: (host, event, priority, ...handlers) => {
					if (typeof priority !== "number") {
						if (priority !== undefined) {
							handlers.push(priority);
						}

						priority = 0;
					}

					if (typeof host === "object" && "event" in host) {
						subscriptions.push([host, event as string, priority, ...handlers]);
					} else {
						if (subscriber)
							subscriber.register(host, event, priority, ...handlers);
						else
							console.warn("Emitter", this, "has no reference to an Excevent instance, cannot use 'until' for event:", event, "on:", host);
					}

					return untilSubscriber;
				},
			};

			initializer(untilSubscriber);
			if (subscriptions.length > 0 || subscriber?.hasRegistrations()) {
				for (const [host, event, priority, ...handlers] of subscriptions) {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
					if ("event" in host && host.event instanceof EventEmitter) {
						// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
						host.event.subscribe(event, priority, ...handlers);
					}
				}

				const unsubscribe = (api: IEventApi<any, any, any>, _: any): any => {
					// unsubscribe
					for (const [host, event, priority, ...handlers] of subscriptions) {
						// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
						if ("event" in host && host.event instanceof EventEmitter) {
							// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
							host.event.unsubscribe(event, priority, ...handlers);
						}
					}

					subscriber?.unsubscribe();
					this.unsubscribe(event as EventList<EVENTS>, -Infinity, unsubscribe);
					api.disregard = true;
				};

				subscriber?.subscribe();
				this.subscribe(event as EventList<EVENTS>, -Infinity, unsubscribe);
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
			if (this.excevent === undefined) {
				console.warn("Emitter", this, "has no reference to an Excevent instance, cannot use 'until' for event:", event, "on:", host);
				return this;
			}

			for (const [event, priority, ...handlers] of subscriptions)
				this.subscribe(event as any, priority, ...handlers);

			const subscriber = this.excevent.createSubscriber()
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
				.register(host, event as EventList<EVENTS>, -Infinity, (api: IEventApi<any, any, any>, _: any): any => {
					// unsubscribe
					subscriber.unsubscribe();
					for (const [event, priority, ...handlers] of subscriptions)
						this.unsubscribe(event as any, priority, ...handlers);
					api.disregard = true;
				})
				.subscribe();
		}

		return this.host;
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

interface IEventHost<EVENTS, BUSES = null> {
	event: EventEmitter<this, EVENTS, BUSES>;
}

interface IEventHostClass<BUSES = null> {
	new <EVENTS>(): IEventHost<EVENTS, BUSES>;
}

export function EventHost<BUSES = null> (excevent?: Excevent<BUSES>): IEventHostClass<BUSES> {
	return class <EVENTS> {
		public readonly event = new EventEmitter<this, EVENTS, BUSES>(this, excevent);
	}
}

export namespace EventHost {
	export function Handler<HOST, EVENT extends keyof Events<HOST>> (host: Class<HOST>, event: EVENT, priority?: number): <HOST>(host: HOST, property2: string | number, descriptor: EVENT extends keyof Events<HOST> ? TypedPropertyDescriptorFunctionAnyNOfParams<EventHandler<HostInstance<HOST>, Events<HOST>, EVENT>> : never) => void;
	export function Handler<EVENT extends string> (event: EVENT, priority?: number): <HOST>(host: HOST, property2: string | number, descriptor: EVENT extends keyof Events<HOST> ? TypedPropertyDescriptorFunctionAnyNOfParams<EventHandler<HostInstance<HOST>, Events<HOST>, EVENT>> : never) => void;
	export function Handler<EVENT extends string> (host: any, event?: EVENT | number, priority?: number): <HOST>(host: HOST, property2: string | number, descriptor: EVENT extends keyof Events<HOST> ? TypedPropertyDescriptorFunctionAnyNOfParams<EventHandler<HostInstance<HOST>, Events<HOST>, EVENT>> : never) => void {
		if (typeof host === "string") {
			priority = event as number | undefined;
			event = host as EVENT;
		}

		priority ??= 0;

		return (subscriber: any, property: any, descriptor: TypedPropertyDescriptor<any>) => {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			const cls = subscriber.constructor as IHostClass<any, any>;
			let registeredOwnHandlers = cls[SYMBOL_OWN_SUBSCRIPTIONS];
			if (!registeredOwnHandlers || cls[SYMBOL_OWN_SET_CLASS] !== cls) {
				registeredOwnHandlers = cls[SYMBOL_OWN_SUBSCRIPTIONS] = [];
				cls[SYMBOL_OWN_SET_CLASS] = cls;
			}

			registeredOwnHandlers.push([event as EVENT, property, priority as number]);
		};
	}

	type WatchEventMethodKeys<T> = keyof { [P in keyof T as T[P] extends (value: any, property: string) => any ? P : T[P] extends (value: any) => any ? P : T[P] extends () => any ? P : never]: any };
	type KeysWhereValue<T, V> = keyof { [P in keyof T as T[P] extends V ? P : never]: any };
	type WatchedPropertyKeys<HOST, WATCH_EVENT> = Events<HOST> extends infer EVENTS ?
		EventParameters<EVENTS, Extract<WATCH_EVENT, keyof EVENTS>> extends infer PARAMS ? PARAMS extends any[] ?
		KeysWhereValue<HOST, PARAMS["length"] extends 0 ? any : PARAMS[0]>
		: never : never : never;

	const SYMBOL_PROPS_WATCHED = Symbol("WATCHED_PROP_STORE");
	interface IWatchedProto {
		[SYMBOL_PROPS_WATCHED]: Record<string, Set<string>>;
	}

	export function Emit<HOST, EVENT extends WatchEventMethodKeys<Events<HOST>>> (host: Class<HOST>, event: EVENT): <HOST>(host: HOST, property2: WatchedPropertyKeys<HOST, EVENT>) => void;
	export function Emit<EVENT extends string> (event: EVENT): <HOST>(host: HOST, property2: string | number) => void;
	export function Emit<EVENT extends string> (host: any, event?: EVENT): <HOST>(host: HOST, property2: string | number | symbol) => void {
		if (typeof host === "string")
			event = host as EVENT;

		return (proto: any, property: any) => {
			const watchedProto = proto as IWatchedProto;
			watchedProto[SYMBOL_PROPS_WATCHED] ??= {};
			const propStore = watchedProto[SYMBOL_PROPS_WATCHED];
			let events = propStore[property as string];
			if (!events) {
				events = propStore[property as string] = new Set();
				// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
				const symbol = Symbol(`WATCHED_PROP_STORE:${property}`);
				Object.defineProperty(proto, property, {
					get () {
						// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
						return this[symbol];
					},
					set (value: any) {
						// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
						this[symbol] = value;
						for (const event of events)
							// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
							this.event?.emit(event, value, property);
					},
				})
			}

			events.add(event!);
		};
	}
}

export interface IUntilSubscriber<HOST, EVENTS> {
	subscribe<EVENT extends EventList<EVENTS>> (events: EVENT, ...handlers: EventHandler<HOST, EVENTS, EventUnion<EVENTS, EVENT>>[]): this;
	subscribe<EVENT extends EventList<EVENTS>> (events: EVENT, priority: number, ...handlers: EventHandler<HOST, EVENTS, EventUnion<EVENTS, EVENT>>[]): this;
}

export interface IUntilThisSubscriber<BUSES> {
	subscribe<HOST, EVENTS extends Events<HOST, BUSES>, EVENT extends EventList<EVENTS>> (host: HOST, events: EVENT, ...handlers: EventHandler<HOST, EVENTS, EventUnion<EVENTS, EVENT>>[]): this;
	subscribe<HOST, EVENTS extends Events<HOST, BUSES>, EVENT extends EventList<EVENTS>> (host: HOST, events: EVENT, priority: number, ...handlers: EventHandler<HOST, EVENTS, EventUnion<EVENTS, EVENT>>[]): this;
}
