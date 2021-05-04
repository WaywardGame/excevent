import { AnyFunction, Class, EventBusOrHost, EventHandler, EventList, Events, EventSubscriptionRegistrations, EventSubscriptions, EventUnion, Host, HostInstance, IEventHostInternal, IEventSubscriber, SYMBOL_EVENT_BUS_SUBSCRIPTIONS, SYMBOL_SUBSCRIPTIONS, SYMBOL_SUBSCRIPTION_PROPERTY_REGISTRATIONS, SYMBOL_SUBSCRIPTION_REGISTRATIONS, TypedPropertyDescriptorFunctionAnyNOfParams } from "./IExcevent";
import PriorityMap from "./PriorityMap";

interface IBus<BUSES, BUS extends keyof BUSES> {
	host?: IEventHostInternal<Events<BUSES[BUS]>>;
	subscriptions: EventSubscriptions<BUSES[BUS], Events<BUSES[BUS]>>;
}

function isEmpty (obj: any) {
	for (const _ in obj)
		return false;
	return true;
}

export class GlobalEventSubscriber<BUSES> {

	public constructor (private readonly excevent: Excevent<BUSES>) { }

	public hasRegistrations () {
		const subscriber = IEventSubscriber.getSubscriber(this);
		const subscriptions = subscriber[SYMBOL_SUBSCRIPTION_REGISTRATIONS]!;
		return subscriptions.size > 0;
	}

	public register<HOST, EVENTS extends Events<HOST, BUSES>, EVENT extends EventList<EVENTS>> (host: HOST, events: EVENT, ...handlers: EventHandler<HOST, EVENTS, EventUnion<EVENTS, EVENT>>[]): this;
	public register<HOST, EVENTS extends Events<HOST, BUSES>, EVENT extends EventList<EVENTS>> (host: HOST, events: EVENT, priority: number, ...handlers: EventHandler<HOST, EVENTS, EventUnion<EVENTS, EVENT>>[]): this;
	public register (host: any, events: string | string[], priority: number | AnyFunction, ...handlers: AnyFunction[]) {
		if (typeof priority !== "number") {
			if (priority !== undefined) {
				handlers.push(priority);
			}

			priority = 0;
		}

		for (const event of Array.isArray(events) ? events : [events])
			for (const handler of handlers)
				registerHandler(this, handler, host, event, priority);

		return this;
	}

	public subscribe () {
		this.excevent.subscribe(this);
		return this;
	}

	public unsubscribe () {
		this.excevent.unsubscribe(this);
		return this;
	}
}

export default class Excevent<BUSES> {

	private buses: { [BUS in keyof BUSES]?: IBus<BUSES, BUS> } = {};

	public createSubscriber (): GlobalEventSubscriber<BUSES> {
		return new GlobalEventSubscriber(this);
	}

	public subscribe (instance: any) {
		if (!instance)
			return;

		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		const cls = instance instanceof GlobalEventSubscriber ? instance : instance.constructor as Class<any>;
		const subscriber = IEventSubscriber.getSubscriber(cls);
		if (!IEventSubscriber.addInstance(subscriber, instance))
			return;

		type AllEvents = Events<BUSES[keyof BUSES]>;
		const subscriptions = IEventSubscriber.getRegisteredPropertySubscriptions(cls);
		for (const subscriptionsByProperty of subscriptions) {
			for (const [property, subscriptionsByHost] of Object.entries(subscriptionsByProperty)) {
				for (const [host, subscriptions] of subscriptionsByHost as Map<EventBusOrHost<BUSES>, EventSubscriptionRegistrations<AllEvents>>) {
					let subscribeTo: EventSubscriptions<BUSES[keyof BUSES], AllEvents>;
					if (typeof host !== "object" && typeof host !== "function") {
						// event bus
						const bus = this.getBus(host);
						subscribeTo = bus.subscriptions;

					} else {
						// host class or host
						const hostInternal = IEventHostInternal.getHost<AllEvents>(host);
						subscribeTo = hostInternal[SYMBOL_SUBSCRIPTIONS];
					}

					for (const [event, priorities] of Object.entries<Set<number> | undefined>(subscriptions)) {
						for (const priority of priorities!) {
							const subscriptions = EventSubscriptions.get(subscribeTo, event as keyof AllEvents);
							const subscribedReferences = EventSubscriptions.getPriority(subscriptions, +priority).references;
							let subscribedInProperty = subscribedReferences[property];
							if (!subscribedInProperty)
								subscribedInProperty = subscribedReferences[property] = new Set();
							subscribedInProperty.add(instance);
						}
					}
				}
			}
		}

		const handlerSubscriptions = IEventSubscriber.getRegisteredSubscriptions(cls);
		for (const subscriptionsByHost of handlerSubscriptions) {
			for (const [host, subscriptions] of subscriptionsByHost) {
				let subscribeTo: EventSubscriptions<BUSES[keyof BUSES], AllEvents>;
				if (typeof host !== "object" && typeof host !== "function") {
					// event bus
					const bus = this.getBus(host);
					subscribeTo = bus.subscriptions;

				} else {
					// host class or host
					const hostInternal = IEventHostInternal.getHost<AllEvents>(host);
					subscribeTo = hostInternal[SYMBOL_SUBSCRIPTIONS];
				}

				for (const [event, handlersByPriority] of Object.entries(subscriptions)) {
					for (const priority of handlersByPriority!.getPriorities()) {
						for (const handler of handlersByPriority!.get(priority)?.handlers ?? []) {
							const subscriptions = EventSubscriptions.get(subscribeTo, event as keyof AllEvents);
							const subscribedHandlers = EventSubscriptions.getPriority(subscriptions, +priority).handlers;
							subscribedHandlers.add(handler as any);
						}
					}
				}
			}
		}
	}

	public unsubscribe (instance: any) {
		if (!instance)
			return;

		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		const cls = instance instanceof GlobalEventSubscriber ? instance : instance.constructor as Class<any>;
		const subscriber = IEventSubscriber.getSubscriber(cls);
		if (!IEventSubscriber.removeInstance(subscriber, instance))
			return;

		type AllEvents = Events<BUSES[keyof BUSES]>;
		const subscriptions = IEventSubscriber.getRegisteredPropertySubscriptions(cls);
		for (const subscriptionsByProperty of subscriptions) {
			for (const [property, subscriptionsByHost] of Object.entries(subscriptionsByProperty)) {
				for (const [host, subscriptions] of subscriptionsByHost as Map<EventBusOrHost<BUSES>, EventSubscriptionRegistrations<AllEvents>>) {
					let subscribeTo: EventSubscriptions<BUSES[keyof BUSES], AllEvents>;
					if (typeof host !== "object" && typeof host !== "function") {
						// event bus
						const bus = this.getBus(host);
						subscribeTo = bus.subscriptions;

					} else {
						// host class or host
						const hostInternal = IEventHostInternal.getHost<AllEvents>(host);
						subscribeTo = hostInternal[SYMBOL_SUBSCRIPTIONS];
					}

					for (const [event, priorities] of Object.entries<Set<number> | undefined>(subscriptions)) {
						for (const priority of priorities!) {
							const subscriptionsByPriority = EventSubscriptions.get(subscribeTo, event as keyof AllEvents, false);
							const subscribed = subscriptionsByPriority?.get(+priority);
							const subscribedReferences = subscribed?.references;
							const subscribedInProperty = subscribedReferences?.[property];
							if (subscribedInProperty) {
								subscribedInProperty.delete(instance);

								if (subscribedInProperty.size === 0) {
									delete subscribedReferences![property];
									if (isEmpty(subscribedReferences)) {
										if (subscribed!.handlers.size === 0) {
											subscriptionsByPriority!.remove(+priority);
											if (!subscriptionsByPriority!.hasAny()) {
												delete subscribeTo[event as keyof AllEvents];
											}
										}
									}
								}
							}
						}
					}
				}
			}
		}

		const handlerSubscriptions = IEventSubscriber.getRegisteredSubscriptions(cls);
		for (const subscriptionsByHost of handlerSubscriptions) {
			for (const [host, subscriptions] of subscriptionsByHost) {
				let subscribeTo: EventSubscriptions<BUSES[keyof BUSES], AllEvents>;
				if (typeof host !== "object" && typeof host !== "function") {
					// event bus
					const bus = this.getBus(host);
					subscribeTo = bus.subscriptions;

				} else {
					// host class or host
					const hostInternal = IEventHostInternal.getHost<AllEvents>(host);
					subscribeTo = hostInternal[SYMBOL_SUBSCRIPTIONS];
				}

				for (const [event, handlersByPriority] of Object.entries(subscriptions)) {
					for (const priority of handlersByPriority!.getPriorities()) {
						for (const handler of handlersByPriority!.get(priority)?.handlers ?? []) {
							const subscriptions = EventSubscriptions.get(subscribeTo, event as keyof AllEvents);
							const subscribedByType = subscriptions.get(+priority);
							const subscribedHandlers = subscribedByType?.handlers;
							subscribedHandlers?.delete(handler as any);
							if (subscribedHandlers?.size === 0 && isEmpty(subscribedByType!.references)) {
								subscriptions.remove(+priority);
							}
						}
					}
				}
			}
		}
	}

	public registerBus<BUS extends keyof BUSES> (bus: BUS, host: BUSES[BUS]) {
		this.deregisterBus(bus);

		const h = IEventHostInternal.getHost<Events<BUSES[BUS]>>(host);
		const registeredBus = this.getBus(bus);

		// the class needs to know that it's been assigned as this event bus
		h[SYMBOL_EVENT_BUS_SUBSCRIPTIONS][bus as string | number] = registeredBus.subscriptions;
	}

	private getBus<BUS extends keyof BUSES> (bus: BUS): IBus<BUSES, BUS> {
		let registeredBus = this.buses[bus];
		if (!registeredBus)
			registeredBus = this.buses[bus] = { subscriptions: {} };

		return registeredBus;
	}

	public deregisterBus<BUS extends keyof BUSES> (bus: BUS) {
		const registeredBus = this.buses[bus];
		if (!registeredBus)
			return;

		delete registeredBus.host?.[SYMBOL_EVENT_BUS_SUBSCRIPTIONS][bus as string | number];
	}

	/**
	 * A decorator for event handler methods
	 * @param on What event source to subscribe to
	 * @param event The event to subscribe to
	 * @param priority The priority of this handler compared to other handlers of the same event
	 */
	public Handler<ON extends EventBusOrHost<BUSES>, EVENT extends keyof Events<ON, BUSES>> (on: ON, event: EVENT, priority = 0): (host: any, property2: string | number, descriptor: TypedPropertyDescriptorFunctionAnyNOfParams<EventHandler<HostInstance<Host<ON, BUSES>>, Events<ON, BUSES>>>) => void {
		return <T extends { [key in P]: AnyFunction }, P extends string | number> (subscriberClass: T, property: P, descriptor: TypedPropertyDescriptor<any>) => {
			registerHandlerProperty(subscriberClass.constructor, property as string, on, event as string, priority);
		};
	}

	/**
	 * A decorator for classes that should emit events to an event bus
	 * @param bus The bus to emit events to
	 */
	public Bus<BUS extends keyof BUSES> (bus: BUS) {
		return (constructor: BUSES[BUS] extends Class<any> ? BUSES[BUS] : never) => {
			this.registerBus(bus, constructor);
		};
	}

	/**
	 * A decorator for classes that should automatically subscribe any registered event handlers in their instances
	 */
	public Subscribe = <CLASS extends Class<any>> (constructor: CLASS) => {
		// eslint-disable-next-line @typescript-eslint/no-this-alias
		const excevent = this;
		return class extends (constructor as any as { new(...args: any[]): any }) {
			constructor (...args: any[]) {
				super(...args);
				excevent.subscribe(this);
			}
		} as any as CLASS;
	}
}

function registerHandlerProperty (_subscriber: any, property: string, on: any, event: string, priority: number) {
	const subscriber = IEventSubscriber.getSubscriber(_subscriber);
	const subscriptions = subscriber[SYMBOL_SUBSCRIPTION_PROPERTY_REGISTRATIONS]!;
	let subscriptionsOfProperty = subscriptions[property];
	if (!subscriptionsOfProperty)
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		subscriptionsOfProperty = subscriptions[property] = new Map();

	let subscriptionsOfHost = subscriptionsOfProperty.get(on);
	if (!subscriptionsOfHost)
		subscriptionsOfProperty.set(on, subscriptionsOfHost = {});

	let priorities = subscriptionsOfHost[event];
	if (!priorities)
		priorities = subscriptionsOfHost[event] = new Set();

	priorities.add(priority);
}

function registerHandler (_subscriber: any, handler: AnyFunction, on: any, event: string, priority: number) {
	const subscriber = IEventSubscriber.getSubscriber(_subscriber);
	const subscriptions = subscriber[SYMBOL_SUBSCRIPTION_REGISTRATIONS]!;

	let subscriptionsOfHost = subscriptions.get(on);
	if (!subscriptionsOfHost)
		subscriptions.set(on, subscriptionsOfHost = {});

	let subscriptionsByPriority = subscriptionsOfHost[event];
	if (!subscriptionsByPriority)
		subscriptionsByPriority = subscriptionsOfHost[event] = new PriorityMap();

	EventSubscriptions.getPriority(subscriptionsByPriority, priority)
		.handlers.add(handler);
}