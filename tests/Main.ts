import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { default as Emitter, default as EventEmitter } from "../build/Emitter";
import Excevent from "../build/Excevent";
import { IEventApi } from "../build/IExcevent";
import PriorityList from "../build/PriorityList";

chai.use(chaiAsPromised);
const expect = chai.expect;

// async function sleep<T>(ms: number, returnValue?: T) {
// 	return new Promise<T>(resolve => setTimeout(() => resolve(returnValue), ms));
// }

describe("PriorityList", () => {

	it("'has'", () => {
		const list = new PriorityList<number>();
		list.add(1);
		list.add(2);
		list.add(3);
		expect(list.has(1)).true;
		expect(list.has(2)).true;
		expect(list.has(3)).true;
		expect(list.has(4)).false;
		expect(list.has(5)).false;
		expect(list.has(6)).false;
	});

	describe("'map'", () => {
		it("encounters all", () => {
			const list = new PriorityList<number>();
			list.add(1);
			list.add(2);
			list.add(3);
			const encountered: number[] = [];
			list.map((api, value) => encountered.push(value));
			expect(encountered).members([1, 2, 3]);
		});

		it("encounters all, whether or not there's a priority", () => {
			const list = new PriorityList<number>();
			list.add(4, -135);
			list.add(3, 8);
			list.add(2);
			list.add(1, -135);
			const encountered: number[] = [];
			list.map((api, value) => encountered.push(value));
			expect(encountered).members([3, 2, 4, 1]);
			expect(list.getPriorities()).members([8, 0, -135]);
		});

		it("encounters all in an order based on their priority", () => {
			const list = new PriorityList<number>();
			list.add(1, -135);
			list.add(2);
			list.add(3, 8);
			const encountered: number[] = [];
			list.map((api, value) => encountered.push(value));
			expect(encountered).ordered.members([3, 2, 1]);
			expect(list.getPriorities()).ordered.members([8, 0, -135]);
		});

		it("should break", () => {
			const list = new PriorityList<number>();
			list.add(1, -135);
			list.add(5);
			list.add(4);
			list.add(8);
			list.add(2);
			list.add(3, 8);
			const encountered: number[] = [];
			list.map((api, value) => {
				encountered.push(value);
				if (value === 8) {
					api.break = true;
				}
			});
			expect(encountered).ordered.members([3, 5, 4, 8]);
		});

		it("returns the result of each handler in an array", () => {
			const list = new PriorityList<number>();
			list.add(1);
			list.add(2);
			list.add(3);
			expect(list.map((api, value) => `test${value}`)).members(["test1", "test2", "test3"]);
		});
	});

	it("cannot have more than one of the same value", () => {
		const list = new PriorityList<number>();
		list.add(1);
		list.add(1);
		const encountered: number[] = [];
		list.map((api, value) => encountered.push(value));
		expect(encountered).members([1]);
	});

	describe("'remove'", () => {
		it("removes a single value", () => {
			const list = new PriorityList<number>();
			list.add(1);
			list.add(2);
			list.add(3);
			list.remove(2);
			const encountered: number[] = [];
			list.map((api, value) => encountered.push(value));
			expect(encountered).members([1, 3]);
		});

		it("removes everything", () => {
			const list = new PriorityList<number>();
			list.add(1);
			list.add(2);
			list.add(3);
			list.remove(2);
			list.remove(1);
			list.remove(3);
			const encountered: number[] = [];
			list.map((api, value) => encountered.push(value));
			expect(encountered).members([]);
			expect(list.getPriorities()).members([]);
		});

		it("does not remove things of a different priority", () => {
			const list = new PriorityList<number>();
			list.add(1);
			list.add(2, 5);
			list.add(3);
			list.remove(2);
			list.remove(1);
			list.remove(3);
			const encountered: number[] = [];
			list.map((api, value) => encountered.push(value));
			expect(encountered).members([2]);
			expect(list.getPriorities()).members([5]);
		});
	});

	it("'clear'", () => {
		const list = new PriorityList<number>();
		list.add(1);
		list.add(2);
		list.add(3);
		list.clear();
		const encountered: number[] = [];
		list.map((api, value) => encountered.push(value));
		expect(encountered).members([]);
		expect(list.getPriorities()).members([]);
	});

	describe("'mapAll'", () => {
		it("should encounter all members of every list", () => {
			const lists: PriorityList<number>[] = [];
			let list = new PriorityList<number>();
			list.add(1);
			list.add(2);
			list.add(3);
			lists.push(list);
			list = new PriorityList<number>();
			list.add(4, 5);
			list.add(5, 5);
			list.add(6, 5);
			lists.push(list);
			list = new PriorityList<number>();
			list.add(7, -5);
			list.add(8, -5);
			list.add(9, 5);
			lists.push(list);
			list = new PriorityList<number>();
			list.add(10, -5);
			list.add(11, -5);
			list.add(12, 50);
			lists.push(list);

			const encountered: number[] = [];
			PriorityList.mapAll(lists, (api, value) => encountered.push(value));
			expect(encountered).members([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
		});

		it("should encounter all members of every list", () => {
			const lists: PriorityList<number>[] = [];
			let list = new PriorityList<number>();
			list.add(1);
			list.add(2);
			list.add(3);
			lists.push(list);
			list = new PriorityList<number>();
			list.add(4, 5);
			list.add(5, 5);
			list.add(6, 5);
			lists.push(list);
			list = new PriorityList<number>();
			list.add(7, -5);
			list.add(8, -5);
			list.add(9, 5);
			lists.push(list);
			list = new PriorityList<number>();
			list.add(10, -5);
			list.add(11, -5);
			list.add(12, 50);
			lists.push(list);

			expect(PriorityList.mapAll(lists, (api, value) => `test${value}`)).ordered.members([`test12`, `test4`, `test5`, `test6`, `test9`, `test1`, `test2`, `test3`, `test7`, `test8`, `test10`, `test11`]);
		});

		it("should encounter all members of every list, ordered", () => {
			const lists: PriorityList<number>[] = [];
			let list = new PriorityList<number>();
			list.add(1);
			list.add(2);
			list.add(3);
			lists.push(list);
			list = new PriorityList<number>();
			list.add(4, 5);
			list.add(5, 5);
			list.add(6, 5);
			lists.push(list);
			list = new PriorityList<number>();
			list.add(7, -5);
			list.add(8, -5);
			list.add(9, 5);
			lists.push(list);
			list = new PriorityList<number>();
			list.add(10, -5);
			list.add(11, -5);
			list.add(12, 50);
			lists.push(list);

			expect(list.getPriorities()).ordered.members([50, -5]);

			const encountered: number[] = [];
			PriorityList.mapAll(lists, (api, value) => encountered.push(value));
			expect(encountered).ordered.members([12, 4, 5, 6, 9, 1, 2, 3, 7, 8, 10, 11]);
		});

		it("should break", () => {
			const lists: PriorityList<number>[] = [];
			let list = new PriorityList<number>();
			list.add(1);
			list.add(2);
			list.add(3);
			lists.push(list);
			list = new PriorityList<number>();
			list.add(4, 5);
			list.add(5, 5);
			list.add(6, 5);
			lists.push(list);
			list = new PriorityList<number>();
			list.add(7, -5);
			list.add(8, -5);
			list.add(9, 5);
			lists.push(list);
			list = new PriorityList<number>();
			list.add(10, -5);
			list.add(11, -5);
			list.add(12, 50);
			lists.push(list);

			const encountered: number[] = [];
			PriorityList.mapAll(lists, (api, value) => {
				encountered.push(value);
				if (value === 2) {
					api.break = true;
				}
			});
			expect(encountered).ordered.members([12, 4, 5, 6, 9, 1, 2]);
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
		const emitter = new Emitter<{}, ITestEvents>({});
		expect(emitter.emit("test")).members([]);
		expect(emitter.emit("test2", 1, "foo", 2, 3, 4, 5)).members([]);
	});

	it("basic subscribe", () => {
		const emitter = new Emitter<{}, ITestEvents>({});
		emitter.subscribe("test", () => "hello world!");
		expect(emitter.emit("test")).members(["hello world!"]);
	});

	it("should emit based on priority", () => {
		const emitter = new Emitter<{}, ITestEvents>({});
		emitter.subscribe("test", 2, () => 2);
		emitter.subscribe("test", 1, () => 1);
		emitter.subscribe("test", 3, () => 3);
		expect(emitter.emit("test")).ordered.members([3, 2, 1]);
	});

	it("should be able to sub to multiple", () => {
		const emitter = new Emitter<{}, ITestEvents>({});
		emitter.subscribe(["test", "test3"], 2, () => 2);
		emitter.subscribe("test", 1, () => 1);
		emitter.subscribe("test", 3, () => 3);
		expect(emitter.emit("test")).ordered.members([3, 2, 1]);
		expect(emitter.emit("test3")).members([2]);
	});

	it("should unsubscribe", () => {
		const emitter = new Emitter<{}, ITestEvents>({});
		emitter.subscribe("test", 2, () => 2);
		const sub1 = () => 1;
		emitter.subscribe("test", 1, sub1);
		emitter.subscribe("test", 3, () => 3);
		emitter.unsubscribe("test", 1, sub1);
		expect(emitter.emit("test")).ordered.members([3, 2]);
	});

	describe("'query'", () => {
		it("should return undefined when no subscriptions", () => {
			const emitter = new Emitter<{}, ITestEvents>({});
			expect(emitter.query("test")).undefined;
		});

		it("should return undefined when all subs return undefined", () => {
			const emitter = new Emitter<{}, ITestEvents>({});
			emitter.subscribe("test", () => undefined);
			emitter.subscribe("test", () => undefined);
			emitter.subscribe("test", () => undefined);
			expect(emitter.query("test")).undefined;
		});

		it("should return the result of the first non-undefined subscription", () => {
			const emitter = new Emitter<{}, ITestEvents>({});
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
			const emitter = new Emitter<{}, ITestEvents>(host);
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
			const emitter = new Emitter<{}, ITestEvents>({});
			emitter.subscribe("test", api => api.index);
			emitter.subscribe("test", api => api.index);
			emitter.subscribe("test", api => api.index);
			expect(emitter.emit("test")).ordered.members([0, 1, 2]);
		});
	});

});

describe("excevent", () => {
	enum EventBus {
		Foo,
		Bar,
	}

	interface IEventBuses {
		[EventBus.Foo]: typeof Foo,
		[EventBus.Bar]: typeof Bar,
	}

	const excevent = new Excevent<IEventBuses>();
	const EventHandler = excevent.getEventHandlerDecorator();

	interface IFooEvents {
		test (): any;
		test3 (): any;
		test2 (a: number, b: string, ...c: number[]): boolean;
	}

	class Foo extends EventEmitter.Host<IFooEvents> { }
	excevent.registerBus(EventBus.Foo, Foo);

	interface IBarEvents {
		test7 (): any;
		test6 (): any;
		test5 (a: number, b: string, ...c: number[]): boolean;
	}

	class Bar extends EventEmitter.Host<IBarEvents> { }
	excevent.registerBus(EventBus.Bar, Bar);

	it("EventHandler", () => {
		let hitFooTest = 0;

		class Test {
			@EventHandler(EventBus.Foo, "test")
			protected onFooTest () {
				hitFooTest++;
			}
		}

		const test = new Test();
		excevent.subscribe(test);

		new Foo().event.emit("test");
		new Foo().event.emit("test");
		expect(hitFooTest).eq(2);

		// excevent.unsubscribe(test);

		// hitFooTest = 0;
		// new Foo().event.emit("test");
		// new Foo().event.emit("test");
		// expect(hitFooTest).eq(2);
	});
});
