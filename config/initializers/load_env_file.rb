# config/initializers/load_env_file.rb
# Charge les variables du fichier .env sans écraser celles déjà présentes
# dans l'environnement (les variables réelles du shell ont la priorité).
env_file = Rails.root.join('.env')

if File.exist?(env_file)
  File.readlines(env_file).each do |line|
    line = line.strip
    next if line.blank? || line.start_with?('#')

    key, value = line.split('=', 2)
    next if key.blank? || value.nil?

    ENV[key] = value.strip unless ENV.key?(key)
  end
end
