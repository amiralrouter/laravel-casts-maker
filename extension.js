 
const vscode = require('vscode');

function writeCasts(page_content ){ 
	// find between '$attributes = [' and '];' by regex (multi lines)
	const attributes = page_content.match(/\$attributes = \[(.*?)\];/s)[1];


	// find between '$casts = [' and '];' by regex (multi lines)
	const casts = page_content.match(/\$casts = \[(.*?)\];/s)[1];
	
	// clear spaces after new line
	const attributes_cleared = attributes.replace(/\n\s+/g, '');
	// split by comma
	const attributes_array = attributes_cleared.split(','); 

	const cast_list = {};
	for(let i = 0; i < attributes_array.length; i++) {
		let attribute = attributes_array[i].trim();
		// if attribute is empty string, skip
		if(attribute === '') continue;
		// if attribute not contains '=>', skip
		if(!attribute.includes('=>')) continue;
	
		// remove comma from end of string
		attribute = attribute.replace(/\s*\,\s*$/, '');
		// remove spaces after "'" and before "=>" 
		attribute = attribute.replace(/\s*\'\s*=>/, '\' =>');
		// remove spaces after "=>"
		attribute = attribute.replace(/\=>\s*/, '=> ');
	
		// parse attribute as '{name}' => {value}
		let attribute_name = attribute.match(/'(.*?)' => (.*?)$/);
	
		let name = attribute_name[1];
		let value = attribute_name[2];

		// get value type for php type
		let type = 'string';
		// if value is numeric
		if(!isNaN(value)) {
			// if value is float
			if(value.includes('.')) {
				type = 'float';
			}
			// if value is integer
			else {
				type = 'integer';
			}
		}
		// if value is boolean
		else if(value === 'true' || value === 'false') {
			type = 'boolean';
		}
		// if value is array
		else if(value.includes('[')) {
			type = 'array';
		}
		// if value contains '_at'
		else if(value.includes('_at')) {
			type = 'date';
		}

		cast_list[name] = type;
	}
	// get space count after line and  before 'protected $casts = [' 
	const linehead_of_casts = page_content.match(/\n\s+protected\s+\$casts\s*=\s*\[/)[0];
	// get space count from line head to any char
	const space_count = linehead_of_casts.match(/^\s+/)[0].length - 1;
 

	// cast list to php array list with '=>'
	const cast_list_php = Object.keys(cast_list).map(key => `'${key}' => ${cast_list[key]}`).join(',\n' + ' '.repeat(space_count + 4 ));

	const new_cast_text = '$casts = [\n' + ' '.repeat(space_count + 4) + cast_list_php + '\n' + ' '.repeat(space_count) + '];';

	// replace casts list in page_content 
	page_content = page_content.replace(/\$casts = \[(.*?)\];/s, new_cast_text);

	return page_content;
}

function toggleButton(button){
	// get the active page language
	let editor = vscode.window.activeTextEditor;
	if (!editor) {
		return;
	}
	let page_language = editor.document.languageId;
	if(page_language === 'php') {
		button.show();
	}
	else {
		button.hide();
	}
}

function activate(context) {

	// Register the command
	let disposable = vscode.commands.registerCommand('laravel-casts-maker.fixCasts', function () {
		// get the active page content
		let editor = vscode.window.activeTextEditor;
		if (!editor) { 
			vscode.window.showErrorMessage('No active text editor');
			return;
		}
		let page_content = editor.document.getText();
		if(!page_content.includes('$attributes = [')) {
			vscode.window.showErrorMessage('No $casts found in page');
			return;
		}
		if(!page_content.includes('$casts = [')) {
			vscode.window.showErrorMessage('No $casts found in page');
			return;
		}
		let new_content = writeCasts(page_content);

		// replace document text with new text
		editor.edit(function(editBuilder) {
			editBuilder.replace(new vscode.Range(0, 0, editor.document.lineCount, 0), new_content);
		});

		vscode.window.showInformationMessage("Casts fixed successfully");

	});
	context.subscriptions.push(disposable);
 
 
	let button = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
	button.text = '$(bracket-dot) Fix casts';
	button.command = 'laravel-casts-maker.fixCasts';
	button.show();

	toggleButton(button);
 
	// when language is changed
	vscode.workspace.onDidChangeConfiguration(function() {
		toggleButton(button);
	});
	// on page changed
	vscode.window.onDidChangeActiveTextEditor(function() {
		toggleButton(button);
	});
}

// this method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}
