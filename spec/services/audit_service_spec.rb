require 'rails_helper'

RSpec.describe AuditService do
  let(:user) { create(:user) }

  it 'records an immutable audit log entry' do
    log = described_class.log(
      actor: user,
      action: 'project_created',
      resource_type: 'Project',
      resource_id: 123,
      metadata: { name: 'My Secure Project' }
    )

    expect(log).to be_persisted
    expect(log.actor_id).to eq(user.id)
    expect(log.actor_email).to eq(user.email)
    expect(log.action).to eq('project_created')
    expect(log.resource_type).to eq('Project')
    expect(log.metadata['name']).to eq('My Secure Project')

    # Immutability check
    expect { log.destroy }.to raise_error(ActiveRecord::ReadOnlyRecord)
  end

  it 'sanitizes passwords, tokens and JWT secrets' do
    log = described_class.log(
      actor: user,
      action: 'user_login',
      resource_type: 'User',
      resource_id: user.id,
      metadata: {
        password: 'superSecretPassword',
        auth_token: 'ghp_secretToken',
        nested: { api_key: 'xyz123' }
      }
    )

    expect(log.metadata['password']).to eq('[FILTERED]')
    expect(log.metadata['auth_token']).to eq('[FILTERED]')
    expect(log.metadata.dig('nested', 'api_key')).to eq('[FILTERED]')
  end
end
