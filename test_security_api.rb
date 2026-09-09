user = User.find_by(email: 'ahmed@example.com') || User.first
p = Project.find(7)
app = ActionDispatch::Integration::Session.new(Rails.application)
token = Warden::JWTAuth::UserEncoder.new.call(user, :user, nil).first

app.get("/api/v1/projects/#{p.id}/security", headers: { 'Authorization' => "Bearer #{token}" })
puts "=== /projects/#{p.id}/security ==="
puts "STATUS: #{app.response.code}"
puts "BODY: #{app.response.body}"

app.get("/api/v1/vulnerabilities?project_id=#{p.id}&status=open&latest=true", headers: { 'Authorization' => "Bearer #{token}" })
puts "\n=== /vulnerabilities?project_id=#{p.id}&status=open&latest=true ==="
puts "STATUS: #{app.response.code}"
data = JSON.parse(app.response.body)['data'] || []
puts "TOTAL COUNT: #{data.size}"
puts "FIRST 3: #{data.first(3).inspect}"
