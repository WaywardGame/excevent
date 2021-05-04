import EventEmitter from "./Emitter";
import PriorityMap, { IPriorityListMapApi } from "./PriorityMap";

export type AnyFunction = (...args: any[]) => any;
export type Class<T> = Function & { prototype: T };

export type EventDefinition<EVENTS, EVENT extends keyof EVENTS> = Extract<EVENTS[EVENT], (...args: any[]) => any>;
export type EventParameters<EVENTS, EVENT extends keyof EVENTS = keyof EVENTS> = Parameters<EventDefinition<EVENTS, EVENT>>;
export type EventReturn<EVENTS, EVENT extends keyof EVENTS = keyof EVENTS> = ReturnType<EventDefinition<EVENTS, EVENT>>;
export type EventHandler<HOST, EVENTS, EVENT extends keyof EVENTS = keyof EVENTS> = (api: IEventApi<HOST, EVENTS, EVENT>, ...parameters: EventParameters<EVENTS, EVENT>) => EventReturn<EVENTS, EVENT>;
export type EventHandlerReference<HOST, EVENTS, EVENT extends keyof EVENTS = keyof EVENTS, SUBSCRIBER extends { [key in HANDLER]: EventHandler<HOST, EVENTS, EVENT> } = any, HANDLER extends keyof SUBSCRIBER = keyof SUBSCRIBER> = { [key in HANDLER]: Set<SUBSCRIBER> };

export interface IEventHandlersByType<HOST, EVENTS, EVENT extends keyof EVENTS = keyof EVENTS> {
	handlers: Set<EventHandler<HOST, EVENTS, EVENT>>;
	references: EventHandlerReference<HOST, EVENTS, EVENT>;
}

export type EventHandlersByPriority<HOST, EVENTS, EVENT extends keyof EVENTS = keyof EVENTS> = PriorityMap<IEventHandlersByType<HOST, EVENTS, EVENT>>;
export type EventList<EVENTS> = (keyof EVENTS) | (keyof EVENTS)[];
export type EventUnion<EVENTS, EVENT extends EventList<EVENTS>> = EVENT extends any[] ? EVENT[number] : EVENT;

export type EventSubscriptions<HOST, EVENTS> = { [EVENT in keyof EVENTS]?: EventHandlersByPriority<HOST, EVENTS, EVENT> };

export namespace EventSubscriptions {
	export function get<HOST, EVENTS, EVENT extends keyof EVENTS> (subscriptions: EventSubscriptions<HOST, EVENTS>, event: EVENT): EventHandlersByPriority<HOST, EVENTS, EventUnion<EVENTS, EVENT>>;
	export function get<HOST, EVENTS, EVENT extends keyof EVENTS> (subscriptions: EventSubscriptions<HOST, EVENTS>, event: EVENT, create: false): EventHandlersByPriority<HOST, EVENTS, EventUnion<EVENTS, EVENT>> | undefined;
	export function get (subscriptions: EventSubscriptions<any, any>, event: any, create = true) {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		let subscriptionsByEvent = subscriptions[event];
		if (!subscriptionsByEvent && create)
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
			subscriptionsByEvent = subscriptions[event] = new PriorityMap();

		return subscriptionsByEvent;
	}

	export function getPriority<HOST, EVENTS, EVENT extends keyof EVENTS> (handlers: EventHandlersByPriority<HOST, EVENTS, EventUnion<EVENTS, EVENT>>, priority: number) {
		let result = handlers.get(priority);
		if (result)
			return result;

		handlers.set(result = {
			handlers: new Set(),
			references: {},
		}, priority);

		return result;
	}
}

export interface IEventApi<HOST, EVENTS = Events<HOST>, EVENT extends keyof EVENTS = keyof EVENTS> extends IPriorityListMapApi {
	readonly host: HOST;
	readonly event: EVENT;
	readonly index: number;
	/**
	 * Whether the event should stop executing handlers after this handler
	 */
	break: boolean;
	/**
	 * Whether the return of this event handler should be disregarded in the event's results
	 */
	disregard: boolean;
}

export const SYMBOL_SUBSCRIPTIONS = Symbol("EXCEVENT_SUBSCRIPTIONS");
export const SYMBOL_SUBSCRIPTIONS_SET_CLASS = Symbol("EXCEVENT_SUBSCRIPTIONS_SET_CLASS");
export const SYMBOL_EVENT_BUS_SUBSCRIPTIONS = Symbol("EXCEVENT_EVENT_BUS_SUBSCRIPTIONS");

export interface IEventHost<EVENTS> {
	event: EventEmitter<this, EVENTS>;
}

export type EventHostOrClass<EVENTS> = IEventHost<EVENTS> | Class<IEventHost<EVENTS>>;
type EventsOfHostOrClass<HOST> = HOST extends EventHostOrClass<infer EVENTS> ? EVENTS : never;
export type EventBusOrHost<BUSES> = keyof BUSES | EventHostOrClass<EventsOfHostOrClass<BUSES[keyof BUSES]>>;
export type Host<HOST, BUSES = null> =
	HOST extends keyof BUSES ? BUSES[HOST] : HOST;
export type Events<HOST, BUSES = null> =
	EventsOfHostOrClass<Host<HOST, BUSES>>;
export type HostInstance<HOST> = HOST extends Class<infer INSTANCE> ? INSTANCE : HOST;

export interface IEventHostInternal<EVENTS> {
	[SYMBOL_SUBSCRIPTIONS]: EventSubscriptions<any, EVENTS>;
	[SYMBOL_SUBSCRIPTIONS_SET_CLASS]: any;
	[SYMBOL_EVENT_BUS_SUBSCRIPTIONS]: Record<string | number, EventSubscriptions<any, EVENTS>>;
}

export namespace IEventHostInternal {

	export function getSubscriptions<EVENTS> (host: any): EventSubscriptions<any, EVENTS>[] {
		const h = getHost<EVENTS>(host);
		const subscriptions = [h[SYMBOL_SUBSCRIPTIONS], ...Object.values(h[SYMBOL_EVENT_BUS_SUBSCRIPTIONS]!)];
		if ("event" in host)
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			return [...subscriptions, ...getSubscriptions(host.constructor)];
		return subscriptions;
	}

	export function getHost<EVENTS> (host: any) {
		const h = host as IEventHostInternal<EVENTS>;
		if (h && h[SYMBOL_SUBSCRIPTIONS_SET_CLASS] !== h) {
			h[SYMBOL_SUBSCRIPTIONS] = {};
			h[SYMBOL_SUBSCRIPTIONS_SET_CLASS] = h;
			h[SYMBOL_EVENT_BUS_SUBSCRIPTIONS] = {};
		}

		return h;
	}
}

export const SYMBOL_SUBSCRIPTION_PROPERTY_REGISTRATIONS = Symbol("EXCEVENT_SUBSCRIBER_SUBSCRIPTION_PROPERTY_REGISTRATIONS");
export const SYMBOL_SUBSCRIPTION_REGISTRATIONS = Symbol("EXCEVENT_SUBSCRIBER_SUBSCRIPTION_REGISTRATIONS");
export const SYMBOL_SUBSCRIBER_SET_CLASS = Symbol("EXCEVENT_SUBSCRIBER_SET_CLASS");
export const SYMBOL_SUBSCRIBER_INSTANCES = Symbol("EXCEVENT_SUBSCRIBER_INSTANCES");

export type EventSubscriptionRegistrations<EVENTS> = { [EVENT in keyof EVENTS]?: Set<number> };
export type EventSubscriptionRegistrationsByHost = Map<any, EventSubscriptionRegistrations<any>>;
export type EventSubscriptionRegistrationsByProperty = Record<string, EventSubscriptionRegistrationsByHost>;
export type EventSubscriptionHandlerRegistrations = Map<any, EventSubscriptions<any, any>>;

export interface IEventSubscriber {
	[SYMBOL_SUBSCRIPTION_PROPERTY_REGISTRATIONS]?: EventSubscriptionRegistrationsByProperty;
	[SYMBOL_SUBSCRIPTION_REGISTRATIONS]?: EventSubscriptionHandlerRegistrations;
	[SYMBOL_SUBSCRIBER_SET_CLASS]?: any;
	[SYMBOL_SUBSCRIBER_INSTANCES]?: Set<any>;
}

export namespace IEventSubscriber {
	export function getRegisteredPropertySubscriptions (cls: any): EventSubscriptionRegistrationsByProperty[] {
		if (!cls)
			return [];

		const s = cls as IEventSubscriber;

		const subscriptions = s[SYMBOL_SUBSCRIPTION_PROPERTY_REGISTRATIONS];
		const result = subscriptions === undefined ? [] : [subscriptions];
		if (typeof cls === "function")
			result.push(...getRegisteredPropertySubscriptions(Object.getPrototypeOf(cls)));

		return result;
	}

	export function getRegisteredSubscriptions (cls: any): EventSubscriptionHandlerRegistrations[] {
		if (!cls)
			return [];

		const s = cls as IEventSubscriber;

		const subscriptions = s[SYMBOL_SUBSCRIPTION_REGISTRATIONS];
		const result = subscriptions === undefined ? [] : [subscriptions];
		if (typeof cls === "function")
			result.push(...getRegisteredSubscriptions(Object.getPrototypeOf(cls)));

		return result;
	}

	export function getSubscriber (subscriber: any) {
		const s = subscriber as IEventSubscriber;
		if (s) {
			if (typeof subscriber === "function") {
				if (s[SYMBOL_SUBSCRIBER_SET_CLASS] !== s) {
					s[SYMBOL_SUBSCRIPTION_PROPERTY_REGISTRATIONS] = {};
					s[SYMBOL_SUBSCRIPTION_REGISTRATIONS] = new Map();
					s[SYMBOL_SUBSCRIBER_SET_CLASS] = s;
					s[SYMBOL_SUBSCRIBER_INSTANCES] = new Set();
				}

			} else {
				s[SYMBOL_SUBSCRIPTION_PROPERTY_REGISTRATIONS] ??= {};
				s[SYMBOL_SUBSCRIPTION_REGISTRATIONS] ??= new Map();
			}
		}

		return s;
	}

	export function addInstance (subscriber: IEventSubscriber, instance: any) {
		const instances = subscriber[SYMBOL_SUBSCRIBER_INSTANCES];
		if (instances) {
			if (instances.has(instance))
				return false;

			instances.add(instance);
		}

		if (typeof subscriber === "function")
			addInstance(Object.getPrototypeOf(subscriber), instance);

		return true;
	}

	export function removeInstance (subscriber: IEventSubscriber, instance: any) {
		const instances = subscriber[SYMBOL_SUBSCRIBER_INSTANCES]
		if (instances) {
			if (!instances.has(instance))
				return false;

			instances.delete(instance);
		}

		if (typeof subscriber === "function")
			removeInstance(Object.getPrototypeOf(subscriber), instance);

		return true;
	}
}


export type ReturnTypeLenient<F extends AnyFunction> =
	ReturnType<F> extends void ? Promise<void> : ReturnType<F>;

export type TypedPropertyDescriptorFunctionAnyNOfParams<F extends AnyFunction> =
	FunctionAnyNOfParams<Parameters<F>, ReturnTypeLenient<F>, ReturnType<F>>;

export type FunctionAnyNOfParams<PARAMS extends any[], RETURN_LENIENT, RETURN> =
	TypedPropertyDescriptor<(...args: PARAMS) => RETURN_LENIENT> |
	TypedPropertyDescriptor<(a0: PARAMS[0], a1: PARAMS[1], a2: PARAMS[2], a3: PARAMS[3], a4: PARAMS[4], a5: PARAMS[5], a6: PARAMS[6], a7: PARAMS[7], a8: PARAMS[8], a9: PARAMS[9]) => RETURN_LENIENT> |
	TypedPropertyDescriptor<(a0: PARAMS[0], a1: PARAMS[1], a2: PARAMS[2], a3: PARAMS[3], a4: PARAMS[4], a5: PARAMS[5], a6: PARAMS[6], a7: PARAMS[7], a8: PARAMS[8]) => RETURN_LENIENT> |
	TypedPropertyDescriptor<(a0: PARAMS[0], a1: PARAMS[1], a2: PARAMS[2], a3: PARAMS[3], a4: PARAMS[4], a5: PARAMS[5], a6: PARAMS[6], a7: PARAMS[7]) => RETURN_LENIENT> |
	TypedPropertyDescriptor<(a0: PARAMS[0], a1: PARAMS[1], a2: PARAMS[2], a3: PARAMS[3], a4: PARAMS[4], a5: PARAMS[5], a6: PARAMS[6]) => RETURN_LENIENT> |
	TypedPropertyDescriptor<(a0: PARAMS[0], a1: PARAMS[1], a2: PARAMS[2], a3: PARAMS[3], a4: PARAMS[4], a5: PARAMS[5]) => RETURN_LENIENT> |
	TypedPropertyDescriptor<(a0: PARAMS[0], a1: PARAMS[1], a2: PARAMS[2], a3: PARAMS[3], a4: PARAMS[4]) => RETURN_LENIENT> |
	TypedPropertyDescriptor<(a0: PARAMS[0], a1: PARAMS[1], a2: PARAMS[2], a3: PARAMS[3]) => RETURN_LENIENT> |
	TypedPropertyDescriptor<(a0: PARAMS[0], a1: PARAMS[1], a2: PARAMS[2]) => RETURN_LENIENT> |
	TypedPropertyDescriptor<(a0: PARAMS[0], a1: PARAMS[1]) => RETURN_LENIENT> |
	TypedPropertyDescriptor<(a0: PARAMS[0]) => RETURN_LENIENT> |
	TypedPropertyDescriptor<() => RETURN_LENIENT> |
	TypedPropertyDescriptor<(...args: PARAMS) => RETURN> |
	TypedPropertyDescriptor<(a0: PARAMS[0], a1: PARAMS[1], a2: PARAMS[2], a3: PARAMS[3], a4: PARAMS[4], a5: PARAMS[5], a6: PARAMS[6], a7: PARAMS[7], a8: PARAMS[8], a9: PARAMS[9]) => RETURN> |
	TypedPropertyDescriptor<(a0: PARAMS[0], a1: PARAMS[1], a2: PARAMS[2], a3: PARAMS[3], a4: PARAMS[4], a5: PARAMS[5], a6: PARAMS[6], a7: PARAMS[7], a8: PARAMS[8]) => RETURN> |
	TypedPropertyDescriptor<(a0: PARAMS[0], a1: PARAMS[1], a2: PARAMS[2], a3: PARAMS[3], a4: PARAMS[4], a5: PARAMS[5], a6: PARAMS[6], a7: PARAMS[7]) => RETURN> |
	TypedPropertyDescriptor<(a0: PARAMS[0], a1: PARAMS[1], a2: PARAMS[2], a3: PARAMS[3], a4: PARAMS[4], a5: PARAMS[5], a6: PARAMS[6]) => RETURN> |
	TypedPropertyDescriptor<(a0: PARAMS[0], a1: PARAMS[1], a2: PARAMS[2], a3: PARAMS[3], a4: PARAMS[4], a5: PARAMS[5]) => RETURN> |
	TypedPropertyDescriptor<(a0: PARAMS[0], a1: PARAMS[1], a2: PARAMS[2], a3: PARAMS[3], a4: PARAMS[4]) => RETURN> |
	TypedPropertyDescriptor<(a0: PARAMS[0], a1: PARAMS[1], a2: PARAMS[2], a3: PARAMS[3]) => RETURN> |
	TypedPropertyDescriptor<(a0: PARAMS[0], a1: PARAMS[1], a2: PARAMS[2]) => RETURN> |
	TypedPropertyDescriptor<(a0: PARAMS[0], a1: PARAMS[1]) => RETURN> |
	TypedPropertyDescriptor<(a0: PARAMS[0]) => RETURN> |
	TypedPropertyDescriptor<() => RETURN>;
