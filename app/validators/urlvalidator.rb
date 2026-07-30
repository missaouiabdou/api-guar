class UrlValidator < ActiveModel::EachValidator
  def validate_each(record, attribute, value)
    return if value.blank?

    uri = URI.parse(value)
    unless uri.is_a?(URI::HTTP) || uri.is_a?(URI::HTTPS) || value.start_with?('git@')
      record.errors.add(attribute, :invalid, message: "must be a valid URL (http, https, or git)")
    end
  rescue URI::InvalidURIError
    record.errors.add(attribute, :invalid, message: "must be a valid URL")
  end
end