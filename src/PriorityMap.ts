import Stream from "@wayward/goodstream";

/**
 * Used for ordering a list of items by "priority". Higher priorities come before lower priorities.
 */
export class PriorityMap<T> {

	public static all<T extends Iterable<any>> (...lists: PriorityMap<T>[]) {
		return lists
			.flatMap(list => list.priorities)
			.sort()
			// don't include priorities identical to previous priorities
			.filter((priority, index, priorities) => !index || priority !== priorities[index - 1])
			.flatMap(priority => lists
				.filter(list => priority in list.map)
				.map(list => list.map[priority]));
	}

	public static streamAll<T extends Iterable<any>> (...lists: PriorityMap<T>[]) {
		return Stream.from(lists
			.flatMap(list => list.priorities)
			.sort()
			.filter((priority, index, priorities) => !index || priority !== priorities[index - 1]))
			// don't include priorities identical to previous priorities
			.flatMap(priority => Stream.from(lists)
				.filter(list => priority in list.map)
				.map(list => list.map[priority]));
	}

	private readonly priorities: number[] = [];
	private readonly map: { [key: number]: T } = {};

	public get size () {
		return this.priorities.length;
	}

	public getOrDefault (priority: number): T | undefined;
	public getOrDefault (priority: number, orDefault: (priority: number) => T, assign?: boolean): T;
	public getOrDefault (priority: number, orDefault?: (priority: number) => T, assign?: boolean): T | undefined;
	public getOrDefault (priority: number, orDefault?: (priority: number) => T, assign = false) {
		let value = this.map[priority];

		if (!(priority in this.map) && orDefault) {
			value = orDefault(priority);
			if (assign) {
				this.map[priority] = value;
				this.priorities.push(priority);
				this.priorities.sort();
			}
		}

		return value;
	}

	public delete (priority: number) {
		if (priority in this.map) {
			delete this.map[priority];
			const priorityIndex = this.priorities.indexOf(priority);
			if (priorityIndex > -1)
				this.priorities.splice(priorityIndex, 1);

			return true;
		}

		return false;
	}

	/**
	 * Retains the entries from this set that match the given predicate function, any other entries will be deleted.
	 * @param predicate A predicate that takes a key and a value, and returns a value which will be checked for truthiness.
	 * @returns whether any entries remain.
	 */
	public retainWhere (predicate: (val: T, key: number) => any): boolean;
	/**
	 * If this map contains the given key, checks whether the entry matches the given predicate. 
	 * If it does, it is kept. If not, it's deleted.
	 * @param predicate A predicate that takes a key and a value, and returns a value which will be checked for truthiness.
	 * @returns whether any entries remain in this map.
	 */
	public retainWhere (key: number, predicate: (val: T, key: number) => any): boolean;
	public retainWhere (retainKey: number | ((val: T, key: number) => any), predicate?: (val: T, key: number) => any) {
		if (predicate === undefined) {
			predicate = retainKey as (val: T, key: number) => any;
			for (const priority of this.priorities) {
				const value = this.map[priority];
				if (!predicate(value, priority)) {
					this.delete(priority);
				}
			}

		} else {
			const priority = retainKey as number;
			if (priority in this.map) {
				const value = this.map[priority];
				if (!predicate(value, priority)) {
					this.delete(priority);
				}
			}
		}

		return this.size > 0;
	}

	/**
	 * Returns an iterator of the items in this list.
	 */
	public values () {
		return this.priorities
			.map(priority => this.map[priority]);
	}

	public getInternalMap () {
		return this.map;
	}
}

// export enum PriorityListStreamDirection {
// 	HighestToLowest = -1,
// 	LowestToHighest = 1,
// }
