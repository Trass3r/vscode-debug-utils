import * as vs from 'vscode';
import { PerfTipsProvider } from "./perftips";

// this method is called when your extension is activated
export function activate(context: vs.ExtensionContext) {
	const tracker = new PerfTipsProvider();
	let disposable = vs.debug.registerDebugAdapterTrackerFactory("*", {
		createDebugAdapterTracker(_session: vs.DebugSession) {
			return tracker;
		}
	});
	context.subscriptions.push(disposable);

	const logDAP = vs.workspace.getConfiguration('debug-utils').get('logDAP');
	if (logDAP) {
		const outputChannel = vs.window.createOutputChannel("PerfTips");
		outputChannel.show();
		context.subscriptions.push(outputChannel);

		disposable = vs.debug.registerDebugAdapterTrackerFactory('*', {
			createDebugAdapterTracker(_session: vs.DebugSession) {
				return {
					onWillReceiveMessage: m => outputChannel.appendLine(`> ${JSON.stringify(m, undefined, 2)}`),
					onDidSendMessage:     m => outputChannel.appendLine(`< ${JSON.stringify(m, undefined, 2)}`)
				};
			}
		});
		context.subscriptions.push(disposable);
	}
}

// this method is called when your extension is deactivated
export function deactivate() {
}
