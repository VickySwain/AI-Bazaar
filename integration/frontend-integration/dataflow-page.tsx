'use client'
// src/app/dataflow/page.tsx
// Live interactive visualizer showing the end-to-end data flow:
// Browser → Next.js → NestJS → FastAPI ML → Redis → PostgreSQL

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Card'
import { cn } from '@/lib/utils'

// ── Node definitions ───────────────────────────────────────────────────────
const NODES = [
  { id: 'browser',   label: 'Browser',       sub: 'Next.js 14',       color: '#a78bfa', x: 50,  y: 200 },
  { id: 'nextjs',    label: 'Next.js API',   sub: 'React Query hook', color: '#7c3aed', x: 200, y: 200 },
  { id: 'nestjs',    label: 'NestJS',        sub: 'REST API',          color: '#2563eb', x: 380, y: 200 },
  { id: 'ml',        label: 'FastAPI ML',    sub: 'XGBoost',           color: '#34d399', x: 560, y: 120 },
  { id: 'redis',     label: 'Redis',         sub: 'Cache / Store',     color: '#fbbf24', x: 560, y: 280 },
  { id: 'postgres',  label: 'PostgreSQL',    sub: 'Primary DB',        color: '#38bdf8', x: 740, y: 200 },
  { id: 'kafka',     label: 'Kafka',         sub: 'Event bus',         color: '#fb7185', x: 380, y: 360 },
]

const EDGES = [
  { from: 'browser',  to: 'nextjs',   label: 'useQuery()' },
  { from: 'nextjs',   to: 'nestjs',   label: 'GET /recommendations' },
  { from: 'nestjs',   to: 'redis',    label: 'Cache check' },
  { from: 'nestjs',   to: 'ml',       label: 'POST /recommend' },
  { from: 'ml',       to: 'redis',    label: 'Feature store' },
  { from: 'ml',       to: 'postgres', label: 'Policy catalog' },
  { from: 'nestjs',   to: 'postgres', label: 'User profile' },
  { from: 'nestjs',   to: 'kafka',    label: 'Events emitted' },
  { from: 'kafka',    to: 'ml',       label: 'Interactions feed' },
]

type FlowStep = {
  id: string
  from: string
  to: string
  label: string
  duration: number
  data?: string
}

const RECOMMENDATION_FLOW: FlowStep[] = [
  { id: 's1', from: 'browser',  to: 'nextjs',   label: 'User opens /recommend',        duration: 300,  data: 'GET /recommendations?limit=5' },
  { id: 's2', from: 'nextjs',   to: 'nestjs',   label: 'React Query fetches API',      duration: 400,  data: 'Bearer JWT token attached' },
  { id: 's3', from: 'nestjs',   to: 'redis',    label: 'Check recommendation cache',   duration: 150,  data: 'Key: rec:user-123:all → MISS' },
  { id: 's4', from: 'nestjs',   to: 'postgres', label: 'Fetch user profile',           duration: 200,  data: 'age=32, income=6L_TO_10L, budget=2500' },
  { id: 's5', from: 'nestjs',   to: 'ml',       label: 'Build feature vector + call',  duration: 600,  data: 'POST /recommend {features: {age:32, ...}, limit:5}' },
  { id: 's6', from: 'ml',       to: 'redis',    label: 'Fetch online features',        duration: 100,  data: 'feat:policy:pol-001 → HIT (policy features)' },
  { id: 's7', from: 'ml',       to: 'postgres', label: 'Load policy catalog',          duration: 180,  data: '9 active policies fetched' },
  { id: 's8', from: 'ml',       to: 'redis',    label: 'XGBoost scores → cache',       duration: 80,   data: 'Scores: pol-004=0.81, pol-001=0.74, pol-005=0.69' },
  { id: 's9', from: 'nestjs',   to: 'redis',    label: 'Cache recommendations 30min',  duration: 120,  data: 'rec:user-123:all set with TTL=1800' },
  { id: 's10',from: 'nestjs',   to: 'kafka',    label: 'Emit recommendations event',   duration: 200,  data: 'topic: recommendations.generated' },
  { id: 's11',from: 'nextjs',   to: 'browser',  label: 'Return scored policies',       duration: 350,  data: '5 policies with scores, reasons, ranks' },
]

export default function DataFlowPage() {
  const { isAuthenticated } = useAuthStore()
  const [activeStep, setActiveStep] = useState<number>(-1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())
  const [liveData, setLiveData] = useState<any>(null)
  const [liveLoading, setLiveLoading] = useState(false)
  const [activeNode, setActiveNode] = useState<string | null>(null)
  const intervalRef = useRef<NodeJS.Timeout>()

  const activeFlowStep = activeStep >= 0 ? RECOMMENDATION_FLOW[activeStep] : null

  // Auto-play animation
  useEffect(() => {
    if (!isPlaying) {
      clearInterval(intervalRef.current)
      return
    }

    let step = 0
    setActiveStep(0)
    setCompletedSteps(new Set())

    intervalRef.current = setInterval(() => {
      step++
      if (step >= RECOMMENDATION_FLOW.length) {
        clearInterval(intervalRef.current)
        setIsPlaying(false)
        setActiveStep(-1)
        setCompletedSteps(new Set(RECOMMENDATION_FLOW.map((_, i) => i)))
        return
      }
      setActiveStep(step)
      setCompletedSteps((prev) => new Set([...prev, step - 1]))
      setActiveNode(RECOMMENDATION_FLOW[step]?.from)
    }, 900)

    return () => clearInterval(intervalRef.current)
  }, [isPlaying])

  const runLiveFlow = async () => {
    setLiveLoading(true)
    setLiveData(null)
    try {
      const t0 = Date.now()
      const res = await api.get('/recommendations?limit=5')
      const elapsed = Date.now() - t0
      setLiveData({
        ...res.data.data,
        elapsedMs: elapsed,
        httpStatus: res.status,
      })
    } catch (err: any) {
      setLiveData({ error: err.response?.data?.message || err.message })
    } finally {
      setLiveLoading(false)
    }
  }

  const reset = () => {
    setIsPlaying(false)
    setActiveStep(-1)
    setCompletedSteps(new Set())
    setActiveNode(null)
    clearInterval(intervalRef.current)
  }

  return (
    <div className="min-h-screen bg-bg-base pt-20 pb-20 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 glass border border-brand-400/20 rounded-full px-4 py-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
            <span className="text-sm text-tx-secondary">Live Data Flow Explorer</span>
          </div>
          <h1 className="font-display font-bold text-4xl lg:text-5xl text-tx-primary mb-3">
            End-to-End Architecture
          </h1>
          <p className="text-tx-secondary text-lg max-w-2xl mx-auto">
            Watch how a recommendation request flows from your browser through
            Next.js → NestJS → FastAPI ML → Redis → PostgreSQL and back.
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
          <Button
            onClick={() => { reset(); setTimeout(() => setIsPlaying(true), 100) }}
            disabled={isPlaying}
            icon={<span>▶</span>}
          >
            Animate Flow
          </Button>
          <Button variant="secondary" onClick={reset} disabled={!isPlaying && activeStep === -1}>
            Reset
          </Button>
          {isAuthenticated && (
            <Button
              variant="secondary"
              loading={liveLoading}
              onClick={runLiveFlow}
              icon={<span>⚡</span>}
            >
              Live API Call
            </Button>
          )}
          {!isAuthenticated && (
            <span className="text-xs text-tx-muted">Sign in to run a live API call</span>
          )}
        </div>

        {/* Main diagram */}
        <Card padding="none" className="overflow-hidden mb-6">
          <div className="p-4 border-b border-bd-subtle flex items-center justify-between">
            <h2 className="font-semibold text-tx-primary text-sm">
              Recommendation Request Flow
            </h2>
            {activeFlowStep && (
              <motion.div
                key={activeFlowStep.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2"
              >
                <span className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
                <span className="text-xs text-tx-secondary">{activeFlowStep.label}</span>
              </motion.div>
            )}
          </div>

          <div className="relative overflow-x-auto">
            <svg
              viewBox="0 0 860 460"
              className="w-full"
              style={{ minWidth: '600px', height: '320px' }}
            >
              {/* Background grid */}
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(148,163,184,0.04)" strokeWidth="1"/>
                </pattern>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="blur"/>
                  <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
                <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                  <path d="M0,0 L0,6 L8,3 z" fill="rgba(148,163,184,0.4)"/>
                </marker>
                <marker id="arrowhead-active" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                  <path d="M0,0 L0,6 L8,3 z" fill="#34d399"/>
                </marker>
              </defs>
              <rect width="860" height="460" fill="url(#grid)"/>

              {/* Edges */}
              {EDGES.map((edge) => {
                const fromNode = NODES.find((n) => n.id === edge.from)!
                const toNode   = NODES.find((n) => n.id === edge.to)!
                if (!fromNode || !toNode) return null

                const isActive = activeFlowStep?.from === edge.from && activeFlowStep?.to === edge.to
                const isCompleted = Array.from(completedSteps).some(
                  (i) => RECOMMENDATION_FLOW[i]?.from === edge.from && RECOMMENDATION_FLOW[i]?.to === edge.to
                )

                const x1 = fromNode.x + 55; const y1 = fromNode.y + 25
                const x2 = toNode.x + 10;   const y2 = toNode.y + 25
                const mx = (x1 + x2) / 2;   const my = (y1 + y2) / 2

                return (
                  <g key={`${edge.from}-${edge.to}`}>
                    <line
                      x1={x1} y1={y1} x2={x2} y2={y2}
                      stroke={isActive ? '#34d399' : isCompleted ? 'rgba(124,58,237,0.5)' : 'rgba(148,163,184,0.15)'}
                      strokeWidth={isActive ? 2.5 : isCompleted ? 1.5 : 1}
                      strokeDasharray={isActive ? '0' : '5,4'}
                      markerEnd={isActive ? 'url(#arrowhead-active)' : 'url(#arrowhead)'}
                    />
                    {isActive && (
                      <motion.circle
                        cx={x1} cy={y1} r="5"
                        fill="#34d399"
                        filter="url(#glow)"
                        animate={{ cx: [x1, x2], cy: [y1, y2] }}
                        transition={{ duration: 0.7, ease: 'easeInOut' }}
                      />
                    )}
                    <text x={mx} y={my - 6} textAnchor="middle"
                      fill={isActive ? '#34d399' : 'rgba(148,163,184,0.35)'}
                      fontSize="9" fontFamily="DM Sans, sans-serif">
                      {edge.label}
                    </text>
                  </g>
                )
              })}

              {/* Nodes */}
              {NODES.map((node) => {
                const isActive = activeNode === node.id ||
                  activeFlowStep?.from === node.id ||
                  activeFlowStep?.to === node.id
                const isCompleted = Array.from(completedSteps).some(
                  (i) => RECOMMENDATION_FLOW[i]?.from === node.id || RECOMMENDATION_FLOW[i]?.to === node.id
                )

                return (
                  <g key={node.id} transform={`translate(${node.x},${node.y - 10})`}>
                    {/* Glow ring when active */}
                    {isActive && (
                      <motion.rect
                        x="-4" y="-4" width="118" height="72" rx="14"
                        fill="none"
                        stroke={node.color}
                        strokeWidth="2"
                        opacity={0.6}
                        animate={{ opacity: [0.4, 0.8, 0.4] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      />
                    )}
                    {/* Card */}
                    <rect x="0" y="0" width="110" height="64" rx="12"
                      fill={isActive ? `${node.color}22` : isCompleted ? `${node.color}11` : 'rgba(15,23,42,0.8)'}
                      stroke={isActive ? node.color : isCompleted ? `${node.color}60` : 'rgba(148,163,184,0.12)'}
                      strokeWidth={isActive ? 1.5 : 1}
                    />
                    {/* Color dot */}
                    <circle cx="18" cy="18" r="5" fill={node.color} opacity={isActive ? 1 : 0.5}/>
                    {/* Labels */}
                    <text x="30" y="22" fill={isActive ? '#f8fafc' : '#94a3b8'}
                      fontSize="11" fontWeight={isActive ? '600' : '500'}
                      fontFamily="DM Sans, sans-serif">
                      {node.label}
                    </text>
                    <text x="12" y="46" fill={isActive ? node.color : 'rgba(148,163,184,0.4)'}
                      fontSize="9" fontFamily="DM Sans, sans-serif">
                      {node.sub}
                    </text>
                  </g>
                )
              })}
            </svg>
          </div>
        </Card>

        {/* Step-by-step log */}
        <div className="grid lg:grid-cols-2 gap-6">
          <Card padding="none">
            <div className="p-4 border-b border-bd-subtle">
              <h3 className="text-sm font-semibold text-tx-primary">Flow Steps</h3>
            </div>
            <div className="divide-y divide-bd-subtle max-h-80 overflow-y-auto scrollbar-hide">
              {RECOMMENDATION_FLOW.map((step, i) => {
                const isActive    = activeStep === i
                const isCompleted = completedSteps.has(i)
                return (
                  <motion.div
                    key={step.id}
                    className={cn(
                      'flex items-start gap-3 px-4 py-3 transition-all',
                      isActive && 'bg-neon-green/5',
                      isCompleted && !isActive && 'opacity-60',
                    )}
                  >
                    <div className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5',
                      isActive    ? 'bg-neon-green text-bg-base'          : '',
                      isCompleted ? 'bg-brand-400/20 text-brand-400'      : '',
                      !isActive && !isCompleted ? 'bg-bg-elevated text-tx-muted border border-bd-base' : '',
                    )}>
                      {isCompleted && !isActive ? '✓' : i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-xs font-medium', isActive ? 'text-neon-green' : 'text-tx-secondary')}>
                        {step.from} → {step.to}
                      </p>
                      <p className="text-xs text-tx-muted">{step.label}</p>
                      {isActive && step.data && (
                        <motion.p
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="text-xs font-mono text-neon-green/80 mt-1 bg-neon-green/5 rounded px-2 py-1"
                        >
                          {step.data}
                        </motion.p>
                      )}
                    </div>
                    <span className="text-xs text-tx-muted flex-shrink-0">{step.duration}ms</span>
                  </motion.div>
                )
              })}
            </div>
          </Card>

          {/* Live result or Service status */}
          <div className="space-y-4">
            {/* Service status */}
            <Card>
              <h3 className="text-sm font-semibold text-tx-primary mb-4">Service Endpoints</h3>
              <div className="space-y-2.5">
                {[
                  { name: 'Next.js Frontend',   url: 'http://localhost:3000',           color: '#a78bfa' },
                  { name: 'NestJS Backend API',  url: 'http://localhost:3001/api/v1',    color: '#2563eb' },
                  { name: 'NestJS Swagger Docs', url: 'http://localhost:3001/docs',      color: '#2563eb' },
                  { name: 'FastAPI ML Service',  url: 'http://localhost:8000',           color: '#34d399' },
                  { name: 'ML Swagger Docs',     url: 'http://localhost:8000/docs',      color: '#34d399' },
                  { name: 'MLflow Tracking',     url: 'http://localhost:5000',           color: '#fbbf24' },
                  { name: 'Kafka UI',            url: 'http://localhost:8080',           color: '#fb7185' },
                ].map(({ name, url, color }) => (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-bg-elevated transition-all group"
                  >
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-tx-primary group-hover:text-brand-400 transition-colors">
                        {name}
                      </p>
                      <p className="text-xs text-tx-muted truncate font-mono">{url}</p>
                    </div>
                    <span className="text-tx-muted text-xs opacity-0 group-hover:opacity-100 transition-opacity">↗</span>
                  </a>
                ))}
              </div>
            </Card>

            {/* Live API result */}
            {liveData && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card className={liveData.error ? 'border-rose-400/30' : 'border-neon-green/20'}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-tx-primary">Live API Response</h3>
                    {liveData.elapsedMs && (
                      <Badge variant="success">{liveData.elapsedMs}ms</Badge>
                    )}
                  </div>
                  {liveData.error ? (
                    <p className="text-xs text-rose-400 font-mono">{liveData.error}</p>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-tx-muted">Recommendations returned</span>
                        <span className="font-semibold text-tx-primary">{liveData.total}</span>
                      </div>
                      {liveData.recommendations?.slice(0, 3).map((rec: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 bg-bg-elevated rounded-lg p-2">
                          <span className="text-xs font-bold text-brand-400">#{rec.rank}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-tx-primary truncate">
                              {rec.policy?.name}
                            </p>
                            <p className="text-xs text-tx-muted">
                              Score: {(rec.score * 100).toFixed(1)}% · {rec.modelVersion}
                            </p>
                          </div>
                        </div>
                      ))}
                      <p className="text-xs text-tx-muted font-mono mt-2">
                        {new Date(liveData.generatedAt).toLocaleTimeString()}
                      </p>
                    </div>
                  )}
                </Card>
              </motion.div>
            )}
          </div>
        </div>

        {/* Architecture summary */}
        <div className="mt-8 grid sm:grid-cols-3 gap-4">
          {[
            {
              title: 'Frontend (Next.js)',
              color: '#a78bfa',
              items: [
                'React Query hooks for data fetching',
                'Automatic JWT refresh interceptor',
                'Zustand for auth + compare state',
                'Framer Motion animations',
              ],
            },
            {
              title: 'Backend (NestJS)',
              color: '#2563eb',
              items: [
                'JWT authentication + RBAC guards',
                'ML service adapter with circuit breaker',
                'Redis caching at multiple layers',
                'Kafka event production',
              ],
            },
            {
              title: 'ML Service (FastAPI)',
              color: '#34d399',
              items: [
                'XGBoost binary classifier (44 features)',
                'Redis online feature store',
                'Rule-based fallback always active',
                'Nightly retraining via APScheduler',
              ],
            },
          ].map(({ title, color, items }) => (
            <Card key={title} padding="sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                <h3 className="text-sm font-semibold text-tx-primary">{title}</h3>
              </div>
              <ul className="space-y-1.5">
                {items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-xs text-tx-secondary">
                    <span className="mt-1 w-1 h-1 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                    {item}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>

      </div>
    </div>
  )
}
