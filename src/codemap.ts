import * as vs from 'vscode';
import { DebugProtocol as dap } from '@vscode/debugprotocol';
import * as gv from "ts-graphviz";

/** @sealed */
export class CodeMapProvider implements vs.DebugAdapterTracker, vs.TextDocumentContentProvider  {
	dotDocument?: vs.TextDocument;
	graph: gv.Digraph;

	constructor() {
		this.graph = gv.digraph('Call Graph', { splines: true });
	}

	/** @override */
	provideTextDocumentContent(uri: vs.Uri, token: vs.CancellationToken): vs.ProviderResult<string> {
		// here we update the source .dot document
		// TODO: actually check uri
		return gv.toDot(this.graph);
	}

	// https://code.visualstudio.com/api/extension-guides/virtual-documents#update-virtual-documents
	onDidChangeEmitter = new vs.EventEmitter<vs.Uri>();
	onDidChange = this.onDidChangeEmitter.event; // without this the emitter silently doesn't work

	async onWillStartSession() {
		this.dotDocument = await vs.workspace.openTextDocument(vs.Uri.parse('dot:1.dot', true));
		this.graph = gv.digraph('Call Graph', { splines: true }); // reset the graph

		// used for debugging
		vs.window.showTextDocument(this.dotDocument, { preview: false });

		const args = {
			document: this.dotDocument,
			callback: (webpanel: any) => {
				// The callback function receives the newly created webPanel.
				// Overload webPanel.handleMessage(message) to receive message events like onClick and onDblClick
				//console.log(JSON.stringify(webpanel, undefined, 2));
			},
			allowMultiplePanels: false,
			title: 'Call Graph',
		};

		vs.commands.executeCommand("graphviz-interactive-preview.preview.beside", args);
	}

	onWillStopSession() {
		this.dotDocument = undefined;
		this.graph.clear();
	}

	private getOrCreateNode(name: string) {
		return this.graph.getNode(name) ?? this.graph.createNode(name, { shape: "box" });
	}

	private static wordwrap(str : string, width : number, brk : string = '\n', cut : boolean = false) {
		if (!str)
			return str;

		const regex = '.{1,' + width + '}(\s|$)' + (cut ? '|.{' + width + '}|.+$' : '|\S+?(\s|$)');
		return str.match(RegExp(regex, 'g'))!.join(brk);
	}

	private async onStackTraceResponse(r: dap.StackTraceResponse) {
		if (!r.success || r.body.stackFrames.length < 1)
			return;

		for (const f of this.graph.nodes)
			f.attributes.delete("color");

		let lastNode = this.getOrCreateNode(CodeMapProvider.wordwrap(r.body.stackFrames[0].name, 64));
		lastNode.attributes.set("color", "red");
		for (let i = 1; i < r.body.stackFrames.length; ++i) {
			const nodeName = CodeMapProvider.wordwrap(r.body.stackFrames[i].name, 64);
			const node = this.getOrCreateNode(nodeName);
			if (!this.graph.edges.find(e => {
				return (e.targets[0] as gv.INode).id === nodeName &&
				       (e.targets[1] as gv.INode).id === lastNode.id;
				}))
				this.graph.createEdge([node, lastNode]);
			lastNode = node;
		}
		this.onDidChangeEmitter.fire(this.dotDocument!.uri);
	}

	/** @override */
	onDidSendMessage(msg: dap.ProtocolMessage) {
		console.log(`< ${typeof msg} ${JSON.stringify(msg, undefined, 2)}`);
		if (msg.type !== "response" || (msg as dap.Response).command !== "stackTrace")
			return;

		this.onStackTraceResponse(msg as dap.StackTraceResponse);
	}
}