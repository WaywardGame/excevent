// import PriorityList from "./PriorityList";

// type EventRecord = Record<string, (...args: any[]) => any>;
// type EventParameters<EVENTS extends EventRecord, EVENT extends keyof EVENTS = keyof EVENTS> = Parameters<EVENTS[EVENT]>;
// type EventReturn<EVENTS extends EventRecord, EVENT extends keyof EVENTS = keyof EVENTS> = ReturnType<EVENTS[EVENT]>;
// type EventHandler<EVENTS extends EventRecord, EVENT extends keyof EVENTS = keyof EVENTS> = (...parameters: Parameters<EVENTS[EVENT]>) => ReturnType<EVENTS[EVENT]>;


// export class Emitter<EVENTS extends EventRecord> {

// 	private subscriptions: Record<keyof EVENTS, PriorityList<EventHandler<EVENTS>>>;

// 	public emit<EVENT extends keyof EVENTS> (event: EVENT, ...args: EventParameters<EVENTS, EVENT>) {
// 		const subscriptions = this.subscriptions[event];
// 	}
// }
