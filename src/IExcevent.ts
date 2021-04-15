import EventEmitter from "./Emitter";
import PriorityList, { IPriorityListMapApi } from "./PriorityList";

export type EventDefinition<EVENTS, EVENT extends keyof EVENTS> = Extract<EVENTS[EVENT], (...args: any[]) => any>;
export type EventParameters<EVENTS, EVENT extends keyof EVENTS = keyof EVENTS> = Parameters<EventDefinition<EVENTS, EVENT>>;
export type EventReturn<EVENTS, EVENT extends keyof EVENTS = keyof EVENTS> = ReturnType<EventDefinition<EVENTS, EVENT>>;
export type EventHandler<HOST, EVENTS, EVENT extends keyof EVENTS = keyof EVENTS> = (api: IEventApi<HOST, EVENTS, EVENT>, ...parameters: EventParameters<EVENTS, EVENT>) => EventReturn<EVENTS, EVENT>;
export type EventHandlerList<HOST, EVENTS, EVENT extends keyof EVENTS = keyof EVENTS> = PriorityList<EventHandler<HOST, EVENTS, EVENT>>;
export type EventSubscriptions<HOST, EVENTS> = { [EVENT in keyof EVENTS]?: EventHandlerList<HOST, EVENTS, EVENT> };

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
