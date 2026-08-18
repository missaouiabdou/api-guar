module Github
  class ProjectResolver
    def call(repository)
      project = Project.find_by(github_repo: repository)
      raise InvalidPayloadError, "Unknown repository: #{repository}" if project.nil?

      project
    end
  end
end