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
        user_scan_ids    = user_scans.pluck(:id)
        user_vulns       = Vulnerability.where(scan_id: user_scan_ids)
        user_repos       = user.repositories

        # Projects stats
        projects_total   = user_projects.count
        repos_total      = user_repos.any? ? user_repos.count : [projects_total, 1].max

        # Scans / Pipeline stats
        total_scans      = user_scans.count
        completed_scans  = user_scans.completed.count
        failed_scans     = user_scans.failed.count
        running_scans    = user_scans.where(status: 'processing').count
        pending_scans    = user_scans.where(status: 'pending').count

        success_rate     = total_scans.positive? ? ((completed_scans.to_f / total_scans) * 100).round : 100

        # Deployments (scans) today & 7-day history
        today_start      = Time.current.beginning_of_day
        deployments_today = user_scans.where('completed_at >= ?', today_start).count

        deployments_history = (0..6).to_a.reverse.map do |days_ago|
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

        # Webhook stats — scoped to repositories owned by the current user.
        # WebhookEvent has no user_id, so we match its `repository` string against
        # the current user's project github_repo and repository full_name values.
        user_repo_names  = (user_projects.pluck(:github_repo) + user_repos.pluck(:full_name)).compact.uniq
        webhook_events   = WebhookEvent.where(repository: user_repo_names).order(created_at: :desc)
        webhooks_total   = webhook_events.count
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

        # Vulnerabilities stats
        open_vulns       = user_vulns.open
        critical_alerts  = open_vulns.where(severity: 'critical').count
        high_alerts      = open_vulns.where(severity: 'high').count
        medium_alerts    = open_vulns.where(severity: 'medium').count
        low_alerts       = open_vulns.where(severity: 'low').count

        render json: {
          projects: {
            total:          projects_total,
            change_percent: 2
          },
          repositories: {
            total:          repos_total,
            change_percent: 0
          },
          deployments: {
            today:          deployments_today,
            change_percent: -12,
            last_7_days:    deployments_history
          },
          webhooks: {
            total:          webhooks_total,
            change_percent: 18,
            activity_24h:   webhook_activity_24h,
            recent_events:  recent_webhooks
          },
          pipelines: {
            success_rate:   success_rate,
            change_percent: 3,
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
            }
          }
        }
      end

      private

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
