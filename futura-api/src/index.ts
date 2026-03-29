import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { authMiddleware } from './middleware/auth'
import { goalsRouter } from './routes/goals'
import { contributionsRouter } from './routes/contributions'
import { projectionRouter } from './routes/projection'
import { profileRouter } from './routes/profile'
import { allocationRouter } from './routes/allocation'
import { zensRouter } from './routes/zens'
import { subscriptionsRouter } from './routes/subscriptions'
import type { Env, Variables } from './types'

const app = new Hono<{ Bindings: Env; Variables: Variables }>()

app.use(
  'https://digital-rebel.vercel.app/',
  cors({
    origin: (origin) => origin || '*',
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true
  })
)

app.get('/', (c) => c.json({ name: 'futura-api', ok: true }))

app.use('/api/*', authMiddleware)
app.route('/api/profile', profileRouter)
app.route('/api/goals', goalsRouter)
app.route('/api/contributions', contributionsRouter)
app.route('/api/projection', projectionRouter)
app.route('/api/allocation', allocationRouter)
app.route('/api/zens', zensRouter)
app.route('/api/subscriptions', subscriptionsRouter)

export default app
