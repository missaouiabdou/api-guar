'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Shield, Eye, EyeOff, ArrowRight, Github, Lock } from 'lucide-react'

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => setLoading(false), 1500)
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-[45%] flex-col justify-between bg-card border-r border-border p-10">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary">
            <Shield className="h-4.5 w-4.5 text-white" />
          </div>
          <span className="text-base font-semibold text-foreground">GuardRail</span>
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
              <Lock className="h-3 w-3" />
              Enterprise DevSecOps
            </div>
            <h2 className="text-3xl font-bold text-foreground leading-tight text-balance">
              Ship faster.<br />Stay secure.
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              GuardRail gives your team full visibility into deployments, pipelines, security posture, and infrastructure — all in one place.
            </p>
          </div>

          <div className="space-y-3">
            {[
              { label: 'Unified deployment tracking across all environments' },
              { label: 'Real-time security vulnerability scanning' },
              { label: 'Pipeline visibility with actionable insights' },
              { label: 'Full audit trail for compliance & security' },
            ].map((feat) => (
              <div key={feat.label} className="flex items-start gap-2.5">
                <div className="mt-1 h-4 w-4 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                </div>
                <p className="text-xs text-muted-foreground">{feat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-border bg-background/50 p-4">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-semibold text-white">SC</span>
          </div>
          <div>
            <p className="text-xs font-medium text-foreground">Sarah Chen, DevOps Lead at Acme Corp</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">&ldquo;GuardRail replaced 4 different tools for us.&rdquo;</p>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary">
              <Shield className="h-4 w-4 text-white" />
            </div>
            <span className="text-base font-semibold text-foreground">GuardRail</span>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
            <p className="text-sm text-muted-foreground">Sign in to your GuardRail workspace</p>
          </div>

          {/* GitHub SSO */}
          <button className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-border bg-muted px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors">
            <Github className="h-4 w-4" />
            Continue with GitHub
          </button>

          <div className="relative flex items-center">
            <div className="flex-1 border-t border-border" />
            <span className="mx-3 text-xs text-muted-foreground bg-background px-2">or sign in with email</span>
            <div className="flex-1 border-t border-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Email address</label>
              <input
                type="email"
                defaultValue="sarah.chen@acme.com"
                className="w-full rounded-xl border border-border bg-muted px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-colors"
                placeholder="you@company.com"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground">Password</label>
                <Link href="/forgot-password" className="text-xs text-primary hover:underline">Forgot password?</Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  defaultValue="••••••••••"
                  className="w-full rounded-xl border border-border bg-muted px-3.5 py-2.5 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-colors"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="remember" className="h-3.5 w-3.5 rounded accent-primary" />
              <label htmlFor="remember" className="text-xs text-muted-foreground">Remember me for 30 days</label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-60 transition-all shadow-sm shadow-primary/20"
            >
              {loading ? (
                <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : (
                <>Sign in <ArrowRight className="h-4 w-4" /></>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-primary hover:underline font-medium">Create workspace</Link>
          </p>

          <p className="text-center text-[11px] text-muted-foreground">
            By signing in, you agree to our{' '}
            <span className="text-primary cursor-pointer hover:underline">Terms</span> and{' '}
            <span className="text-primary cursor-pointer hover:underline">Privacy Policy</span>
          </p>
        </div>
      </div>
    </div>
  )
}
