import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import EventEmitter from "../build/Emitter";
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
		test3 (): any;
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
			expect(emitter.query("test")).undefined;
		});

		it("should return undefined when all subs return undefined", () => {
			const emitter = new EventEmitter<{}, ITestEvents>({});
			emitter.subscribe("test", () => undefined);
			emitter.subscribe("test", () => undefined);
			emitter.subscribe("test", () => undefined);
			expect(emitter.query("test")).undefined;
		});

		it("should return the result of the first non-undefined subscription", () => {
			const emitter = new EventEmitter<{}, ITestEvents>({});
			emitter.subscribe("test", () => undefined);
			emitter.subscribe("test", () => undefined);
			emitter.subscribe("test", () => 1);
			let encountered = false;
			emitter.subscribe("test", () => { encountered = true; return 2; });
			expect(emitter.query("test")).eq(1);
			expect(encountered).false;
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

});

describe("excevent", () => {

	describe("EventHandler", () => {

		it("event bus", () => {
			enum EventBus {
				Foo,
			}

			interface IEventBuses {
				[EventBus.Foo]: typeof Foo,
			}

			const excevent = new Excevent<IEventBuses>();
			const EventHandler = excevent.getEventHandlerDecorator();

			interface IFooEvents {
				test (): any;
				test3 (): any;
				test2 (a: number, b: string, ...c: number[]): boolean;
			}

			class Foo extends EventEmitter.Host(excevent)<IFooEvents> { }
			excevent.registerBus(EventBus.Foo, Foo);

			class Test {

				public hitFooTest = 0;

				@EventHandler(EventBus.Foo, "test")
				protected onFooTest () {
					this.hitFooTest++;
				}
			}

			const test = new Test();
			excevent.subscribe(test);

			new Foo().event.emit("test");
			new Foo().event.emit("test");
			expect(test.hitFooTest).eq(2);

			excevent.unsubscribe(test);

			test.hitFooTest = 0;
			new Foo().event.emit("test");
			new Foo().event.emit("test");
			expect(test.hitFooTest).eq(2);
		});

		it("host class", () => {
			interface IEventBuses {
			}

			const excevent = new Excevent<IEventBuses>();
			const EventHandler = excevent.getEventHandlerDecorator();

			interface IFooEvents {
				test (): any;
				test3 (): any;
				test2 (a: number, b: string, ...c: number[]): boolean;
			}

			class Foo extends EventEmitter.Host(excevent)<IFooEvents> { }

			class Test {

				public hitFooTest = 0;

				@EventHandler(Foo, "test")
				protected onFooTest () {
					this.hitFooTest++;
				}
			}

			const test = new Test();
			excevent.subscribe(test);

			new Foo().event.emit("test");
			new Foo().event.emit("test");
			expect(test.hitFooTest).eq(2);

			excevent.unsubscribe(test);

			test.hitFooTest = 0;
			new Foo().event.emit("test");
			new Foo().event.emit("test");
			expect(test.hitFooTest).eq(2);
		});

		it("host instance", () => {
			const excevent = new Excevent<{}>();
			const EventHandler = excevent.getEventHandlerDecorator();

			interface IFooEvents {
				test (): any;
				test3 (): any;
				test2 (a: number, b: string, ...c: number[]): boolean;
			}

			class Foo extends EventEmitter.Host(excevent)<IFooEvents> { }

			const foo = new Foo();

			class Test {

				public hitFooTest = 0;

				@EventHandler(foo, "test")
				protected onFooTest () {
					this.hitFooTest++;
				}
			}

			const test = new Test();
			excevent.subscribe(test);

			foo.event.emit("test");
			new Foo().event.emit("test");
			expect(test.hitFooTest).eq(1);

			excevent.unsubscribe(test);

			test.hitFooTest = 0;
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

			const excevent = new Excevent<IEventBuses>();
			const EventHandler = excevent.getEventHandlerDecorator();

			interface IFooEvents {
				test (): any;
				test3 (): any;
				test2 (a: number, b: string, ...c: number[]): boolean;
			}

			class Foo extends EventEmitter.Host(excevent)<IFooEvents> { }
			excevent.registerBus(EventBus.Foo, Foo);

			const foo = new Foo();

			class Test {

				public hitFooTest = 0;

				@EventHandler(foo, "test")
				@EventHandler(Foo, "test")
				@EventHandler(EventBus.Foo, "test")
				protected onFooTest () {
					this.hitFooTest++;
				}
			}

			const test = new Test();
			excevent.subscribe(test);

			foo.event.emit("test");
			new Foo().event.emit("test");
			expect(test.hitFooTest).eq(5);

			excevent.unsubscribe(test);

			test.hitFooTest = 0;
			foo.event.emit("test");
			new Foo().event.emit("test");
			expect(test.hitFooTest).eq(5);

			// interface IBarEvents {
			// 	testBar (thing: number): any;
			// }

			// class Bar extends EventEmitter.Host(excevent)<IBarEvents> { }

			// foo.event.until("test", subscriber => subscriber
			// 	.subscribe(EventBus.Foo, "test"));

			// foo.event.until(Bar, "testBar", subscriber => subscriber
			// 	.subscribe("test"))

		});
	});
});
