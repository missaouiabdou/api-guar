'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Shield, ArrowLeft, Mail, ArrowRight } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => { setLoading(false); setSent(true) }, 1500)
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary">
            <Shield className="h-4 w-4 text-white" />
          </div>
          <span className="text-base font-semibold text-foreground">GuardRail</span>
        </div>

        {!sent ? (
          <>
            <div className="space-y-1.5">
              <h1 className="text-2xl font-bold text-foreground">Reset your password</h1>
              <p className="text-sm text-muted-foreground">Enter your email address and we&apos;ll send you a reset link</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Email address</label>
                <input type="email" placeholder="you@company.com" className="w-full rounded-xl border border-border bg-muted px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-colors" />
              </div>
              <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-60 transition-all shadow-sm shadow-primary/20">
                {loading ? <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <><span>Send reset link</span> <ArrowRight className="h-4 w-4" /></>}
              </button>
            </form>
          </>
        ) : (
          <div className="space-y-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <Mail className="h-7 w-7 text-primary" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">Check your email</h1>
              <p className="text-sm text-muted-foreground">We sent a password reset link to your email address. It&apos;ll expire in 15 minutes.</p>
            </div>
            <div className="rounded-xl border border-border bg-muted p-4 space-y-2">
              <p className="text-xs font-medium text-foreground">Didn&apos;t receive the email?</p>
              <p className="text-xs text-muted-foreground">Check your spam folder or <button className="text-primary hover:underline" onClick={() => setSent(false)}>try another email</button></p>
            </div>
          </div>
        )}

        <Link href="/login" className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to sign in
        </Link>
      </div>
    </div>
  )
}
