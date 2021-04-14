export default class PriorityList<T> {

	public static forEachAll<T> (lists: PriorityList<T>[], consumer: (value: T) => any) {
		interface IIndexedList {
			list: PriorityList<T>;
			index: number;
			done: boolean;
		}

		const listCount = lists.length;
		const indexedLists: IIndexedList[] = lists.map(list => ({ list, index: 0, done: false }));
		let done = 0;
		while (true) {
			let highest!: IIndexedList;
			let highestPriority: number | undefined;
			for (const current of indexedLists) {
				if (current.done)
					continue;

				const priority = current.list.priorities[current.index];
				if (highestPriority === undefined || priority > highestPriority) {
					highest = current;
					highestPriority = priority;
				}
			}

			const list = highest.list;
			if (list.priorities.length === ++highest.index) {
				highest.done = true;
				done++;
			}

			for (const value of list.map.get(highestPriority!)!)
				consumer(value);

			if (done === listCount)
				break;
		}
	}

	private readonly map = new Map<number, Set<T>>();
	private readonly priorities: number[] = [];

	public add (value: T, priority = 0) {
		const map = this.map;
		let list = map.get(priority);
		if (!list) {
			map.set(priority, list = new Set());
			const priorities = this.priorities;
			priorities.splice(sortedIndex(priorities, priority) + 1, 0, priority);
		}

		list.add(value);
		return this;
	}

	public remove (value: T, priority = 0) {
		const list = this.map.get(priority);
		if (list) {
			list.delete(value);
			if (list.size === 0) {
				this.map.delete(priority);
				const priorities = this.priorities;
				priorities.splice(sortedIndex(priorities, priority), 1);
			}
		}

		return this;
	}

	public clear () {
		this.map.clear();
		this.priorities.splice(0, Infinity);
		return this;
	}

	public has (value: T, priority = 0) {
		return this.map.get(priority)?.has(value) ?? false;
	}

	public forEach (consumer: (value: T) => any) {
		for (const priority of this.priorities)
			for (const value of this.map.get(priority)!)
				consumer(value);

		return this;
	}

	public getPriorities (): readonly number[] {
		return this.priorities;
	}
}

function sortedIndex (array: number[], value: number) {
	let low = 0;
	let high = array.length;

	while (low < high) {
		const mid = (low + high) >>> 1;
		if (array[mid] < value) low = mid + 1;
		else high = mid;
	}

	return array.length - 1 - low;
}
