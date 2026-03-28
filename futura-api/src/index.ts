import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { authMiddleware } from './middleware/auth'
import { goalsRouter } from './routes/goals'
import { contributionsRouter } from './routes/contributions'
import { projectionRouter } from './routes/projection'
import { profileRouter } from './routes/profile'
import { allocationRouter } from './routes/allocation'
import { webhooksRouter } from './routes/webhooks'
import type { Env, Variables } from './types'

const app = new Hono<{ Bindings: Env; Variables: Variables }>()

app.use(
  '*',
  cors({
    origin: (origin, c) => {
      const allow = c.env.FRONTEND_ORIGIN ?? 'http://localhost:3000'
      return origin === allow ? origin : null
    },
    allowHeaders: ['Content-Type', 'Authorization', 'X-RevenueCat-Signature'],
    allowMethods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
    credentials: true
  })
)

app.get('/', (c) => c.json({ name: 'futura-api', ok: true }))
app.route('/webhooks', webhooksRouter)

app.use('/api/*', authMiddleware)
app.route('/api/profile', profileRouter)
app.route('/api/goals', goalsRouter)
app.route('/api/contributions', contributionsRouter)
app.route('/api/projection', projectionRouter)
app.route('/api/allocation', allocationRouter)

export default app
