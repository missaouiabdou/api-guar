# app/controllers/concerns/paginatable.rb
#
# GR-105 — Lightweight, dependency-free pagination for index endpoints.
#
# Chosen over pagy/kaminari/will_paginate because it needs no new gem
# (see PHASE 1 constraints) and Rails 8 gives us everything required via
# `.limit` / `.offset`.
#
# Usage in a controller action:
#   records, meta = paginate(scope)
#   render json: { data: records.map { ... }, pagination: meta }
#
# `scope` may be an ActiveRecord::Relation (preferred — LIMIT/OFFSET happen in
# SQL so we never load the whole table into memory) or a plain Array (sliced
# in memory as a fallback).
#
# Query parameters (both optional, safe to omit):
#   page      1-based page number   (default 1,  clamped to >= 1)
#   per_page  records per page      (default 25, clamped to 1..100)
#
# Returns [paginated_records, pagination_meta], where pagination_meta is:
#   { page: 1, per_page: 25, total: 150, total_pages: 6 }
#
module Paginatable
  extend ActiveSupport::Concern

  DEFAULT_PER_PAGE = 25
  MAX_PER_PAGE     = 100

  private

  def paginate(scope)
    page     = pagination_page
    per_page = pagination_per_page
    offset   = (page - 1) * per_page

    total =
      if scope.is_a?(Array)
        scope.size
      else
        # reorder(nil) so COUNT(*) drops any ORDER BY — required because some
        # scopes carry custom Arel.sql ordering (e.g. Vulnerability.by_severity).
        scope.reorder(nil).count(:all)
      end

    total_pages = per_page.zero? ? 0 : (total.to_f / per_page).ceil

    records =
      if scope.is_a?(Array)
        scope.slice(offset, per_page) || []
      else
        scope.limit(per_page).offset(offset)
      end

    [records, pagination_meta(page, per_page, total, total_pages)]
  end

  # Emit pagination metadata as response headers. Used for endpoints that must
  # keep returning a bare JSON array for backward compatibility (e.g. /scans,
  # consumed by the frontend's getScans()).
  def set_pagination_headers(meta)
    response.set_header("X-Page",        meta[:page].to_s)
    response.set_header("X-Per-Page",    meta[:per_page].to_s)
    response.set_header("X-Total-Count", meta[:total].to_s)
    response.set_header("X-Total-Pages", meta[:total_pages].to_s)
  end

  def pagination_page
    page = params[:page].to_i
    page < 1 ? 1 : page
  end

  def pagination_per_page
    per_page = params[:per_page].to_i
    return DEFAULT_PER_PAGE if per_page < 1

    [per_page, MAX_PER_PAGE].min
  end

  def pagination_meta(page, per_page, total, total_pages)
    {
      page:        page,
      per_page:    per_page,
      total:       total,
      total_pages: total_pages
    }
  end
end
