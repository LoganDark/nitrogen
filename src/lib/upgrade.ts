// A script used by `api.ts` to update the structure of `data.json` to support
// adding new features or changing existing ones. Uses the `version` property
// to determine what upgrades to apply.

import {assertEquals}     from 'typescript-is'
import {safeShutdown}     from '../app/servers'
import {ApiData, Project} from '../types/database'
import {Upgrades}         from '../types/hexazine'
import {starterSettings}  from '../types/vars'
import {makeDebug}        from './logger'
import {isIntStr}         from './utils'
import uuid = require('uuid')
import IEditorConstructionOptions = monaco.editor.IEditorConstructionOptions

const debug = makeDebug('upgrade', 6)

const allUpgrades: Upgrades = [
	async (data: any) => {
		for (const accKey of Object.keys(data.accounts)) {
			const acc = data.accounts[accKey]

			for (const proj of acc.projects) {
				proj.type = 0
			}
		}
	},
	async (data: any) => {
		data.starterCodes = [
			'<!doctype html>\n' +
			'<html>\n' +
			'\t<head>\n' +
			'\t\t<meta charset="utf-8">\n' +
			'\t\t<title>Welcome to Nitrogen</title>\n' +
			'\t\t<style type="text/css">\n' +
			'\t\t\t/* put CSS styles here */\n' +
			'\t\t</style>\n' +
			'\t\t<script type="text/javascript">\n' +
			'\t\t\t/* put JavaScript here */\n' +
			'\t\t</script>\n' +
			'\t</head>\n' +
			'\t<body>\n' +
			'\t\t<h1>New HTML Project</h1>\n' +
			'\t\t<p>Welcome to Nitrogen!</p>\n' +
			'\t</body>\n' +
			'</html>',
			'# New Markdown project\n' +
			'Welcome to Nitrogen!'
		]
	},
	async (data: any) => {
		for (const accKey of Object.keys(data.accounts)) {
			const acc = data.accounts[accKey]

			for (const proj of acc.projects) {
				if (proj.publishToken) {
					data.publishTokens[proj.publishToken].projectIndex =
						acc.projects.indexOf(proj)
				}
			}
		}
	},
	async (data: ApiData) => {
		debug('migrating mis-typed editor options')

		for (const accKey of Object.keys(data.accounts)) {
			const acc = data.accounts[accKey]
			const editorOptions: IEditorConstructionOptions = acc['editorOptions']

			editorOptions.autoClosingBrackets =
				editorOptions.autoClosingBrackets ? 'always' : 'never'

			editorOptions.hover = {
				enabled: true,
				delay  : 300,
				sticky : true
			}

			editorOptions.parameterHints = {
				enabled: true,
				cycle  : false
			}

			const intKeys = [
				'fontSize',
				'letterSpacing',
				'lineDecorationsWidth',
				'lineHeight',
				'lineNumbersMinChars',
				'mouseWheelScrollSensitivity',
				'overviewRulerLanes',
				'quickSuggestionsDelay',
				'revealHorizontalRightPadding',
				'stopRenderingLineAfter',
				'suggestFontSize',
				'suggestLineHeight',
				'wordWrapColumn'
			]

			for (const key of intKeys) {
				if (typeof editorOptions[key] === 'string') {
					if (isIntStr(editorOptions[key])) {
						editorOptions[key] = +editorOptions[key]
					} else {
						editorOptions[key] = starterSettings.editor[key]
					}
				}
			}

			acc.settings = {
				editor: editorOptions
			}

			delete acc['editorOptions']

			acc.data = {
				email             : '',
				stripe_customer   : '',
				email_verify_code : '',
				email_revert_codes: []
			}
		}

		data.emails = {}
		data.emailVerifyCodes = {}
		data.emailRevertCodes = {}

		const oldAccounts = data.accounts

		data.accounts = {}
		data.accountUsernames = {}

		debug('migrating accounts to id-based format')

		for (const username of Object.keys(oldAccounts)) {
			debug('migrating account %s to id-based format', username)

			const account = oldAccounts[username]
			const id = uuid.v4()

			account.id = id
			data.accounts[id] = account
			data.accountUsernames[username] = id
		}

		debug('migrating account projects to database')

		data.projects = {}

		for (const id of Object.keys(data.accounts)) {
			const account = data.accounts[id]

			debug('projects for %s (username %s)', id, account.username)

			account.projects =
				(<Project[]> <any> account.projects).map((project: Project) => {
					const projectId = uuid.v4()

					debug('project id %s', projectId)

					project.account = id
					project.id = projectId
					data.projects[projectId] = project

					return projectId
				})
		}

		debug('migrating publish tokens to use project ids')

		for (const token of Object.keys(data.publishTokens)) {
			const obj = data.publishTokens[token]

			obj.project =
				data.accounts[data.accountUsernames[obj['username']]].projects[obj['projectIndex']]

			delete obj['username']
			delete obj['projectIndex']
		}

		debug('migrating bug reports to use account ids')

		for (const bugReport of data.bugReports) {
			bugReport.account = data.accountUsernames[bugReport['username']]

			delete bugReport['username']
		}

		debug('migrating active tokens to use account ids')

		for (const activeToken of Object.keys(data.activeTokens)) {
			data.activeTokens[activeToken] =
				data.accountUsernames[data.activeTokens[activeToken]]
		}

		data.customDomains = {}
		data.customDomainsLookup = {}

		debug('removing ids from bug reports')

		for (const bugReport of data.bugReports) {
			delete bugReport['id']
		}
	}
]

export async function upgradeData(data: ApiData) {
	debug('upgrading data')

	if (!data.version) {
		data.version = 0
	}

	if (data.version === allUpgrades.length) {
		debug(
			'version is %d (latest, not upgrading)',
			data.version
		)

		return false
	} else if (data.version > allUpgrades.length) {
		debug(
			'version is %d (NEWER THAN THIS HEXAZINE)',
			data.version
		)
		debug('this is a fatal error, hexazine will be shut down to prevent' +
		      ' corruption of data')

		await safeShutdown()

		return false
	}

	debug(
		'version is %d, will be upgraded to %d',
		data.version,
		allUpgrades.length
	)

	const upgrades = allUpgrades.slice(data.version)

	for (const upgrade of upgrades) {
		await upgrade(data)
	}

	data.version = allUpgrades.length

	debug(
		'data has been upgraded to version %d, validating',
		data.version
	)

	assertEquals<ApiData>(data)

	debug('validation succeeded')

	return true
}
