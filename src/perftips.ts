import * as vs from 'vscode';
import { DebugProtocol as dap } from 'vscode-debugprotocol';

export class PerfTipsProvider implements vs.DebugAdapterTracker  {

	private decorationType: vs.TextEditorDecorationType;

	// @override
	onWillStartSession() {
		this.decorationType = vs.window.createTextEditorDecorationType({
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
		this.executionStartedTimestamp = new Date();
	}

	// @override
	onWillStopSession() {
		this.decorationType.dispose();
	}

	// we need to gather information from 3 different messages to do our job...
	private executionStartedTimestamp = new Date();
	private executionTime: number = 0;
	private currentThread: number | undefined = undefined;
	private stackTraceReqNumber: number = 0;

	private onStoppedEvent(e: dap.StoppedEvent) {
		// some debuggers may send multiple stopped events for a single stop-all operation
		// https://github.com/microsoft/vscode-debugadapter-node/issues/147#issuecomment-370867756
		if (e.body.preserveFocusHint)
			return;

		this.executionTime = <any>new Date() - <any>this.executionStartedTimestamp;
		this.currentThread = e.body.threadId;
	}

	private onStackTraceRequest(r: dap.StackTraceRequest) {
		if (!this.currentThread)
			return;
		if (r.arguments.threadId !== this.currentThread)
			return;
		if (r.arguments.startFrame)
			return;

		this.stackTraceReqNumber = r.seq;
	}

	private async onStackTraceResponse(r: dap.StackTraceResponse) {
		if (r.request_seq !== this.stackTraceReqNumber || !r.success || r.body.stackFrames.length < 1)
			return;

		const frame = r.body.stackFrames[0];
		if (!frame.source)
			return;

		// work around https://github.com/microsoft/vscode/issues/114229
		const srcuri = frame.source.sourceReference ? vs.debug.asDebugSourceUri(frame.source) : vs.Uri.file(frame.source.path!);
		// FIXME: this will open another editor if we are in a different view column
		const editor = await vs.window.showTextDocument(srcuri);

		const pos = new vs.Position(frame.line - 1, Number.MAX_SAFE_INTEGER);
		const decorators = [{
			range: new vs.Range(pos, pos),
			renderOptions: {
				after: {
					contentText: `≤${this.executionTime}ms elapsed`,
				}
			}
		}];
		editor.setDecorations(this.decorationType, decorators);
	}

	// @override
	onDidSendMessage(msg: dap.ProtocolMessage) {
		if (msg.type === "event" && (msg as dap.Event).event === "stopped") {
			this.onStoppedEvent(msg as dap.StoppedEvent);
			return;
		}

		if (msg.type !== "response" || (msg as dap.Response).command !== "stackTrace")
			return;

		this.onStackTraceResponse(msg as dap.StackTraceResponse);
	}

	// @override
	onWillReceiveMessage(msg: dap.ProtocolMessage) {
		if (msg.type !== "request")
			return;

		switch ((msg as dap.Request).command as string) {
			case "next":
			case "stepIn":
			case "stepOut":
			case "continue":
				this.executionStartedTimestamp = new Date();
				break;
			case "stackTrace":
				this.onStackTraceRequest(msg as dap.StackTraceRequest);
				break;
			default:
				return;
		}
	}
}