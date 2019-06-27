import * as express     from 'express'
import {HexazineConfig} from '../../types/hexazine'

export = (config: HexazineConfig) => {
	const customDomainsRouter = express.Router()

	return customDomainsRouter
}
