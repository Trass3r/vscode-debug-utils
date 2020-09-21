import * as vs from 'vscode';
import { Tracker } from "./tracker";

// this method is called when your extension is activated
export function activate(context: vs.ExtensionContext) {
	const tracker = new Tracker();
	const disposable = vs.debug.registerDebugAdapterTrackerFactory("*", {
		createDebugAdapterTracker(session: vs.DebugSession) {
			return tracker;
		}
	});
	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {
}
