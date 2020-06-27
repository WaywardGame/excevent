import Stream from "@wayward/goodstream";
import { PriorityMap } from "./PriorityMap";
import { AnyFunction, Args, ArrayOr, Class, Head, IterableOr, MapValue, Return, Tail, UndefinedFromVoid } from "./Types";

export const SYMBOL_SUBSCRIPTIONS = Symbol("subscriptions");
export const SYMBOL_SUPERCLASSES = Symbol("superclasses");

// tslint:disable-next-line ban-types we need the Function type here
type Abstract<T> = Function & { prototype: T };
type Constructor<T> = new (...args: any[]) => T;
type ClassOrAbstractClass<T> = Abstract<T> | Constructor<T>;

export interface IEventEmitterHost<E> {
	event: IEventEmitter<this, E>;
}

// export type IEventEmitterHostClassAbstract<E> = AnyClass<IEventEmitterHost<E>>;
export type IEventEmitterHostClass<E> = ClassOrAbstractClass<IEventEmitterHost<E>>;

export type Events<T> =
	T extends IEventEmitterHost<infer E> ? E :
	// tslint:disable-next-line no-shadowed-variable https://github.com/palantir/tslint/issues/4235
	T extends IEventEmitterHostClass<infer E> ? E : never;

export interface ITrueEventEmitterHostClass<E> extends Class<any> {
	[SYMBOL_SUPERCLASSES]: ITrueEventEmitterHostClass<E>[];
	[SYMBOL_SUBSCRIPTIONS]: Map<any, Map<keyof E, PriorityMap<Set<Iterable<string | Handler<any, any>>>>>>;
}

export interface ISelfSubscribedEmitter<E> {
	[SYMBOL_SUBSCRIPTIONS]: [ISelfSubscribedEmitter<any>, keyof E, string | number | symbol, number?][];
}

/**
 * Describes an event handler for the given event on the given host.
 */
export type Handler<HOST, EVENT> = (host: HOST, ...args: Args<EVENT>) => Return<EVENT>;

export interface IEventEmitter<H = any, E = any> {
	event: IEventEmitter<this, EventEmitterEvents<H, E>>;
	// copyFrom(emitter: IEventEmitter<H, E>): void;
	emit<K extends keyof E> (event: K, ...args: Args<E[K]>): H;
	emitFirst<K extends keyof E> (event: K, ...args: Args<E[K]>): UndefinedFromVoid<Return<E[K]>> | undefined;
	emitFirstDefault<K extends keyof E, D> (event: K, generateDefault: () => D, ...args: Args<E[K]>): Exclude<Return<E[K]>, null | undefined> | D;
	emitStream<K extends keyof E> (event: K, ...args: Args<E[K]>): Stream<Return<E[K]>>;
	emitReduce<K extends keyof E, A extends Return<E[K]> & Head<Args<E[K]>>> (event: K, arg: A, ...args: Tail<Args<E[K]>>): Extract<Return<E[K]> & Head<Args<E[K]>>, undefined> extends undefined ? (undefined extends A ? Return<E[K]> : A) : Return<E[K]>;
	emitAsync<K extends keyof E> (event: K, ...args: Args<E[K]>): Promise<Stream<(Extract<Return<E[K]>, Promise<any>> extends Promise<infer R> ? R : never) | Exclude<Return<E[K]>, Promise<any>>>> & { isResolved?: true };
	subscribe<K extends ArrayOr<keyof E>> (event: K, handler: IterableOr<Handler<H, K extends any[] ? E[K[number]] : E[Extract<K, keyof E>]>>, priority?: number): H;
	unsubscribe<K extends ArrayOr<keyof E>> (event: K, handler: IterableOr<Handler<H, K extends any[] ? E[K[number]] : E[Extract<K, keyof E>]>>, priority?: number): boolean;
	waitFor<K extends ArrayOr<keyof E>> (events: K, priority?: number): Promise<Args<K extends any[] ? E[K[number]] : E[Extract<K, keyof E>]>>;
	until<E2> (emitter: IEventEmitterHost<E2>, ...events: (keyof E2)[]): UntilSubscriber<H, E>;
	until (promise: Promise<any>): UntilSubscriber<H, E>;
	hasHandlersForEvent (...events: (keyof E)[]): boolean;
}

interface UntilSubscriber<H, E> {
	subscribe<K extends ArrayOr<keyof E>> (event: K, handler: IterableOr<Handler<H, K extends any[] ? E[K[number]] : E[Extract<K, keyof E>]>>, priority?: number): H;
}

interface EventEmitterEvents<H, E> {
	subscribe<K extends keyof E> (event: keyof E, handler: Iterable<(keyof H) | Handler<H, K extends any[] ? E[K[number]] : E[Extract<K, keyof E>]>>): any;
	unsubscribe<K extends keyof E> (event: keyof E, handler: Iterable<(keyof H) | Handler<H, K extends any[] ? E[K[number]] : E[Extract<K, keyof E>]>>): any;
}

////////////////////////////////////
// Event Emitter implementation
//

class EventEmitter<H, E> implements IEventEmitter<H, E> {

	private readonly hostClass: ITrueEventEmitterHostClass<E>;
	private readonly subscriptions = new Map<keyof E, PriorityMap<Set<Iterable<string | Handler<any, any>>>>>();
	private eventEmitterMeta?: IEventEmitter<this, EventEmitterEvents<H, E>>;

	public get event (): IEventEmitter<this, EventEmitterEvents<H, E>> {
		if (!this.eventEmitterMeta) {
			this.eventEmitterMeta = new EventEmitter(this);
		}

		return this.eventEmitterMeta;
	}

	public constructor (private readonly host: H) {
		const h = host as any;
		this.hostClass = h.constructor;
		if (!(SYMBOL_SUBSCRIPTIONS in this.hostClass)) {
			this.hostClass[SYMBOL_SUBSCRIPTIONS] = new Map();
		}

		if (!(h instanceof EventEmitter) && "event" in host && h.event instanceof EventEmitter) {
			this.copyFrom(h.event);
		}

		if (SYMBOL_SUBSCRIPTIONS in h) {
			const subscriptions = (h as ISelfSubscribedEmitter<E>)[SYMBOL_SUBSCRIPTIONS];
			for (const [selfSubscribedHost, event, handlerMethodName, priority] of subscriptions) {
				if (h instanceof selfSubscribedHost.constructor) {
					this.subscribe(event, handlerMethodName as keyof H, priority);
				}
			}

			delete h[SYMBOL_SUBSCRIPTIONS];
		}
	}

	// public arguments<K extends keyof E>(event: K): ArgsOf<E[K]> {
	// 	throw new Error("This method does not exist.");
	// }

	public emit<K extends keyof E> (event: K, ...args: Args<E[K]>) {
		this.emitStream(event, ...args).complete();
		return this.host;
	}

	public emitFirst<K extends keyof E> (event: K, ...args: Args<E[K]>): any {
		return this.emitStream(event, ...args).filterNullish().first();
	}

	public emitFirstDefault<K extends keyof E, D> (event: K, generateDefault: () => D, ...args: Args<E[K]>): any {
		return this.emitStream(event, ...args).filterNullish().first(undefined, generateDefault);
	}

	public emitStream<K extends keyof E> (event: K, ...args: Args<E[K]>): Stream<Return<E[K]>> {
		return this.handlersForEvent(event)
			.map(subscriber => typeof subscriber === "function" ? subscriber(this.host, ...args) : (this.host[subscriber as keyof H] as any as Handler<any, any>).apply(this.host, args as never));
	}

	public emitReduce<K extends keyof E, A extends Return<E[K]> & Head<Args<E[K]>>> (event: K, arg: A, ...args: Tail<Args<E[K]>>): Extract<Return<E[K]> & Head<Args<E[K]>>, undefined> extends undefined ? (undefined extends A ? Return<E[K]> : A) : Return<E[K]> {
		return this.handlersForEvent(event)
			.fold(arg, (current, handler) => typeof handler === "function" ? handler(this.host, current, ...args) : (this.host[handler as keyof H] as any as Handler<any, any>).call(this.host, current, ...args)) as any;
		// we have to cast to any because typescript updated and decided that `A` was no longer good enough here~
	}

	public emitAsync<K extends keyof E> (event: K, ...args: Args<E[K]>): any {
		return this.emitStream(event, ...args).rest();
	}

	public subscribe<K extends ArrayOr<keyof E>> (events: K, handler: keyof H | IterableOr<Handler<H, K extends any[] ? E[K[number]] : E[Extract<K, keyof E>]>>, priority = 0) {
		for (const event of Array.isArray(events) ? events : [events]) {
			const resolvedHandler = typeof handler === "object" && Symbol.iterator in handler ? handler : [handler] as any;

			let eventSubscriptions = this.subscriptions.get(event);
			if (!eventSubscriptions) {
				this.subscriptions.set(event, eventSubscriptions = new PriorityMap());
			}

			eventSubscriptions.getOrDefault(priority, () => new Set(), true)
				.add(resolvedHandler);

			this.eventEmitterMeta?.emit("subscribe", event, resolvedHandler);
		}

		return this.host;
	}

	public unsubscribe<K extends ArrayOr<keyof E>> (events: K, handler: keyof H | IterableOr<Handler<H, K extends any[] ? E[K[number]] : E[Extract<K, keyof E>]>>, priority = 0) {
		handler = typeof handler === "object" && Symbol.iterator in handler ? [...handler as any] : [handler] as any;
		const subscriptions = this.subscriptions;
		let removed = false;
		for (const event of Array.isArray(events) ? events : [events]) {
			const handlerSet = (subscriptions.get(event) || new PriorityMap() as MapValue<typeof subscriptions>)
				.getOrDefault(priority, () => new Set());

			for (const handlers of handlerSet) {
				const shouldDelete = [...handlers].every(h => (handler as any[]).includes(h));
				if (shouldDelete) {
					this.eventEmitterMeta?.emit("unsubscribe", event, handler as any);
				}

				removed = true;
			}
		}

		return removed;
	}

	public async waitFor<K extends ArrayOr<keyof E>> (events: K, priority = 0): Promise<Args<K extends any[] ? E[K[number]] : E[Extract<K, keyof E>]>> {
		return new Promise<any>(resolve => {
			const realHandler: AnyFunction = (host: any, ...args: any[]) => {
				this.unsubscribe(events, realHandler, priority);
				resolve(args as any);
			};

			this.subscribe(events, realHandler, priority);
		});
	}

	public until<E2> (emitter: IEventEmitterHost<E2>, ...events: (keyof E2)[]): UntilSubscriber<H, E>;
	public until (promise: Promise<any>): UntilSubscriber<H, E>;
	public until (promiseOrEmitter: Promise<any> | IEventEmitterHost<any>, ...events: (string | number | symbol)[]): UntilSubscriber<H, E> {
		if ("event" in promiseOrEmitter) {
			promiseOrEmitter = Stream.from(events)
				.map(event => (promiseOrEmitter as IEventEmitterHost<any>).event.waitFor(event))
				.race();
		}

		return {
			subscribe: <K extends ArrayOr<keyof E>> (event: K, handler: IterableOr<Handler<H, K extends any[] ? E[K[number]] : E[Extract<K, keyof E>]>>, priority: number = 0) => {
				this.subscribe(event, handler, priority);

				(promiseOrEmitter as Promise<any>).then(() => {
					this.unsubscribe(event, handler, priority);
				});

				return this.host;
			},
		};
	}

	public hasHandlersForEvent (...events: (keyof E)[]) {
		return Stream.from(events)
			.flatMap(event => this.handlersForEvent(event))
			.hasNext();
	}

	private copyFrom (emitter: IEventEmitter<H, E>) {
		Stream.entries((emitter as EventEmitter<H, E>).subscriptions).toMap(this.subscriptions);
	}

	private handlersForEvent<K extends keyof E> (event: K) {
		return this.handlers()
			.map(subscriptionMap => subscriptionMap.get(event) || new PriorityMap() as MapValue<typeof subscriptionMap>)
			.splat(PriorityMap.streamAll)
			.flatMap()
			.flatMap();
	}

	private handlers () {
		if (!this.hostClass[SYMBOL_SUPERCLASSES]) {
			const classes = [];
			let cls = this.hostClass;
			while (cls) {
				// if (cls[SYMBOL_SUBSCRIPTIONS]) {
				classes.push(cls);
				// }

				cls = Object.getPrototypeOf(cls).prototype?.constructor;
			}

			this.hostClass[SYMBOL_SUPERCLASSES] = classes;
		}

		return Stream.from(this.hostClass[SYMBOL_SUPERCLASSES])
			.flatMap(cls => cls.hasOwnProperty(SYMBOL_SUBSCRIPTIONS) && Stream.entries(cls[SYMBOL_SUBSCRIPTIONS]) || [])
			.filter(([cls]) => this.host instanceof cls)
			.map(([, map]) => map)
			.add(this.subscriptions);
	}
}

module EventEmitter {
	export class Host<E> implements IEventEmitterHost<E> {
		public readonly event: IEventEmitter<this, E> = new EventEmitter<this, E>(this);
	}
}

export default EventEmitter;
