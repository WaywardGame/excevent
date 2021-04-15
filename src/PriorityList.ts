export interface IPriorityListMapApi {
	break: boolean;
}

export default class PriorityList<T> {

	public static mapAll<T, RETURN> (lists: PriorityList<T>[], consumer: (api: IPriorityListMapApi, value: T) => RETURN): RETURN[];
	public static mapAll<T, RETURN, API extends IPriorityListMapApi> (lists: PriorityList<T>[], consumer: (api: API, value: T) => RETURN, api: API): RETURN[];
	public static mapAll<T, RETURN> (lists: PriorityList<T>[], consumer: (api: IPriorityListMapApi, value: T) => RETURN, api: IPriorityListMapApi = { break: false }) {
		interface IIndexedList {
			list: PriorityList<T>;
			index: number;
			done: boolean;
		}

		const result: RETURN[] = [];
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

			for (const value of list.listsByPriority.get(highestPriority!)!) {
				result.push(consumer(api, value));
				if (api.break) {
					return result;
				}
			}

			if (done === listCount)
				break;
		}

		return result;
	}

	private readonly listsByPriority = new Map<number, Set<T>>();
	private readonly priorities: number[] = [];

	public add (value: T, priority = 0) {
		this.getPriority(priority).add(value);
		return this;
	}

	public addMultiple (priority = 0, ...values: T[]) {
		const list = this.getPriority(priority);
		for (const value of values)
			list.add(value);

		return this;
	}

	public remove (value: T, priority = 0) {
		const list = this.listsByPriority.get(priority);
		if (list) {
			list.delete(value);
			if (list.size === 0)
				this.deletePriority(priority);
		}

		return this;
	}

	public removeMultiple (priority = 0, ...values: T[]) {
		const list = this.listsByPriority.get(priority);
		if (list) {
			for (const value of values)
				list.delete(value);

			if (list.size === 0)
				this.deletePriority(priority);
		}

		return this;
	}

	public clear () {
		this.listsByPriority.clear();
		this.priorities.splice(0, Infinity);
		return this;
	}

	public has (value: T, priority = 0) {
		return this.listsByPriority.get(priority)?.has(value) ?? false;
	}

	public map<RETURN> (consumer: (api: IPriorityListMapApi, value: T) => RETURN): RETURN[];
	public map<RETURN, API extends IPriorityListMapApi> (consumer: (api: API, value: T) => RETURN, api: API): RETURN[];
	public map<RETURN> (consumer: (api: IPriorityListMapApi, value: T) => RETURN, api: IPriorityListMapApi = { break: false }) {
		const result: RETURN[] = [];
		for (const priority of this.priorities) {
			for (const value of this.listsByPriority.get(priority)!) {
				result.push(consumer(api, value));
				if (api.break) {
					return result;
				}
			}
		}

		return result;
	}

	public getPriorities (): readonly number[] {
		return this.priorities;
	}

	private getPriority (priority: number) {
		const map = this.listsByPriority;
		let list = map.get(priority);
		if (!list) {
			map.set(priority, list = new Set());
			const priorities = this.priorities;
			priorities.splice(sortedIndex(priorities, priority) + 1, 0, priority);
		}

		return list;
	}

	private deletePriority (priority: number) {
		this.listsByPriority.delete(priority);
		const priorities = this.priorities;
		priorities.splice(sortedIndex(priorities, priority), 1);
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
