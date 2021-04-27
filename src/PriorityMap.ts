export interface IPriorityListMapApi {
	break: boolean;
}

export default class PriorityMap<T> {

	public static mapAll<T, RETURN> (lists: PriorityMap<T>[], consumer: (api: IPriorityListMapApi, value: T) => RETURN): RETURN[];
	public static mapAll<T, RETURN, API extends IPriorityListMapApi> (lists: PriorityMap<T>[], consumer: (api: API, value: T) => RETURN, api: API): RETURN[];
	public static mapAll<T, RETURN> (lists: PriorityMap<T>[], consumer: (api: IPriorityListMapApi, value: T) => RETURN, api: IPriorityListMapApi = { break: false }) {
		interface IIndexedList {
			map: PriorityMap<T>;
			index: number;
			done: boolean;
		}

		const result: RETURN[] = [];
		const listCount = lists.length;
		const indexedLists: IIndexedList[] = lists.map(map => ({ map, index: 0, done: false }));
		let done = 0;
		while (true) {
			let highest!: IIndexedList;
			let highestPriority: number | undefined;
			for (const current of indexedLists) {
				if (current.done)
					continue;

				const priority = current.map.priorities[current.index];
				if (highestPriority === undefined || priority > highestPriority) {
					highest = current;
					highestPriority = priority;
				}
			}

			const map = highest.map;
			if (map.priorities.length === ++highest.index) {
				highest.done = true;
				done++;
			}

			const value = map.internalMap.get(highestPriority!)!;
			result.push(consumer(api, value));
			if (api.break) {
				return result;
			}

			if (done === listCount)
				break;
		}

		return result;
	}

	private readonly internalMap = new Map<number, T>();
	private readonly priorities: number[] = [];

	public get (priority = 0) {
		return this.internalMap.get(priority);
	}

	public set (value: T, priority = 0) {
		if (!this.internalMap.has(priority))
			this.addPriority(priority);
		this.internalMap.set(priority, value)
		return this;
	}

	public remove (priority = 0) {
		if (this.internalMap.delete(priority))
			this.deletePriority(priority);
		return this;
	}

	public clear () {
		this.internalMap.clear();
		this.priorities.splice(0, Infinity);
		return this;
	}

	public has (priority = 0) {
		return this.internalMap.has(priority);
	}

	public map<RETURN> (consumer: (api: IPriorityListMapApi, value: T) => RETURN): RETURN[];
	public map<RETURN, API extends IPriorityListMapApi> (consumer: (api: API, value: T) => RETURN, api: API): RETURN[];
	public map<RETURN> (consumer: (api: IPriorityListMapApi, value: T) => RETURN, api: IPriorityListMapApi = { break: false }) {
		const result: RETURN[] = [];
		for (const priority of this.priorities) {
			const value = this.internalMap.get(priority)!;
			result.push(consumer(api, value));
			if (api.break) {
				return result;
			}
		}

		return result;
	}

	public getPriorities (): readonly number[] {
		return this.priorities;
	}

	private addPriority (priority: number) {
		const priorities = this.priorities;
		const sorted = sortedIndex(priorities, priority);
		priorities.splice(sorted, 0, priority);
	}

	private deletePriority (priority: number) {
		const priorities = this.priorities;
		priorities.splice(sortedIndex(priorities, priority), 1);
	}
}

function sortedIndex (array: number[], value: number) {
	let low = 0;
	let high = array.length;

	while (low < high) {
		const mid = (low + high) >>> 1;
		if (array[mid] > value) low = mid + 1;
		else high = mid;
	}

	return low;
}
