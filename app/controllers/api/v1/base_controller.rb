module Api
  module V1
    class BaseController < ApplicationController
      # GR-105 — shared pagination helpers for all V1 index endpoints.
      include Paginatable
    end
  end
end