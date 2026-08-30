# app/services/scanners/language_detector.rb
#
# Detects programming languages present in a repository
# by looking for language-specific manifest files.
#
module Scanners
  class LanguageDetector
    MANIFEST_MAP = {
      "ruby"       => %w[Gemfile Gemfile.lock .ruby-version],
      "javascript" => %w[package.json package-lock.json yarn.lock],
      "typescript" => %w[tsconfig.json],
      "python"     => %w[requirements.txt Pipfile pyproject.toml setup.py setup.cfg],
      "java"       => %w[pom.xml build.gradle build.gradle.kts],
      "go"         => %w[go.mod go.sum],
      "php"        => %w[composer.json composer.lock],
      "rust"       => %w[Cargo.toml Cargo.lock],
      "csharp"     => %w[*.csproj *.sln global.json],
      "kotlin"     => %w[build.gradle.kts settings.gradle.kts],
      "swift"      => %w[Package.swift Podfile]
    }.freeze

    attr_reader :repo_path

    def self.call(repo_path)
      new(repo_path).call
    end

    def initialize(repo_path)
      @repo_path = repo_path
    end

    # Returns Array of detected language strings e.g. ["ruby", "javascript"]
    def call
      detected = MANIFEST_MAP.each_with_object([]) do |(lang, manifests), found|
        found << lang if manifests.any? { |m| manifest_present?(m) }
      end

      Rails.logger.info "🔍 LanguageDetector: detected #{detected.join(', ')} in #{repo_path}"
      detected
    end

    private

    def manifest_present?(pattern)
      # Support glob patterns like *.csproj
      if pattern.include?("*")
        Dir.glob(File.join(repo_path, "**", pattern)).any?
      else
        # Check at root and one level deep (monorepos)
        File.exist?(File.join(repo_path, pattern)) ||
          Dir.glob(File.join(repo_path, "*", pattern)).any?
      end
    end
  end
end
