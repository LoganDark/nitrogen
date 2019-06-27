import {load}            from 'cheerio'
import * as express      from 'express'
import {Response}        from 'express'
import * as beautify     from 'js-beautify'
import * as normalizeUrl from 'normalize-url'
import * as path         from 'path'
import {get}             from 'request-promise-native'
import {equals}          from 'typescript-is'
import * as URL          from 'url-parse'
import {HexazineApi}     from '../../../lib/api'
import {makeDebug}       from '../../../lib/logger'
import {isIntStr}        from '../../../lib/utils'
import {Bodies}          from '../../../types/bodies'
import {ProjectType}     from '../../../types/database'
import {ApiRequest}      from '../../../types/hexazine'

const debug = makeDebug('routes:projects', 3)

export = async function(
	router: express.Router,
	api: HexazineApi
): Promise<express.Router> {
	const projectsRouter = express.Router()

	projectsRouter.get(
		'/projects',
		async (
			req: ApiRequest,
			res: Response
		) => {
			try {
				res.json(await api.getProjects(req.account.id))
			} catch {
				res.json(null)
			}
		}
	)

	projectsRouter.post(
		'/projects/new',
		async (
			req: ApiRequest,
			res: Response
		) => {
			const body = req.body

			if (equals<Bodies.Projects.New>(body)) {
				if (Number.isInteger(body.type) &&
				    equals<ProjectType>(body.type)) {
					try {
						res.json(await api.newProject(
							req.account.id,
							body.name,
							body.type
						))
					} catch {
						res.json(false)
					}
				} else {
					res.json(false)
				}
			} else {
				res.json(false)
			}
		}
	)

	projectsRouter.post(
		'/projects/rename/:id',
		async (
			req: ApiRequest,
			res: Response
		) => {
			if (equals<Bodies.Projects.Rename>(req.body)) {
				try {
					res.json(await api.renameProject(
						req.account.id,
						req.params.id,
						req.body.name
					))

					return
				} catch {}
			}

			res.json(false)
		}
	)

	projectsRouter.post(
		'/projects/delete/:id',
		async (
			req: ApiRequest,
			res: Response
		) => {
			try {
				res.json(await api.deleteProject(
					req.account.id,
					req.params.id
				))
			} catch {
				res.json(null)
			}
		}
	)

	function postProcessJSFiddleHTML(html: string) {
		const $ = load(html, {normalizeWhitespace: true})

		$('body > script:last-child').remove()

		for (const i of [
			'href',
			'src'
		]) {
			$(`[${i}^="/"]`).each(
				(
					_,
					elem
				) => {
					const element = $(elem)
					const attr = element.attr(i)

					element.attr(
						i,
						(attr.startsWith('//')
						 ? 'https:'
						 : 'https://fiddle.jshell.net') +
						attr
					)

					if (attr === '/css/result-light.css') {
						element.remove()
					}
				}
			)
		}

		$('style, script').each(
			(
				_,
				elem
			) => {
				if (elem.children.length > 0) {
					const text = elem.children[0]

					text.data = text.data.replace(
						/(["'`])\/\//g,
						'$1https://'
					)
				}
			}
		)

		return $.html()
	}

	async function importJSFiddle(url: URL, accountId: string) {
		const segments = url.pathname.slice(1).split(path.sep)

		let fiddleId = ''
		let currentPop = segments.pop()

		if (isIntStr(currentPop)) {
			debug(
				'fiddle has ID %s',
				currentPop
			)

			fiddleId = '/' + currentPop

			if (segments.length < 1) { // can't have version without id
				return false
			}

			currentPop = segments.pop()
		}

		if (currentPop) {
			fiddleId = currentPop + fiddleId
		} else {
			return false
		}

		if (!fiddleId) {
			return false
		}

		debug('getting fiddle with ID %s', fiddleId)

		const jshellUrl = `https://fiddle.jshell.net/${fiddleId}/show/light`
		let result

		try {
			result = await get(
				jshellUrl,
				{
					headers: {
						Referer: jshellUrl
					}
				}
			)

			debug('result: %o', result)
		} catch {
			debug('failed to get fiddle')

			return false
		}

		if (!result) {
			debug('recieved no result from jsfiddle(?)')

			return false
		}

		try {
			await api.newProject(
				accountId,
				`Imported: JSFiddle ${fiddleId}`,
				0,
				beautify.html_beautify(
					postProcessJSFiddleHTML(result),
					{
						indent_inner_html: true,
						indent_with_tabs : true,
						wrap_line_length : 0,
						brace_style      : 'end-expand',
						preserve_newlines: false,
						extra_liners     : ['style']
					}
				)
			)

			debug('success')

			return true
		} catch {
			debug('failed to create new project')

			return false
		}
	}

	projectsRouter.post(
		'/projects/import',
		async (
			req: ApiRequest,
			res: Response
		) => {
			if (!equals<Bodies.Projects.Import>(req.body)) {
				res.json(false)

				return
			}

			const url = URL(normalizeUrl(req.body.url))

			if (url.hostname === 'jsfiddle.net') {
				debug('project is JSFiddle')

				try {
					res.json(await importJSFiddle(url, req.account.id))
				} catch {
					res.json(false)
				}
			} else {
				debug('can\'t import (wrong import type)')

				res.json(false)

				return
			}
		}
	)

	projectsRouter.get(
		'/projects/:id',
		async (
			req: ApiRequest,
			res: Response
		) => {
			try {
				res.json(await api.getProject(
					req.account.id,
					req.params.id
				))

				return
			} catch {}

			res.json(null)
		}
	)

	projectsRouter.post(
		'/projects/:id',
		async (
			req: ApiRequest,
			res: Response
		) => {
			if (equals<Bodies.Projects.UpdateCode>(req.body)) {
				try {
					res.json(await api.setProjectCode(
						req.account.id,
						req.params.id,
						req.body.code
					))

					return
				} catch {}
			}

			res.json(false)
		}
	)

	projectsRouter.post(
		'/projects/move/:id',
		async (
			req: ApiRequest,
			res: Response
		) => {
			if (equals<Bodies.Projects.Move>(req.body)) {
				try {
					res.json(await api.moveProject(
						req.account.id,
						req.params.id,
						req.body.newPos
					))
				} catch {}
			}

			res.json(false)
		}
	)

	projectsRouter.post(
		'/projects/:id/unpublish',
		async (
			req: ApiRequest,
			res: Response
		) => {
			try {
				res.json(await api.unpublish(
					req.account.id,
					req.params.id
				))

				return
			} catch {}

			res.json(false)
		}
	)

	projectsRouter.post(
		'/projects/:id/publish',
		async (
			req: ApiRequest,
			res: Response
		) => {
			try {
				res.json(await api.publish(
					req.account.id,
					req.params.id
				))

				return
			} catch {}

			res.json(null)
		}
	)

	projectsRouter.get(
		'/projectData',
		async (
			req: ApiRequest,
			res: Response
		) => {
			try {
				res.json(await api.getProjectsData(req.account.id))
			} catch {
				res.json(null)
			}
		}
	)

	return projectsRouter
}
