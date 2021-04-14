import mocha from "gulp-mocha";
import Task, { Pipe, remove, Series, watch } from "./gulp/Task";
import TypescriptWatch from "./gulp/TypescriptWatch";


////////////////////////////////////
// Tasks
//

const initBuildFolder = new Series(remove("build"))
	.then("init-build-folder", Pipe.create(["package.json", "package-lock.json", "LICENSE", "README.md"])
		.pipe("build"));

Task.create("mocha", Pipe.create("tests/**/*.ts", { read: false })
	.pipe(() => mocha({ reporter: "even-more-min", require: ["ts-node/register"] } as any))
	.on("error", () => process.exitCode = 1));


////////////////////////////////////
// Compile
//

const compileCommonJS = async () => new TypescriptWatch("src", "build").once();
const compileAMD = async () => new TypescriptWatch("src", "build/amd", "--module AMD --moduleResolution node").once();

new Task("compile-test", initBuildFolder)
	.then("compile", compileCommonJS, compileAMD)
	.then("mocha")
	.create();


////////////////////////////////////
// Watch
//

const watchCommonJS = async () => new TypescriptWatch("src", "build")
	.onComplete(Task.get("mocha"))
	.watch()
	.waitForInitial();

const watchAMD = async () => new TypescriptWatch("src", "build/amd", "--module AMD --moduleResolution node")
	.watch()
	.waitForInitial();

new Task("watch", initBuildFolder)
	.then("compile-test", watchCommonJS, watchAMD)
	.then("watch-tests", watch("tests/**/*.ts", "mocha"))
	.then("mocha")
	.create();


////////////////////////////////////
// Default
//

Task.create("default", "watch");
