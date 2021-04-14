import chai from "chai";
import chaiAsPromised from "chai-as-promised";
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

	describe("'forEach'", () => {
		it("encounters all", () => {
			const list = new PriorityList<number>();
			list.add(1);
			list.add(2);
			list.add(3);
			const encountered: number[] = [];
			list.forEach(value => encountered.push(value));
			expect(encountered).members([1, 2, 3]);
		});

		it("encounters all, whether or not there's a priority", () => {
			const list = new PriorityList<number>();
			list.add(4, -135);
			list.add(3, 8);
			list.add(2);
			list.add(1, -135);
			const encountered: number[] = [];
			list.forEach(value => encountered.push(value));
			expect(encountered).members([3, 2, 4, 1]);
			expect(list.getPriorities()).members([8, 0, -135]);
		});

		it("encounters all in an order based on their priority", () => {
			const list = new PriorityList<number>();
			list.add(1, -135);
			list.add(2);
			list.add(3, 8);
			const encountered: number[] = [];
			list.forEach(value => encountered.push(value));
			expect(encountered).ordered.members([3, 2, 1]);
			expect(list.getPriorities()).ordered.members([8, 0, -135]);
		});
	});

	it("cannot have more than one of the same value", () => {
		const list = new PriorityList<number>();
		list.add(1);
		list.add(1);
		const encountered: number[] = [];
		list.forEach(value => encountered.push(value));
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
			list.forEach(value => encountered.push(value));
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
			list.forEach(value => encountered.push(value));
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
			list.forEach(value => encountered.push(value));
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
		list.forEach(value => encountered.push(value));
		expect(encountered).members([]);
		expect(list.getPriorities()).members([]);
	});

	describe("'forEachAll'", () => {
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
			PriorityList.forEachAll(lists, value => encountered.push(value));
			expect(encountered).members([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
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
			PriorityList.forEachAll(lists, value => encountered.push(value));
			expect(encountered).ordered.members([12, 4, 5, 6, 9, 1, 2, 3, 7, 8, 10, 11]);
		});
	});
});
