import { EventHandler, EventHostOrClass, Events, EventSubscriptionRegistrations, EventSubscriptions, IEventHostInternal, IEventSubscriber, SYMBOL_EVENT_BUS_SUBSCRIPTIONS, SYMBOL_SUBSCRIBER_INSTANCES, SYMBOL_SUBSCRIPTIONS, SYMBOL_SUBSCRIPTION_REGISTRATIONS } from "./IExcevent";

type AnyFunction = (...args: any[]) => any;
type Class<T> = { new(...args: any[]): T };
type EventBusOrHost<BUSES> = keyof BUSES | EventHostOrClass<Events<BUSES[keyof BUSES]>>;
type ResolveEvents<BUSES, ON extends EventBusOrHost<BUSES>> =
	ON extends keyof BUSES ? Events<BUSES[ON]> : Events<ON>;

interface IBus<BUSES, BUS extends keyof BUSES> {
	host?: IEventHostInternal<Events<BUSES[BUS]>>;
	subscriptions: EventSubscriptions<BUSES[BUS], Events<BUSES[BUS]>>;
}

function isEmpty (obj: any) {
	for (const _ in obj)
		return false;
	return true;
}

export default class Excevent<BUSES> {

	private buses: { [BUS in keyof BUSES]?: IBus<BUSES, BUS> } = {};

	public subscribe (instance: any) {
		if (!instance)
			return;

		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		const cls = instance.constructor as Class<any>;
		const subscriber = IEventSubscriber.getSubscriber(cls);
		if (subscriber[SYMBOL_SUBSCRIBER_INSTANCES]!.has(instance))
			return;

		subscriber[SYMBOL_SUBSCRIBER_INSTANCES]!.add(instance);

		type AllEvents = Events<BUSES[keyof BUSES]>;
		const subscriptions = IEventSubscriber.getRegisteredSubscriptions(cls);
		for (const subscriptionsByProperty of subscriptions) {
			for (const [property, subscriptionsByHost] of Object.entries(subscriptionsByProperty)) {
				for (const [host, subscriptions] of subscriptionsByHost as Map<EventBusOrHost<BUSES>, EventSubscriptionRegistrations<AllEvents>>) {
					let subscribeTo: EventSubscriptions<BUSES[keyof BUSES], AllEvents>;
					if (typeof host !== "object") {
						// event bus
						const bus = this.getBus(host as keyof BUSES);
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
	}

	public unsubscribe (instance: any) {
		if (!instance)
			return;

		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		const cls = instance.constructor as Class<any>;
		const subscriber = IEventSubscriber.getSubscriber(cls);
		if (subscriber[SYMBOL_SUBSCRIBER_INSTANCES]!.has(instance))
			return;

		subscriber[SYMBOL_SUBSCRIBER_INSTANCES]!.delete(instance);

		type AllEvents = Events<BUSES[keyof BUSES]>;
		const subscriptions = IEventSubscriber.getRegisteredSubscriptions(cls);
		for (const subscriptionsByProperty of subscriptions) {
			for (const [property, subscriptionsByHost] of Object.entries(subscriptionsByProperty)) {
				for (const [host, subscriptions] of subscriptionsByHost as Map<EventBusOrHost<BUSES>, EventSubscriptionRegistrations<AllEvents>>) {
					let subscribeTo: EventSubscriptions<BUSES[keyof BUSES], AllEvents>;
					if (typeof host !== "object") {
						// event bus
						const bus = this.getBus(host as keyof BUSES);
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

	public getEventHandlerDecorator () {

		function EventHandler<ON extends EventBusOrHost<BUSES>, EVENT extends keyof ResolveEvents<BUSES, ON>> (on: ON, event: EVENT, priority = 0): (host: any, property2: string | number, descriptor: TypedPropertyDescriptorFunctionAnyNOfParams<EventHandler<ON, ResolveEvents<BUSES, ON>, EVENT>>) => void {
			return <T extends { [key in P]: AnyFunction }, P extends string | number> (subscriberClass: T, property: P, descriptor: TypedPropertyDescriptor<any>) => {
				const subscriber = IEventSubscriber.getSubscriber(subscriberClass.constructor as Class<T>);
				const subscriptions = subscriber[SYMBOL_SUBSCRIPTION_REGISTRATIONS]!;
				let subscriptionsOfProperty = subscriptions[property as string];
				if (!subscriptionsOfProperty)
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					subscriptionsOfProperty = subscriptions[property as string] = new Map();

				let subscriptionsOfHost = subscriptionsOfProperty.get(on);
				if (!subscriptionsOfHost)
					subscriptionsOfProperty.set(on, subscriptionsOfHost = {});

				let priorities = subscriptionsOfHost[event];
				if (!priorities)
					priorities = subscriptionsOfHost[event] = new Set();

				priorities.add(priority);
			};
		}

		return EventHandler;
	}
}

type ReturnTypeLenient<F extends AnyFunction> =
	ReturnType<F> extends void ? Promise<void> : ReturnType<F>;

type TypedPropertyDescriptorFunctionAnyNOfParams<F extends AnyFunction> =
	FunctionAnyNOfParams<Parameters<F>, ReturnTypeLenient<F>, ReturnType<F>>;

type FunctionAnyNOfParams<PARAMS extends any[], RETURN_LENIENT, RETURN> =
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