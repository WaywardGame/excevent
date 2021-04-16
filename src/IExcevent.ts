import EventEmitter from "./Emitter";
import PriorityList, { IPriorityListMapApi } from "./PriorityList";

export type EventDefinition<EVENTS, EVENT extends keyof EVENTS> = Extract<EVENTS[EVENT], (...args: any[]) => any>;
export type EventParameters<EVENTS, EVENT extends keyof EVENTS = keyof EVENTS> = Parameters<EventDefinition<EVENTS, EVENT>>;
export type EventReturn<EVENTS, EVENT extends keyof EVENTS = keyof EVENTS> = ReturnType<EventDefinition<EVENTS, EVENT>>;
export type EventHandler<HOST, EVENTS, EVENT extends keyof EVENTS = keyof EVENTS> = (api: IEventApi<HOST, EVENTS, EVENT>, ...parameters: EventParameters<EVENTS, EVENT>) => EventReturn<EVENTS, EVENT>;
export type EventHandlerList<HOST, EVENTS, EVENT extends keyof EVENTS = keyof EVENTS> = PriorityList<EventHandler<HOST, EVENTS, EVENT>>;
export type EventList<EVENTS> = (keyof EVENTS) | (keyof EVENTS)[];
export type EventUnion<EVENTS, EVENT extends EventList<EVENTS>> = EVENT extends any[] ? EVENT[number] : EVENT;

export type EventSubscriptions<HOST, EVENTS> = { [EVENT in keyof EVENTS]?: EventHandlerList<HOST, EVENTS, EVENT> };
export type EventSubscriptionRegistrations<EVENTS> = { [EVENT in keyof EVENTS]?: PriorityList<string> };
export namespace EventSubscriptions {
	export function get<HOST, EVENTS, EVENT extends keyof EVENTS> (subscriptions: EventSubscriptions<HOST, EVENTS>, event: EVENT, create?: false): EventHandlerList<HOST, EVENTS, EventUnion<EVENTS, EVENT>>;
	export function get<HOST, EVENTS, EVENT extends keyof EVENTS> (subscriptions: EventSubscriptionRegistrations<EVENTS>, event: EVENT, create?: false): PriorityList<string>;
	export function get (subscriptions: EventSubscriptions<any, any> | EventSubscriptionRegistrations<any>, event: any, create = true) {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		let subscriptionsByEvent = subscriptions[event];
		if (!subscriptionsByEvent && create)
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
			subscriptionsByEvent = subscriptions[event] = new PriorityList() as any;

		return subscriptionsByEvent;
	}
}

export interface IEventApi<HOST, EVENTS, EVENT extends keyof EVENTS> extends IPriorityListMapApi {
	readonly host: HOST;
	readonly event: EVENT;
	readonly index: number;
	break: boolean;
}

export const SYMBOL_SUBSCRIPTIONS = Symbol("EXCEVENT_SUBSCRIPTIONS");
export const SYMBOL_SUBSCRIPTIONS_SET_CLASS = Symbol("EXCEVENT_SUBSCRIPTIONS_SET_CLASS");
export const SYMBOL_EVENT_BUS_SUBSCRIPTIONS = Symbol("EXCEVENT_EVENT_BUS_SUBSCRIPTIONS");

export interface IEventHost<EVENTS> {
	event: EventEmitter<this, EVENTS>;
}

type Class<T> = { new(...args: any[]): T };
export type EventHostOrClass<EVENTS> = IEventHost<EVENTS> | Class<IEventHost<EVENTS>>;
export type Events<HOST> = HOST extends EventHostOrClass<infer EVENTS> ? EVENTS : never;

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
		if (h[SYMBOL_SUBSCRIPTIONS_SET_CLASS] !== h) {
			h[SYMBOL_SUBSCRIPTIONS] = {};
			h[SYMBOL_SUBSCRIPTIONS_SET_CLASS] = h;
			h[SYMBOL_EVENT_BUS_SUBSCRIPTIONS] = {};
		}

		return h;
	}
}

export const SYMBOL_SUBSCRIPTION_REGISTRATIONS = Symbol("EVENT_SUBSCRIBER_SUBSCRIPTIONS");
export const SYMBOL_SUBSCRIBER_SET_CLASS = Symbol("EVENT_SUBSCRIBER_SET_CLASS");

export type EventSubscriptionRegistrationsByHost = Map<any, EventSubscriptionRegistrations<any>>;
export type EventSubscriptionRegistrationsByProperty = Record<string, EventSubscriptionRegistrationsByHost>;

export interface IEventSubscriber {
	[SYMBOL_SUBSCRIPTION_REGISTRATIONS]?: EventSubscriptionRegistrationsByProperty;
	[SYMBOL_SUBSCRIBER_SET_CLASS]?: any;
}

export namespace IEventSubscriber {
	export function getSubscriptions (cls: Class<any>): EventSubscriptionRegistrationsByProperty[] {
		const s = getSubscriber(cls);
		return [s[SYMBOL_SUBSCRIPTION_REGISTRATIONS]!, ...getSubscriptions(Object.getPrototypeOf(cls))];
	}

	export function getSubscriber (subscriber: any) {
		const s = subscriber as IEventSubscriber;
		if (s[SYMBOL_SUBSCRIBER_SET_CLASS] !== s) {
			s[SYMBOL_SUBSCRIPTION_REGISTRATIONS] = {};
			s[SYMBOL_SUBSCRIBER_SET_CLASS] = s;
		}

		return s;
	}
}
