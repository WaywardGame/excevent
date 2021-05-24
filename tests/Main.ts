import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import EventEmitter, { EventHost } from "../build/Emitter";
import Excevent from "../build/Excevent";
import { IEventApi } from "../build/IExcevent";
import PriorityMap from "../build/PriorityMap";

chai.use(chaiAsPromised);
const expect = chai.expect;

// async function sleep<T>(ms: number, returnValue?: T) {
// 	return new Promise<T>(resolve => setTimeout(() => resolve(returnValue), ms));
// }

describe("PriorityMap", () => {

	it("'has'", () => {
		const map = new PriorityMap<number>();
		map.set(0, 1);
		map.set(0, 2);
		map.set(0, 3);
		expect(map.has(1)).true;
		expect(map.has(2)).true;
		expect(map.has(3)).true;
		expect(map.has(4)).false;
		expect(map.has(5)).false;
		expect(map.has(6)).false;
	});

	describe("'map'", () => {

		it("encounters all in an order based on their priority", () => {
			const map = new PriorityMap<number>();
			map.set(1, -135);
			map.set(2);
			map.set(3, 8);
			const encountered: number[] = [];
			map.map((api, value) => encountered.push(value));
			expect(encountered).ordered.members([3, 2, 1]);
			expect(map.getPriorities()).ordered.members([8, 0, -135]);
		});

		it("should break", () => {
			const map = new PriorityMap<number>();
			map.set(1, -135);
			map.set(5);
			map.set(4, 6);
			map.set(8, 2);
			map.set(2, -1);
			map.set(3, 8);
			const encountered: number[] = [];
			map.map((api, value) => {
				encountered.push(value);
				if (value === 2) {
					api.break = true;
				}
			});
			expect(encountered).ordered.members([3, 4, 8, 5, 2]);
		});

		it("returns the result of each handler in an array", () => {
			const map = new PriorityMap<number>();
			map.set(1, 1);
			map.set(2, 2);
			map.set(3, 3);
			expect(map.map((api, value) => `test${value}`)).members(["test1", "test2", "test3"]);
		});
	});

	describe("'remove'", () => {
		it("removes a single value", () => {
			const map = new PriorityMap<number>();
			map.set(1, 1);
			map.set(2, 2);
			map.set(3, 3);
			map.remove(2);
			const encountered: number[] = [];
			map.map((api, value) => encountered.push(value));
			expect(encountered).members([1, 3]);
		});

		it("removes everything", () => {
			const map = new PriorityMap<number>();
			map.set(1, 1);
			map.set(2, 2);
			map.set(3, 3);
			map.remove(2);
			map.remove(1);
			map.remove(3);
			const encountered: number[] = [];
			map.map((api, value) => encountered.push(value));
			expect(encountered).members([]);
			expect(map.getPriorities()).members([]);
		});
	});

	it("'clear'", () => {
		const map = new PriorityMap<number>();
		map.set(1, 1);
		map.set(2, 2);
		map.set(3, 3);
		map.clear();
		const encountered: number[] = [];
		map.map((api, value) => encountered.push(value));
		expect(encountered).members([]);
		expect(map.getPriorities()).members([]);
	});

	describe("'mapAll'", () => {
		it("should encounter all members of every list", () => {
			const maps: PriorityMap<number>[] = [];
			let map = new PriorityMap<number>();
			map.set(1, 1);
			map.set(2, 2);
			map.set(3, 3);
			maps.push(map);
			map = new PriorityMap<number>();
			map.set(4, 4);
			map.set(5, 5);
			map.set(6, 6);
			maps.push(map);
			map = new PriorityMap<number>();
			map.set(7, -6);
			map.set(8, -5);
			map.set(9, 5);
			maps.push(map);
			map = new PriorityMap<number>();
			map.set(10, -6);
			map.set(11, -5);
			map.set(12, 50);
			maps.push(map);

			const encountered: number[] = [];
			PriorityMap.mapAll(maps, (api, value) => encountered.push(value));
			expect(encountered).members([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
		});

		it("should encounter all members of every list", () => {
			const maps: PriorityMap<number>[] = [];
			let map = new PriorityMap<number>();
			map.set(1, 1);
			map.set(2, 2);
			map.set(3, 3);
			maps.push(map);
			map = new PriorityMap<number>();
			map.set(4, 4);
			map.set(5, 5);
			map.set(6, 6);
			maps.push(map);
			map = new PriorityMap<number>();
			map.set(7, -6);
			map.set(8, -5);
			map.set(9, 5);
			maps.push(map);
			map = new PriorityMap<number>();
			map.set(10, -6);
			map.set(11, -5);
			map.set(12, 50);
			maps.push(map);

			expect(PriorityMap.mapAll(maps, (api, value) => `test${value}`))
				.ordered.members([`test12`, `test6`, `test5`, `test9`, `test4`, `test3`, `test2`, `test1`, `test8`, `test11`, `test7`, `test10`]);
		});

		it("should break", () => {
			const maps: PriorityMap<number>[] = [];
			let map = new PriorityMap<number>();
			map.set(1, 1);
			map.set(2, 2);
			map.set(3, 3);
			maps.push(map);
			map = new PriorityMap<number>();
			map.set(4, 4);
			map.set(5, 5);
			map.set(6, 6);
			maps.push(map);
			map = new PriorityMap<number>();
			map.set(7, -6);
			map.set(8, -5);
			map.set(9, 5);
			maps.push(map);
			map = new PriorityMap<number>();
			map.set(10, -6);
			map.set(11, -5);
			map.set(12, 50);
			maps.push(map);

			const encountered: number[] = [];
			PriorityMap.mapAll(maps, (api, value) => {
				encountered.push(value);
				if (value === 2) {
					api.break = true;
				}
			});
			expect(encountered).ordered.members([12, 6, 5, 9, 4, 3, 2]);
		});
	});
});


describe("Emitter", () => {
	interface ITestEvents {
		test (): any;
		test3 (): number;
		test2 (a: number, b: string, ...c: number[]): boolean;
	}

	it("basic emit", () => {
		const emitter = new EventEmitter<{}, ITestEvents>({});
		expect(emitter.emit("test")).members([]);
		expect(emitter.emit("test2", 1, "foo", 2, 3, 4, 5)).members([]);
	});

	it("basic subscribe", () => {
		const emitter = new EventEmitter<{}, ITestEvents>({});
		emitter.subscribe("test", () => "hello world!");
		expect(emitter.emit("test")).members(["hello world!"]);
	});

	it("should emit based on priority", () => {
		const emitter = new EventEmitter<{}, ITestEvents>({});
		emitter.subscribe("test", 2, () => 2);
		emitter.subscribe("test", 1, () => 1);
		emitter.subscribe("test", 3, () => 3);
		expect(emitter.emit("test")).ordered.members([3, 2, 1]);
	});

	it("should be able to sub to multiple", () => {
		const emitter = new EventEmitter<{}, ITestEvents>({});
		emitter.subscribe(["test", "test3"], 2, () => 2);
		emitter.subscribe("test", 1, () => 1);
		emitter.subscribe("test", 3, () => 3);
		expect(emitter.emit("test")).ordered.members([3, 2, 1]);
		expect(emitter.emit("test3")).members([2]);
	});

	it("should unsubscribe", () => {
		const emitter = new EventEmitter<{}, ITestEvents>({});
		emitter.subscribe("test", 2, () => 2);
		const sub1 = () => 1;
		emitter.subscribe("test", 1, sub1);
		emitter.subscribe("test", 3, () => 3);
		emitter.unsubscribe("test", 1, sub1);
		expect(emitter.emit("test")).ordered.members([3, 2]);
	});

	describe("'query'", () => {
		it("should return undefined when no subscriptions", () => {
			const emitter = new EventEmitter<{}, ITestEvents>({});
			expect(emitter.query("test").get()).undefined;
		});

		it("should return undefined when all subs return undefined", () => {
			const emitter = new EventEmitter<{}, ITestEvents>({});
			emitter.subscribe("test", () => undefined);
			emitter.subscribe("test", () => undefined);
			emitter.subscribe("test", () => undefined);
			expect(emitter.query("test").get()).undefined;
		});

		it("should return the result of the first non-undefined subscription", () => {
			const emitter = new EventEmitter<{}, ITestEvents>({});
			emitter.subscribe("test", () => undefined);
			emitter.subscribe("test", () => undefined);
			emitter.subscribe("test", () => 1);
			let encountered = false;
			emitter.subscribe("test", () => { encountered = true; return 2; });
			expect(emitter.query("test").get()).eq(1);
			expect(encountered).false;
		});

		it("should should allow filtering the query with 'where'", () => {
			const emitter = new EventEmitter<{}, ITestEvents>({});
			emitter.subscribe("test3", () => 2);
			emitter.subscribe("test3", () => 3);
			emitter.subscribe("test3", () => 4);
			expect(emitter.query("test3").where(value => value % 2).get()).eq(3);
		});

		it("should should allow filtering the query with 'get'", () => {
			const emitter = new EventEmitter<{}, ITestEvents>({});
			emitter.subscribe("test3", () => 2);
			emitter.subscribe("test3", () => 3);
			emitter.subscribe("test3", () => 4);
			expect(emitter.query("test3").get(value => value % 2)).eq(3);
		});

	});

	describe("'IEventApi'", () => {
		it("should give an api object to event handlers", () => {
			const host = {};
			const emitter = new EventEmitter<{}, ITestEvents>(host);
			let savedApi: IEventApi<{}, ITestEvents, "test"> | undefined;
			emitter.subscribe("test", api => savedApi = api);
			emitter.emit("test");
			expect(savedApi).not.undefined;
			expect(savedApi!.event).eq("test");
			expect(savedApi!.index).eq(0);
			expect(savedApi!.host).eq(host);
			expect(savedApi!.break).false;
		});

		it("should give an api object to event handlers", () => {
			const emitter = new EventEmitter<{}, ITestEvents>({});
			emitter.subscribe("test", api => api.index);
			emitter.subscribe("test", api => api.index);
			emitter.subscribe("test", api => api.index);
			expect(emitter.emit("test")).ordered.members([0, 1, 2]);
		});
	});

	describe("until", () => {
		describe("own event", () => {
			it("should handle the event before unsubscribing", () => {
				interface IFooEvents {
					test (): any;
					test3 (): any;
					test2 (a: number, b: string, ...c: number[]): boolean;
				}

				class Foo extends EventHost()<IFooEvents> { }
				const foo = new Foo();

				let hitFooTest3 = 0;
				foo.event.until("test", subscriber => subscriber
					.subscribe(foo, "test", () => hitFooTest3++));

				foo.event.emit("test");
				expect(hitFooTest3).eq(1);
				foo.event.emit("test");
				expect(hitFooTest3).eq(1);
			});

			it("should unsubscribe the until event", () => {
				interface IFooEvents {
					test (): any;
					test3 (): any;
					test2 (a: number, b: string, ...c: number[]): boolean;
				}

				class Foo extends EventHost()<IFooEvents> { }
				const foo = new Foo();

				let indices: number[] = [];

				foo.event.until("test", subscriber => subscriber
					.subscribe(foo, "test", () => { }));

				foo.event.subscribe("test", -Infinity, api => indices.push(api.index));

				foo.event.emit("test");
				foo.event.emit("test");

				expect(indices).ordered.members([2, 0]);
			});

			it("should be able to subscribe to global events", () => {
				enum EventBus {
					Foo,
				}

				interface IEventBuses {
					[EventBus.Foo]: typeof Foo,
				}

				const excevent = new Excevent<IEventBuses>();

				interface IFooEvents {
					test (): any;
					test3 (): any;
					test2 (a: number, b: string, ...c: number[]): boolean;
				}

				class Foo extends EventHost(excevent)<IFooEvents> { }
				const foo = new Foo();
				excevent.registerBus(EventBus.Foo, Foo);

				let hitFooTest3 = 0;
				foo.event.until("test", subscriber => subscriber
					.subscribe(Foo, "test", () => hitFooTest3++));

				foo.event.emit("test");
				expect(hitFooTest3).eq(1);
				foo.event.emit("test");
				expect(hitFooTest3).eq(1);

				hitFooTest3 = 0;
				foo.event.until("test", subscriber => subscriber
					.subscribe(EventBus.Foo, "test", () => hitFooTest3++));

				foo.event.emit("test");
				expect(hitFooTest3).eq(1);
				foo.event.emit("test");
				expect(hitFooTest3).eq(1);
			});
		});

		describe("class event", () => {
			it("should handle the event before unsubscribing", () => {
				enum EventBus {
					Foo,
				}

				interface IEventBuses {
					[EventBus.Foo]: typeof Foo,
				}

				const excevent = new Excevent<IEventBuses>();

				interface IFooEvents {
					test (): any;
					test3 (): any;
					test2 (a: number, b: string, ...c: number[]): boolean;
				}

				class Foo extends EventHost(excevent)<IFooEvents> { }
				excevent.registerBus(EventBus.Foo, Foo);

				const foo = new Foo();

				let hitFooTest3 = 0;
				foo.event.until(Foo, "test", subscriber => subscriber
					.subscribe("test", () => hitFooTest3++));

				foo.event.emit("test");
				expect(hitFooTest3).eq(1);
				foo.event.emit("test");
				expect(hitFooTest3).eq(1);
			});

			it("should unsubscribe the until event", () => {
				enum EventBus {
					Foo,
				}

				interface IEventBuses {
					[EventBus.Foo]: typeof Foo,
				}

				const excevent = new Excevent<IEventBuses>();

				interface IFooEvents {
					test (): any;
					test3 (): any;
					test2 (a: number, b: string, ...c: number[]): boolean;
				}

				class Foo extends EventHost(excevent)<IFooEvents> { }
				excevent.registerBus(EventBus.Foo, Foo);

				const foo = new Foo();

				let indices: number[] = [];

				foo.event.until(Foo, "test", subscriber => subscriber
					.subscribe("test", () => { }));

				foo.event.subscribe("test", -Infinity, api => indices.push(api.index));

				foo.event.emit("test");
				foo.event.emit("test");

				expect(indices).ordered.members([1, 0]);
			});
		});
	});

});

describe("excevent", () => {

	describe("Handler", () => {

		it("event bus", () => {
			enum EventBus {
				Foo,
			}

			interface IEventBuses {
				[EventBus.Foo]: typeof Foo,
			}

			const Events = new Excevent<IEventBuses>();

			interface IFooEvents {
				test (): any;
				test3 (): any;
				test2 (a: number, b: string, ...c: number[]): boolean;
			}

			@Events.Bus(EventBus.Foo)
			class Foo extends EventHost(Events)<IFooEvents> { }

			class Test {

				public hitFooTest = 0;

				@Events.Handler(EventBus.Foo, "test")
				protected onFooTest () {
					this.hitFooTest++;
				}
			}

			const test = new Test();
			Events.subscribe(test);

			new Foo().event.emit("test");
			new Foo().event.emit("test");
			expect(test.hitFooTest).eq(2);

			Events.unsubscribe(test);

			new Foo().event.emit("test");
			new Foo().event.emit("test");
			expect(test.hitFooTest).eq(2);
		});

		it("host class", () => {
			interface IEventBuses {
			}

			const Events = new Excevent<IEventBuses>();

			interface IFooEvents {
				test (): any;
				test3 (): any;
				test2 (a: number, b: string, ...c: number[]): boolean;
			}

			class Foo extends EventHost(Events)<IFooEvents> { }

			class Test {

				public hitFooTest = 0;

				@Events.Handler(Foo, "test")
				protected onFooTest () {
					this.hitFooTest++;
				}
			}

			const test = new Test();
			Events.subscribe(test);

			new Foo().event.emit("test");
			new Foo().event.emit("test");
			expect(test.hitFooTest).eq(2);

			Events.unsubscribe(test);

			new Foo().event.emit("test");
			new Foo().event.emit("test");
			expect(test.hitFooTest).eq(2);
		});

		it("host instance", () => {
			const Events = new Excevent<{}>();

			interface IFooEvents {
				test (): any;
				test3 (): any;
				test2 (a: number, b: string, ...c: number[]): boolean;
			}

			class Foo extends EventHost(Events)<IFooEvents> { }

			const foo = new Foo();

			class Test {

				public hitFooTest = 0;

				@Events.Handler(foo, "test")
				protected onFooTest () {
					this.hitFooTest++;
				}
			}

			const test = new Test();
			Events.subscribe(test);

			foo.event.emit("test");
			new Foo().event.emit("test");
			expect(test.hitFooTest).eq(1);

			Events.unsubscribe(test);

			foo.event.emit("test");
			new Foo().event.emit("test");
			expect(test.hitFooTest).eq(1);
		});

		it("event bus, host class, and host instance", () => {
			enum EventBus {
				Foo,
			}

			interface IEventBuses {
				[EventBus.Foo]: typeof Foo,
			}

			const Events = new Excevent<IEventBuses>();

			interface IFooEvents {
				test (): any;
				test3 (): any;
				test2 (a: number, b: string, ...c: number[]): boolean;
			}

			class Foo extends EventHost(Events)<IFooEvents> { }
			Events.registerBus(EventBus.Foo, Foo);

			const foo = new Foo();

			class Test {

				public hitFooTest = 0;

				@Events.Handler(foo, "test")
				@Events.Handler(Foo, "test")
				@Events.Handler(EventBus.Foo, "test")
				protected onFooTest () {
					this.hitFooTest++;
				}
			}

			const test = new Test();
			Events.subscribe(test);

			foo.event.emit("test");
			new Foo().event.emit("test");
			expect(test.hitFooTest).eq(5);

			Events.unsubscribe(test);

			foo.event.emit("test");
			new Foo().event.emit("test");
			expect(test.hitFooTest).eq(5);

		});

		describe("@Events.Subscriber", () => {

			it("event bus, host class, and host instance", () => {
				enum EventBus {
					Foo,
				}

				interface IEventBuses {
					[EventBus.Foo]: typeof Foo,
				}

				const Events = new Excevent<IEventBuses>();

				interface IFooEvents {
					test (): any;
					test3 (): any;
					test2 (a: number, b: string, ...c: number[]): boolean;
				}

				class Foo extends EventHost(Events)<IFooEvents> { }
				Events.registerBus(EventBus.Foo, Foo);

				const foo = new Foo();

				@Events.Subscribe
				class Test {

					public hitFooTest = 0;

					@Events.Handler(foo, "test")
					@Events.Handler(Foo, "test")
					@Events.Handler(EventBus.Foo, "test")
					protected onFooTest () {
						this.hitFooTest++;
					}
				}

				const test = new Test();

				foo.event.emit("test");
				new Foo().event.emit("test");
				expect(test.hitFooTest).eq(5);

				Events.unsubscribe(test);

				foo.event.emit("test");
				new Foo().event.emit("test");
				expect(test.hitFooTest).eq(5);

			});
		});

		it("inheritance", () => {
			const Events = new Excevent<{}>();

			interface IFooEvents {
				test (): any;
				test3 (): any;
				test2 (a: number, b: string, ...c: number[]): boolean;
			}

			class Foo extends EventHost(Events)<IFooEvents> { }

			const foo = new Foo();

			class Test {

				public hitFooTest = 0;

				@Events.Handler(foo, "test")
				protected onFooTest () {
					this.hitFooTest++;
				}
			}

			class Test2 extends Test {

				public hitFooTest2 = 0;

				@Events.Handler(foo, "test3")
				protected onFooTest3 () {
					this.hitFooTest2++;
					return true;
				}
			}

			const test = new Test();
			Events.subscribe(test);

			const test2 = new Test2();
			Events.subscribe(test2);

			foo.event.emit("test");
			foo.event.emit("test3");
			expect(test.hitFooTest).eq(1);
			expect(test2.hitFooTest).eq(1);
			expect(test2.hitFooTest2).eq(1);

			Events.unsubscribe(test);
			Events.unsubscribe(test2);

			foo.event.emit("test");
			foo.event.emit("test3");
			expect(test.hitFooTest).eq(1);
			expect(test2.hitFooTest).eq(1);
			expect(test2.hitFooTest2).eq(1);
		});
	});

	describe("OwnHandler", () => {
		it("should autosubscribe on creation", () => {

			interface IFooEvents {
				test (): any;
				test3 (): any;
				test2 (a: number, b: string, ...c: number[]): boolean;
			}

			class Foo extends EventHost()<IFooEvents> {

				public hitTest = 0;

				@EventHost.Handler("test")
				protected onTest () {
					this.hitTest++;
				}

				public hit2Test = 0;

				@EventHost.Handler(Foo, "test")
				protected on2Test () {
					this.hit2Test++;
				}
			}

			const foo = new Foo();
			expect(foo.hitTest).eq(0);
			expect(foo.hit2Test).eq(0);
			foo.event.emit("test");
			expect(foo.hitTest).eq(1);
			expect(foo.hit2Test).eq(1);
		});
	});

	describe("Watch", () => {
		it("should emit events on prop change", () => {

			interface IFooEvents {
				test (param: number, prop: string): any;
				test1 (param: number): any;
				test3 (): any;
				test2 (a: number[]): boolean;
			}

			class Foo extends EventHost()<IFooEvents> {

				@EventHost.Emit(Foo, "test")
				@EventHost.Emit(Foo, "test1")
				@EventHost.Emit(Foo, "test3")
				// @ts-expect-error
				@EventHost.Emit(Foo, "test2")
				public mutableProp = 0;
			}

			const foo = new Foo();
			let hitTest = 0;
			let gotValue: number | undefined;
			let gotProp: string | undefined;
			foo.event.subscribe("test", (api, value, property) => {
				hitTest++;
				gotValue = value;
				gotProp = property;
			});
			expect(hitTest).eq(0);
			foo.mutableProp++;
			expect(hitTest).eq(1);
			expect(foo.mutableProp).eq(1);
			expect(gotValue).eq(1);
			expect(gotProp).eq("mutableProp");
		});

		// TODO test if this works with subclasses
	});

	it("GlobalEventSubscriber", () => {
		enum EventBus {
			Foo,
		}

		interface IEventBuses {
			[EventBus.Foo]: typeof Foo,
		}

		const excevent = new Excevent<IEventBuses>();

		interface IFooEvents {
			test (): any;
			test3 (): any;
			test2 (a: number, b: string, ...c: number[]): boolean;
		}

		class Foo extends EventHost(excevent)<IFooEvents> { }
		excevent.registerBus(EventBus.Foo, Foo);

		const foo = new Foo();

		let hitFooTest2 = 0;
		const subscriber = excevent.createSubscriber()
			.register(foo, "test", () => hitFooTest2++);

		foo.event.emit("test");
		expect(hitFooTest2).eq(0);

		subscriber.subscribe();
		foo.event.emit("test");
		expect(hitFooTest2).eq(1);

		subscriber.unsubscribe();
		foo.event.emit("test");
		expect(hitFooTest2).eq(1);
	});
});
