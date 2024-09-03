import * as vs from 'vscode';
import { PerfTipsProvider } from "./perftips";
import { CodeMapProvider } from "./codemap";

// this method is called when your extension is activated
export function activate(context: vs.ExtensionContext) {
	const perftips = new PerfTipsProvider();
	let disposable = vs.debug.registerDebugAdapterTrackerFactory("*", {
		createDebugAdapterTracker(_session: vs.DebugSession) {
			return perftips;
		}
	});
	context.subscriptions.push(disposable);

	// when the command is run a debug session is already active
	// then it'd be too late to register the tracker, so do it eagerly
	const codemap = new CodeMapProvider();
	disposable =  vs.commands.registerCommand("debug-utils.showCodeMap", () => {
		codemap.activate();
	});
	context.subscriptions.push(disposable);

	disposable = vs.debug.registerDebugAdapterTrackerFactory("*", {
		createDebugAdapterTracker(_session: vs.DebugSession) {
			return codemap; // null is also possible
		}
	});
	context.subscriptions.push(disposable);

	disposable = vs.workspace.registerTextDocumentContentProvider("dot", codemap);
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
