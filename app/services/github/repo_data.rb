# app/services/github/repo_data.rb
require 'net/http'
require 'uri'
require 'json'

module Github
  # Récupère les vraies données GitHub (métadonnées, commits, pull requests)
  # via l'API REST, avec cache pour respecter les rate limits.
  class RepoData
    SUCCESS_TTL = 5.minutes
    MISSING_TTL = 30.minutes

    class << self
      # Métadonnées du dépôt (stars, forks, watchers, langue…) ou nil si inaccessible.
      def repo(full_name)
        fetch("repo/#{full_name}") { api_get("repos/#{full_name}") }
      end

      # Derniers commits réels, ou nil si le dépôt est inaccessible.
      def commits(full_name, limit: 5)
        fetch("commits/#{full_name}/#{limit}") do
          api_get("repos/#{full_name}/commits?per_page=#{limit}")
        end
      end

      # Pull requests ouvertes, ou nil si le dépôt est inaccessible.
      def open_pulls(full_name, limit: 5)
        fetch("pulls/#{full_name}/#{limit}") do
          api_get("repos/#{full_name}/pulls?state=open&per_page=#{limit}")
        end
      end

      private

      def fetch(key)
        Rails.cache.fetch(cache_key(key), expires_in: SUCCESS_TTL) do
          # Dépôt récemment introuvable : on évite de re-consommer la rate limit
          next nil if Rails.cache.read(cache_key("missing/#{key}"))

          begin
            data = yield
            if data == :missing
              Rails.cache.write(cache_key("missing/#{key}"), true, expires_in: MISSING_TTL)
              nil
            else
              data
            end
          rescue StandardError => e
            Rails.logger.warn "[GITHUB REPO DATA] #{key}: #{e.message}"
            nil
          end
        end
      end

      def cache_key(key)
        "github_repo_data/#{key}"
      end

      def api_get(path)
        token = ENV['GITHUB_TOKEN'].presence

        uri = URI("https://api.github.com/#{path}")
        http = Net::HTTP.new(uri.host, uri.port)
        http.use_ssl = true
        http.read_timeout = 5
        http.open_timeout = 3

        req = Net::HTTP::Get.new(uri.request_uri)
        req['Authorization'] = "Bearer #{token}" if token
        req['Accept']        = 'application/vnd.github.v3+json'
        req['User-Agent']    = 'GuardRail-DevSecOps/1.0'

        res = http.request(req)
        return :missing if res.code.to_i == 404
        return nil unless res.is_a?(Net::HTTPSuccess)

        JSON.parse(res.body)
      end
    end
  end
end
