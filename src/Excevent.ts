import { EventHandler, EventHostOrClass, Events, EventSubscriptions, IEventHostInternal, IEventSubscriber, SYMBOL_EVENT_BUS_SUBSCRIPTIONS, SYMBOL_SUBSCRIPTION_REGISTRATIONS } from "./IExcevent";

type AnyFunction = (...args: any[]) => any;

export default class Excevent<BUSES extends Record<string | number, EventHostOrClass<any>>> {

	private buses: {
		[BUS in keyof BUSES]?: {
			host: IEventHostInternal<Events<BUSES[BUS]>>;
			subscriptions: EventSubscriptions<BUSES[BUS], Events<BUSES[BUS]>>;
		}
	} = {};

	public registerBus<BUS extends keyof BUSES> (bus: BUS, host: BUSES[BUS]) {
		this.deregisterBus(bus);

		const h = IEventHostInternal.getHost<Events<BUSES[BUS]>>(host);
		let registeredBus = this.buses[bus];
		if (!registeredBus)
			registeredBus = this.buses[bus] = {
				host: h,
				subscriptions: {},
			};

		// the class needs to know that it's been assigned as this event bus
		h[SYMBOL_EVENT_BUS_SUBSCRIPTIONS][bus as string | number] = registeredBus.subscriptions;
	}

	public deregisterBus<BUS extends keyof BUSES> (bus: BUS) {
		const registeredBus = this.buses[bus];
		if (!registeredBus)
			return;

		delete registeredBus.host[SYMBOL_EVENT_BUS_SUBSCRIPTIONS][bus as string | number];
	}

	public getEventHandlerDecorator () {
		type ResolveEvents<ON extends keyof BUSES | EventHostOrClass<Events<BUSES[keyof BUSES]>>> =
			ON extends keyof BUSES ? Events<BUSES[ON]> : Events<ON>;

		function EventHandler<ON extends keyof BUSES | EventHostOrClass<Events<BUSES[keyof BUSES]>>, EVENT extends keyof ResolveEvents<ON>> (on: ON, event: EVENT, priority = 0): (host: any, property2: string | number, descriptor: TypedPropertyDescriptorFunctionAnyNOfParams<EventHandler<ON, ResolveEvents<ON>, EVENT>>) => void {
			return <T extends { [key in P]: AnyFunction }, P extends string | number> (subscriberClass: T, property: P, descriptor: TypedPropertyDescriptor<any>) => {
				const subscriber = IEventSubscriber.getSubscriber(subscriberClass);
				const subscriptions = subscriber[SYMBOL_SUBSCRIPTION_REGISTRATIONS]!;
				let subscriptionsOfProperty = subscriptions[property as string];
				if (!subscriptionsOfProperty)
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					subscriptionsOfProperty = subscriptions[property as string] = new Map();

				let subscriptionsOfHost = subscriptionsOfProperty.get(on);
				if (!subscriptionsOfHost)
					subscriptionsOfProperty.set(on, subscriptionsOfHost = {});

				EventSubscriptions.get(subscriptionsOfHost, event)
					.add(event as string, priority);
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