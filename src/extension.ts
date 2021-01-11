import * as vs from 'vscode';
import { PerfTipsProvider } from "./perftips";

// this method is called when your extension is activated
export function activate(context: vs.ExtensionContext) {
	const tracker = new PerfTipsProvider();
	const disposable = vs.debug.registerDebugAdapterTrackerFactory("*", {
		createDebugAdapterTracker(_session: vs.DebugSession) {
			return tracker;
		}
	});
	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {
}
