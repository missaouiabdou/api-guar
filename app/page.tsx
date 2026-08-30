'use client'

import { AppShell } from '@/components/layout/app-shell'
import { TopNav, ActionButton } from '@/components/layout/top-nav'
import { StatCard } from '@/components/dashboard/stat-card'
import { DeploymentBarChart, ActivityLineChart, PipelineDonutChart } from '@/components/dashboard/charts'
import { StatusBadge } from '@/components/ui/status-badge'
import { recentActivities, alerts, deployments, webhookEvents } from '@/lib/data'
import {
  FolderOpen, GitBranch, Rocket, Zap, GitMerge, AlertTriangle,
  ShieldAlert, RefreshCw, ArrowRight, Clock, User
} from 'lucide-react'
import Link from 'next/link'

export default function DashboardPage() {
  const criticalAlerts = alerts.filter(a => a.severity === 'critical' && a.status === 'open').length
  const failedDeployments = deployments.filter(d => d.status === 'failed').length

  return (
    <AppShell>
      <TopNav
        title="Dashboard"
        subtitle="Overview of your DevSecOps platform"
        actions={
          <ActionButton label="Refresh" icon={RefreshCw} variant="secondary" />
        }
      />
      <div className="p-6 space-y-6">

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Projects"
            value="6"
            change={2}
            changeLabel="this week"
            icon={FolderOpen}
            iconColor="text-blue-400"
            iconBg="bg-blue-500/10"
          />
          <StatCard
            title="GitHub Repositories"
            value="14"
            change={0}
            changeLabel="no change"
            icon={GitBranch}
            iconColor="text-purple-400"
            iconBg="bg-purple-500/10"
          />
          <StatCard
            title="Deployments Today"
            value="8"
            change={-12}
            changeLabel="vs yesterday"
            icon={Rocket}
            iconColor="text-green-400"
            iconBg="bg-green-500/10"
          />
          <StatCard
            title="Webhook Events"
            value="342"
            change={18}
            changeLabel="vs yesterday"
            icon={Zap}
            iconColor="text-orange-400"
            iconBg="bg-orange-500/10"
          />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Pipeline Success Rate"
            value="84%"
            change={3}
            changeLabel="vs last week"
            icon={GitMerge}
            iconColor="text-green-400"
            iconBg="bg-green-500/10"
          />
          <StatCard
            title="Failed Pipelines"
            value={failedDeployments}
            change={-25}
            changeLabel="vs yesterday"
            icon={AlertTriangle}
            iconColor="text-red-400"
            iconBg="bg-red-500/10"
          />
          <StatCard
            title="Security Alerts"
            value={alerts.length}
            change={2}
            changeLabel="new today"
            icon={ShieldAlert}
            iconColor="text-red-400"
            iconBg="bg-red-500/10"
          />
          <StatCard
            title="Critical Alerts"
            value={criticalAlerts}
            change={1}
            changeLabel="new today"
            icon={AlertTriangle}
            iconColor="text-red-400"
            iconBg="bg-red-500/10"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <DeploymentBarChart />
          </div>
          <PipelineDonutChart />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ActivityLineChart />

          {/* Webhook Timeline */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Recent Webhook Events</h3>
                <p className="text-xs text-muted-foreground">Latest incoming events</p>
              </div>
              <Link href="/events" className="text-xs text-primary hover:underline flex items-center gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="space-y-3">
              {webhookEvents.slice(0, 5).map((event) => (
                <div key={event.id} className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-accent/50 transition-colors">
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{event.repository}</p>
                    <p className="text-[11px] text-muted-foreground">{event.event} • {event.branch}</p>
                  </div>
                  <StatusBadge status={event.status} size="sm" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Row: Recent Activity + Critical Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Recent Activity */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Recent Activity</h3>
              <span className="text-[11px] text-muted-foreground">Last 24 hours</span>
            </div>
            <div className="space-y-3">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-accent">
                    <User className="h-3 w-3 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground">
                      <span className="font-medium">{activity.user}</span>
                      {' '}{activity.action}{' '}
                      <span className="text-primary">{activity.target}</span>
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {activity.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Critical Alerts */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Active Alerts</h3>
              <Link href="/alerts" className="text-xs text-primary hover:underline flex items-center gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="space-y-2.5">
              {alerts.filter(a => a.status !== 'resolved').slice(0, 5).map((alert) => (
                <div key={alert.id} className="flex items-start gap-3 rounded-lg border border-border/50 px-3 py-2.5 hover:bg-accent/30 transition-colors">
                  <StatusBadge severity={alert.severity} size="sm" className="mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground leading-snug">{alert.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{alert.source} • {alert.assignedTo}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </AppShell>
  )
}
