const vscode = require('vscode');
const moment = require('moment-timezone');

function activate(context) {
    let decorationType = vscode.window.createTextEditorDecorationType({
        after: {
            margin: '0 0 0 1em',
            color: 'gray',
        }
    });

    function updateDecorations(editor) {
        if (!editor) return;

        const config = vscode.workspace.getConfiguration('timee');
        const sourceTimezone = config.get('sourceTimezone', 'UTC');
        const targetTimezone = config.get('targetTimezone', 'UTC');
        const logPattern = /\b(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?)\b/g;

        let decorations = [];
        let text = editor.document.getText();

        let match;
        while ((match = logPattern.exec(text)) !== null) {
            let timestamp = match[1];
            let convertedTime = moment.tz(timestamp, sourceTimezone).tz(targetTimezone).format('YYYY-MM-DD HH:mm:ss z');

            let startPos = editor.document.positionAt(match.index);
            let endPos = editor.document.positionAt(match.index + timestamp.length);
            let range = new vscode.Range(startPos, endPos);

            decorations.push({ range, renderOptions: { after: { contentText: ` (${convertedTime})` } } });
        }

        editor.setDecorations(decorationType, decorations);
    }

    function setTimezone(settingKey) {
        vscode.window.showInputBox({ prompt: `Enter timezone for ${settingKey} (e.g., Australia/Adelaide)` })
            .then(value => {
                if (value) {
                    vscode.workspace.getConfiguration('timee').update(settingKey, value, vscode.ConfigurationTarget.Global, true)
                        .then(() => {
                            vscode.window.showInformationMessage(`${settingKey} set to ${value}`);
                            if (vscode.window.activeTextEditor) {
                                updateDecorations(vscode.window.activeTextEditor);
                            }
                        }, error => {
                            vscode.window.showErrorMessage(`Failed to update ${settingKey}: ${error.message}`);
                        });
                }
            });
    }

    let activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) updateDecorations(activeEditor);

    vscode.window.onDidChangeActiveTextEditor(editor => {
        activeEditor = editor;
        if (activeEditor) updateDecorations(activeEditor);
    }, null, context.subscriptions);

    vscode.workspace.onDidChangeTextDocument(event => {
        if (activeEditor && event.document === activeEditor.document) {
            updateDecorations(activeEditor);
        }
    }, null, context.subscriptions);

    context.subscriptions.push(
        vscode.commands.registerCommand('timee.setSourceTimezone', () => setTimezone('sourceTimezone')),
        vscode.commands.registerCommand('timee.setTargetTimezone', () => setTimezone('targetTimezone'))
    );
}

function deactivate() { }

module.exports = { activate, deactivate };
