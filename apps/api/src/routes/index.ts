import { OpenAPIHono } from '@hono/zod-openapi'
import pipelineRoutes from './pipeline.js'

const routes = new OpenAPIHono()

routes.route('/pipeline', pipelineRoutes)

export default routes
