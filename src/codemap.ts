import * as vs from 'vscode';
import { DebugProtocol as dap } from '@vscode/debugprotocol';
import * as gv from "ts-graphviz";

/** @sealed */
export class CodeMapProvider implements vs.DebugAdapterTracker, vs.TextDocumentContentProvider  {
	dotDocument?: vs.TextDocument;
	graph: gv.Digraph;
	active = false;

	async activate() : Promise<void> {
		this.graph = gv.digraph('Call Graph', { splines: true }); // reset the graph

		this.dotDocument = await vs.workspace.openTextDocument(vs.Uri.parse('dot:callgraph.dot', true));
		this.active = true;

		// save the current editor
		const activeEditor = vs.window.activeTextEditor;
		// show the `dot` source
		vs.window.showTextDocument(this.dotDocument, vs.ViewColumn.Beside, true);

		const args = {
			document: this.dotDocument,
			callback: (panel: any /* PreviewPanel */) => {
				// we have to switch back to the original editor group to prevent issues
				const webpanel: vs.WebviewPanel = panel.panel;
				const disposable = webpanel.onDidChangeViewState(e => {
					if (activeEditor)
						vs.window.showTextDocument(activeEditor.document, activeEditor.viewColumn, false);
					disposable.dispose();
				});
				// handle user closing the graphviz preview
				webpanel.onDidDispose(e => {
					this.active = false;
					// there's no way to close a document, only this
					// FIXME: if the editor is not in the active view column, this opens a new one and closes it
					vs.window.showTextDocument(this.dotDocument!, vs.ViewColumn.Active, false)
						.then(() => {
							return vs.commands.executeCommand('workbench.action.closeActiveEditor');
						});
					this.graph.clear();
					this.onDidChangeEmitter.fire(this.dotDocument!.uri);
					this.dotDocument = undefined; // FIXME: does not delete the document
				});
			},
			allowMultiplePanels: false,
			title: 'Call Graph',
		};

		vs.commands.executeCommand("graphviz-interactive-preview.preview.beside", args);
	}

	/** @override TextDocumentContentProvider */
	provideTextDocumentContent(uri: vs.Uri, token: vs.CancellationToken): vs.ProviderResult<string> {
		// here we update the source .dot document
		if (uri.path != 'callgraph.dot')
			return;
		return gv.toDot(this.graph);
	}

	// https://code.visualstudio.com/api/extension-guides/virtual-documents#update-virtual-documents
	onDidChangeEmitter = new vs.EventEmitter<vs.Uri>();
	onDidChange = this.onDidChangeEmitter.event; // without this the emitter silently doesn't work

	/** @override DebugAdapterTracker */
	// onWillStartSession() {}

	/** @override DebugAdapterTracker */
	// onWillStopSession() {}

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

		let lastNode = this.getOrCreateNode(CodeMapProvider.wordwrap(r.body.stackFrames[0].name, 64));
		// prevent re-rendering if we're still in the same function
		if (lastNode.attributes.get("color"))
			return;

		// mark the current function with a red border
		for (const f of this.graph.nodes)
			f.attributes.delete("color");
		lastNode.attributes.set("color", "red");

		// walk up the stack and create nodes/edges
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

	/** @override DebugAdapterTracker */
	onDidSendMessage(msg: dap.ProtocolMessage) {
		if (!this.active)
			return;

		if (msg.type !== "response" || (msg as dap.Response).command !== "stackTrace")
			return;

		this.onStackTraceResponse(msg as dap.StackTraceResponse);
	}
}