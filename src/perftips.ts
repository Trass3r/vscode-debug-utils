import * as vs from 'vscode';

export class Tracker implements vs.DebugAdapterTracker  {

	private executionStartedTimestamp = new Date();
	private decorationType: vs.TextEditorDecorationType = vs.window.createTextEditorDecorationType({
		after: {
			margin: '0 0 0 3em',
			backgroundColor: new vs.ThemeColor('gitlens.trailingLineBackgroundColor'),
			color: new vs.ThemeColor('gitlens.trailingLineForegroundColor'),
			fontWeight: 'normal',
			fontStyle: 'normal',
			textDecoration: 'none',
		},
		rangeBehavior: vs.DecorationRangeBehavior.ClosedOpen
	});

	// show debugger PerfTip with elapsed time
	private async onStoppedEvent(e: any) {
		const diff = <any>new Date() - <any>this.executionStartedTimestamp;
		const srcuri = vs.debug.asDebugSourceUri(e.source);
		const document = await vs.workspace.openTextDocument(srcuri);
		const editor = await vs.window.showTextDocument(document);

		const pos = new vs.Position(e.line - 1, Number.MAX_SAFE_INTEGER);
		const decorators = [{
			range: new vs.Range(pos, pos),
			renderOptions: {
				after: {
					contentText: `≤${diff}ms elapsed`,
				}
			}
		}];
		editor.setDecorations(this.decorationType, decorators);
	}

	onDidSendMessage(msg: any) { // msg: vs.DebugProtocolMessage
		//console.log(`< ${typeof msg} ${JSON.stringify(msg, undefined, 2)}`);
		if (msg.type === "event" && msg.event === "stopped") {
			this.onStoppedEvent(msg.body);
			return;
		}
	}

	onWillReceiveMessage(msg: any) { // msg: vs.DebugProtocolMessage
		//console.log(`> ${typeof msg} ${JSON.stringify(msg, undefined, 2)}`);
		if (msg.type !== "request")
			return;

		switch (msg.command as string) {
			case "next":
			case "stepIn":
			case "stepOut":
			case "continue":
				break;
			default:
				return;
		}

		this.executionStartedTimestamp = new Date();
	}
}