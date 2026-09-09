# app/controllers/api/v1/dashboard_controller.rb
module Api
  module V1
    class DashboardController < BaseController
      # GET /api/v1/dashboard
      # Global (cross-project) overview for the AUTHENTICATED user only.
      # Every query below is scoped through current_user — no cross-user data leaks.
      def show
        user             = current_user
        user_projects    = user.projects
        user_scans       = Scan.joins(:project).where(projects: { user_id: user.id })
        # Current alerts live in the LATEST completed scan of each project —
        # older scans are historical snapshots, not additional open alerts.
        latest_scan_ids  = user_projects.map { |p| p.scans.completed.order(id: :desc).limit(1).pluck(:id) }.flatten
        user_vulns       = Vulnerability.where(scan_id: latest_scan_ids)
        user_repos       = user.repositories

        # Projects stats
        projects_total   = user_projects.count
        repos_total      = user_repos.count

        # Scans / Pipeline stats
        total_scans      = user_scans.count
        completed_scans  = user_scans.completed.count
        failed_scans     = user_scans.failed.count
        running_scans    = user_scans.where(status: 'processing').count
        pending_scans    = user_scans.where(status: 'pending').count

        # No scans = no measurable success rate (never claim a perfect one)
        success_rate     = total_scans.positive? ? ((completed_scans.to_f / total_scans) * 100).round : 0

        # ── Real change percentages (computed, never hardcoded) ──────────────
        today_start      = Time.current.beginning_of_day
        yesterday_range  = (1.day.ago.beginning_of_day)..(1.day.ago.end_of_day)

        projects_this_week = user_projects.where(created_at: 7.days.ago..).count
        projects_last_week = user_projects.where(created_at: 14.days.ago..7.days.ago).count
        repos_this_week    = user_repos.where(created_at: 7.days.ago..).count
        repos_last_week    = user_repos.where(created_at: 14.days.ago..7.days.ago).count

        scans_this_week  = user_scans.where(created_at: 7.days.ago..)
        scans_last_week  = user_scans.where(created_at: 14.days.ago..7.days.ago)
        rate_this_week   = scans_this_week.count.positive? ? ((scans_this_week.completed.count.to_f / scans_this_week.count) * 100).round : 0
        rate_last_week   = scans_last_week.count.positive? ? ((scans_last_week.completed.count.to_f / scans_last_week.count) * 100).round : 0

        # Webhook stats — scoped to repositories owned by the current user.
        # WebhookEvent has no user_id, so we match its `repository` string against
        # the current user's project github_repo and repository full_name values.
        user_repo_names  = (user_projects.pluck(:github_repo) + user_repos.pluck(:full_name)).compact.uniq
        webhook_events   = WebhookEvent.where(repository: user_repo_names).order(created_at: :desc)
        webhooks_total   = webhook_events.count
        webhooks_today     = webhook_events.where(created_at: today_start..).count
        webhooks_yesterday = webhook_events.where(created_at: yesterday_range).count
        recent_webhooks  = webhook_events.limit(5).map do |evt|
          repo_name = evt.repository.presence || evt.payload&.dig('repository', 'full_name') || 'unknown/repo'
          branch    = evt.payload&.dig('ref')&.gsub('refs/heads/', '') || 'main'
          {
            id:         evt.id,
            repo:       repo_name,
            event:      evt.event_type || 'push',
            branch:     branch,
            status:     evt.status == 'processed' ? 'Success' : evt.status.capitalize,
            created_at: evt.created_at,
            time_ago:   time_ago_in_words_custom(evt.created_at)
          }
        end

        # Real deployments from GitHub webhooks (deployment, deployment_status, release events)
        deployments_today     = webhook_events.where(event_type: %w[deployment deployment_status release]).where(created_at: today_start..).count
        deployments_yesterday = webhook_events.where(event_type: %w[deployment deployment_status release]).where(created_at: yesterday_range).count

        # Security scans completed today & 7-day history
        scans_today     = user_scans.where('completed_at >= ?', today_start).count
        scans_yesterday = user_scans.where(completed_at: yesterday_range).count

        scans_history = (0..6).to_a.reverse.map do |days_ago|
          day_date  = days_ago.days.ago
          start_t   = day_date.beginning_of_day
          end_t     = day_date.end_of_day
          day_scans = user_scans.where(completed_at: start_t..end_t)

          {
            day:     day_date.strftime('%a'),
            date:    day_date.strftime('%Y-%m-%d'),
            success: day_scans.completed.count,
            failed:  day_scans.failed.count
          }
        end

        # 24h Webhook Activity
        webhook_activity_24h = (0..7).map do |i|
          h_start = (21 - (i * 3)).hours.ago
          h_end   = h_start + 3.hours
          count   = webhook_events.where(created_at: h_start..h_end).count
          {
            time:   h_start.strftime('%H:00'),
            events: count
          }
        end

        # Vulnerabilities stats (active = open + reopened; ignored/resolved don't count)
        open_vulns       = user_vulns.active
        critical_alerts  = open_vulns.where(severity: 'critical').count
        high_alerts      = open_vulns.where(severity: 'high').count
        medium_alerts    = open_vulns.where(severity: 'medium').count
        low_alerts       = open_vulns.where(severity: 'low').count

        latest_scan = user_scans.completed.order('scans.id DESC').first
        if latest_scan
          calc = Security::ScoreCalculator.call(latest_scan)
          calc_score = calc[:score]
          calc_risk = calc[:risk_level]
          prev_scan = user_scans.completed.where('scans.id < ?', latest_scan.id).order('scans.id DESC').first
          regr = Security::RegressionDetector.call(latest_scan, prev_scan)
          regression_detected = regr&.dig(:regression) || false
          evaluations = latest_scan.policy_evaluations.includes(:security_policy)
          policy_passed = evaluations.empty? || evaluations.all?(&:passed)
          blocking_failed = evaluations.any? { |ev| !ev.passed && ev.security_policy&.block_on_failure }
          gate_status = if blocking_failed || calc_score < 40
                          'FAIL'
                        elsif calc_score < 70 || !policy_passed
                          'WARNING'
                        else
                          'PASS'
                        end
        else
          # No completed scans: no score to show — never fabricate a perfect one
          calc_score = nil
          calc_risk = nil
          gate_status = 'PENDING'
          regression_detected = false
        end

        render json: {
          projects: {
            total:          projects_total,
            change_percent: percent_change(projects_this_week, projects_last_week)
          },
          repositories: {
            total:          repos_total,
            change_percent: percent_change(repos_this_week, repos_last_week)
          },
          deployments: {
            today:          deployments_today,
            change_percent: percent_change(deployments_today, deployments_yesterday),
            last_7_days:    scans_history,
            scans_today:    scans_today
          },
          scans: {
            today:          scans_today,
            change_percent: percent_change(scans_today, scans_yesterday),
            last_7_days:    scans_history
          },
          webhooks: {
            total:          webhooks_total,
            change_percent: percent_change(webhooks_today, webhooks_yesterday),
            activity_24h:   webhook_activity_24h,
            recent_events:  recent_webhooks
          },
          pipelines: {
            success_rate:   success_rate,
            change_percent: rate_this_week - rate_last_week,
            failed:         failed_scans,
            running:        running_scans,
            pending:        pending_scans,
            breakdown: {
              success: success_rate,
              failed:  total_scans.positive? ? ((failed_scans.to_f / total_scans) * 100).round : 0,
              running: total_scans.positive? ? ((running_scans.to_f / total_scans) * 100).round : 0,
              pending: total_scans.positive? ? ((pending_scans.to_f / total_scans) * 100).round : 0
            }
          },
          security: {
            open_alerts:     open_vulns.count,
            critical_alerts: critical_alerts,
            by_severity: {
              critical: critical_alerts,
              high:     high_alerts,
              medium:   medium_alerts,
              low:      low_alerts
            },
            score:           calc_score,
            risk_level:      calc_risk,
            gate_status:     gate_status,
            regression:      regression_detected
          }
        }
      end

      private

      # Percentage change between two counts. When the baseline is zero:
      # new activity counts as +100%, no activity as 0%.
      def percent_change(current, previous)
        return 0 if previous.zero? && current.zero?
        return 100 if previous.zero?

        (((current - previous).to_f / previous) * 100).round
      end

      def time_ago_in_words_custom(time)
        return 'just now' unless time

        diff_seconds = (Time.current - time).to_i
        case diff_seconds
        when 0..59 then "#{diff_seconds}s ago"
        when 60..3599 then "#{diff_seconds / 60}m ago"
        when 3600..86399 then "#{diff_seconds / 3600}h ago"
        else "#{diff_seconds / 86400}d ago"
        end
      end
    end
  end
end
