import * as express                     from 'express'
import {Response}                       from 'express'
import * as Prism                       from 'prismjs'
import 'prismjs/components/prism-markdown'
import {HexazineApi}                    from '../../../lib/api'
import {md2html}                        from '../../../lib/md2html'
import {Project}                        from '../../../types/database'
import {ApiRequest}                     from '../../../types/hexazine'
import {DECRYPTION_CONFIRMATION_HEADER} from '../../../types/shared-vars'

export = async function(
	router: express.Router,
	api: HexazineApi
): Promise<express.Router> {
	const publishedRouter = express.Router()

	publishedRouter.get(
		'/projects/published/:publishToken',
		async (
			req: ApiRequest,
			res: Response
		) => {
			res.header(
				'Content-Type',
				'text/html'
			)

			try {
				const project: Project = await api.getPublished(
					req.params.publishToken)

				let code

				if (project.code.startsWith(DECRYPTION_CONFIRMATION_HEADER)) {
					code =
						project.code.substr(
							DECRYPTION_CONFIRMATION_HEADER.length)
				} else {
					code = project.code
				}

				let html

				switch (project.type) {
					case 0:
						html = code
						break
					case 1:
						html = md2html(
							code,
							project.name
						)
				}

				res.end(
					html,
					'utf8'
				)
			} catch (e) {
				res.end(
					'This project does not exist or has been unpublished. Ask the author for a new link.',
					'utf8'
				)
			}
		}
	)

	publishedRouter.get(
		'/projects/published/:publishToken/source',
		async (
			req: ApiRequest,
			res: Response
		) => {
			res.header(
				'Content-Type',
				'text/html'
			)

			try {
				const project: Project = await api.getPublished(
					req.params.publishToken)
				let code

				if (project.code.startsWith(DECRYPTION_CONFIRMATION_HEADER)) {
					code =
						project.code.substr(
							DECRYPTION_CONFIRMATION_HEADER.length)
				} else {
					code = project.code
				}

				let grammar
				let language

				switch (project.type) {
					case 0:
						grammar = Prism.languages['html']
						language = 'html'
						break
					case 1:
						grammar = Prism.languages['html']
						language = 'markdown'
				}

				const highlighted = Prism.highlight(
					code,
					grammar,
					language
				)

				res.end(
					'<link rel="stylesheet" type="text/css" href="/assets/prism.css">' +
					highlighted,
					'utf8'
				)
			} catch {
				res.end(
					'This project does not exist or has been unpublished. Ask the author for a new link.',
					'utf8'
				)
			}
		}
	)

	return publishedRouter
}
