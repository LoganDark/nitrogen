import * as path         from 'path'
import {AccountSettings} from './database'

export const starterSettings: AccountSettings = {
	editor: {
		acceptSuggestionOnCommitCharacter: true,
		acceptSuggestionOnEnter          : 'on',
		accessibilitySupport             : 'auto',
		ariaLabel                        : '',
		autoClosingBrackets              : 'always',
		autoIndent                       : true, // false,
		automaticLayout                  : true,
		codeLens                         : true,
		contextmenu                      : true,
		cursorBlinking                   : 'blink',
		cursorStyle                      : 'line',
		disableLayerHinting              : false,
		disableMonospaceOptimizations    : false,
		dragAndDrop                      : false,
		emptySelectionClipboard          : false,
		extraEditorClassName             : '',
		fixedOverflowWidgets             : false,
		folding                          : true,
		fontFamily                       : 'Inconsolata',
		fontLigatures                    : true, // false,
		fontSize                         : 14,
		fontWeight                       : '100', // 'normal',
		formatOnPaste                    : false,
		formatOnType                     : false,
		glyphMargin                      : false,
		hideCursorInOverviewRuler        : false,
		hover                            : {
			enabled: true,
			delay  : 300,
			sticky : true
		},
		iconsInSuggestions               : true,
		letterSpacing                    : 0,
		lineDecorationsWidth             : 10,
		lineHeight                       : 16,
		lineNumbers                      : 'on',
		lineNumbersMinChars              : 5,
		links                            : false, // true,
		matchBrackets                    : true,
		mouseWheelScrollSensitivity      : 1,
		mouseWheelZoom                   : false,
		multiCursorModifier              : 'ctrlCmd', // 'alt',
		occurrencesHighlight             : true,
		overviewRulerBorder              : true,
		overviewRulerLanes               : 2,
		parameterHints                   : {
			enabled: true,
			cycle  : false
		},
		quickSuggestions                 : true,
		quickSuggestionsDelay            : 500,
		readOnly                         : false,
		renderControlCharacters          : true, // false,
		renderIndentGuides               : true, // false,
		renderLineHighlight              : 'none', // 'all',
		renderWhitespace                 : 'all', // 'none',
		revealHorizontalRightPadding     : 30,
		roundedSelection                 : true,
		rulers                           : [],
		scrollBeyondLastLine             : false, // true,
		selectOnLineNumbers              : true,
		selectionClipboard               : true,
		selectionHighlight               : true,
		showFoldingControls              : 'always', // 'mouseover',
		snippetSuggestions               : 'bottom',
		stopRenderingLineAfter           : -1,
		suggestFontSize                  : 14,
		suggestLineHeight                : 16, // 14,
		suggestOnTriggerCharacters       : true,
		useTabStops                      : true, // false,
		wordBasedSuggestions             : true,
		wordSeparators                   : '`~!@#$%^&*()-=+[{]}\\|;:\\\'",.<>/?',
		wordWrap                         : 'on', // 'off',
		wordWrapBreakAfterCharacters     : ' \t})]?|&,;',
		wordWrapBreakBeforeCharacters    : '{([+',
		wordWrapBreakObtrusiveCharacters : '.',
		wordWrapColumn                   : 80,
		wordWrapMinified                 : true,
		wrappingIndent                   : 'same', // 'none',

		// language             : 'html',
		theme               : 'vs-dark',
		accessibilityHelpUrl: ''
	}
}

export const backendLocation = path.resolve(__dirname, '../..')
export const dataLocation = path.resolve(backendLocation, 'data.json')
export const configLocation = path.resolve(backendLocation, 'config.json')
export const appLocation = path.resolve(backendLocation, 'app')
export const packageJsonLocation = path.resolve(backendLocation, 'package.json')
export const hexazineVersion: number = require(packageJsonLocation).version
