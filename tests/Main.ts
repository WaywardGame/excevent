import chai from "chai";
import chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised);
const expect = chai.expect;

async function sleep<T>(ms: number, returnValue?: T) {
	return new Promise<T>(resolve => setTimeout(() => resolve(returnValue), ms));
}

