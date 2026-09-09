require 'rails_helper'

RSpec.describe 'New Security Scanners (GR-301 to GR-304)' do
  let(:user)    { create(:user) }
  let(:project) { create(:project, user: user) }
  let(:scan)    { create(:scan, project: project) }

  describe Scanners::ScannerRegistry do
    it 'includes BundlerAuditScanner for ruby projects' do
      scanners = described_class.for(languages: ['ruby'])
      expect(scanners).to include(Scanners::BundlerAuditScanner)
    end

    it 'includes NpmAuditScanner for javascript/typescript projects' do
      scanners = described_class.for(languages: ['javascript'])
      expect(scanners).to include(Scanners::NpmAuditScanner)

      ts_scanners = described_class.for(languages: ['typescript'])
      expect(ts_scanners).to include(Scanners::NpmAuditScanner)
    end

    it 'includes GitleaksScanner for any project' do
      scanners = described_class.for(languages: ['ruby'])
      expect(scanners).to include(Scanners::GitleaksScanner)

      py_scanners = described_class.for(languages: ['python'])
      expect(py_scanners).to include(Scanners::GitleaksScanner)
    end
  end

  describe Scanners::BundlerAuditScanner do
    subject(:scanner) { described_class.new(scan) }

    it 'identifies support only when Gemfile.lock exists' do
      Dir.mktmpdir do |dir|
        expect(scanner.supported?(dir)).to be false
        File.write(File.join(dir, 'Gemfile.lock'), 'GEM')
        expect(scanner.supported?(dir)).to be true
      end
    end

    it 'parses bundler-audit JSON and normalizes findings into ScanResult' do
      mock_output = {
        'version' => '0.9.3',
        'results' => [
          {
            'type' => 'unpatched_gem',
            'gem' => { 'name' => 'rails', 'version' => '7.0.0' },
            'advisory' => {
              'id' => 'CVE-2023-22795',
              'title' => 'ReDoS in Action Dispatch',
              'cve' => '2023-22795',
              'criticality' => 'high',
              'patched_versions' => ['>= 7.0.4.1']
            }
          }
        ]
      }

      allow(scanner).to receive(:run_bundler_audit).and_return(mock_output)

      result = scanner.scan('/fake/path')
      expect(result).to be_a(Scanners::ScanResult)
      expect(result.scan_type).to eq('dependency')
      expect(result.scanner).to eq('bundler_audit')
      expect(result.vulnerabilities.size).to eq(1)

      vuln = result.vulnerabilities.first
      expect(vuln.warning_type).to eq('Vulnerable Dependency')
      expect(vuln.severity).to eq('high')
      expect(vuln.check_name).to eq('CVE-2023-22795')
      expect(vuln.file).to eq('Gemfile.lock')
      expect(vuln.fingerprint).to be_present
    end
  end

  describe Scanners::NpmAuditScanner do
    subject(:scanner) { described_class.new(scan) }

    it 'identifies support when package.json and package-lock.json exist' do
      Dir.mktmpdir do |dir|
        expect(scanner.supported?(dir)).to be false
        File.write(File.join(dir, 'package.json'), '{}')
        expect(scanner.supported?(dir)).to be false
        File.write(File.join(dir, 'package-lock.json'), '{}')
        expect(scanner.supported?(dir)).to be true
      end
    end

    it 'parses npm audit JSON and normalizes findings into ScanResult' do
      mock_output = {
        'auditReportVersion' => 2,
        'vulnerabilities' => {
          'lodash' => {
            'name' => 'lodash',
            'severity' => 'high',
            'range' => '<4.17.21',
            'via' => [
              {
                'source' => 1065,
                'name' => 'lodash',
                'title' => 'Prototype Pollution in lodash',
                'url' => 'https://github.com/advisories/GHSA-p6mc-m468-83gw',
                'severity' => 'high',
                'cwe' => ['CWE-1321'],
                'range' => '<4.17.21'
              }
            ]
          }
        }
      }

      allow(scanner).to receive(:run_npm_audit).and_return(mock_output)

      result = scanner.scan('/fake/path')
      expect(result).to be_a(Scanners::ScanResult)
      expect(result.scan_type).to eq('dependency')
      expect(result.scanner).to eq('npm_audit')
      expect(result.vulnerabilities.size).to eq(1)

      vuln = result.vulnerabilities.first
      expect(vuln.warning_type).to eq('Vulnerable Dependency')
      expect(vuln.severity).to eq('high')
      expect(vuln.file).to eq('package.json')
      expect(vuln.check_name).to eq('GHSA-p6mc-m468-83gw')
      expect(vuln.cwe).to eq([1321])
      expect(vuln.fingerprint).to be_present
    end
  end

  describe Scanners::GitleaksScanner do
    subject(:scanner) { described_class.new(scan) }

    it 'supports any repository' do
      expect(scanner.supported?('/any/path')).to be true
    end

    it 'masks secrets and generates stable fingerprints' do
      Dir.mktmpdir do |dir|
        test_file = File.join(dir, 'config.rb')
        File.write(test_file, 'GITHUB_PAT = "ghp_1234567890abcdefghijklmnopqrstuvwxyz"')

        result = scanner.scan(dir)
        expect(result.vulnerabilities.size).to be >= 1

        vuln = result.vulnerabilities.find { |v| v.check_name == 'github-pat' }
        expect(vuln).to be_present
        expect(vuln.scan_type).to eq('secret')
        expect(vuln.severity).to eq('critical')
        expect(vuln.code).not_to include('1234567890abcdefghijklmnopqrstuvwxyz') # Must be masked!
        expect(vuln.code).to include('ghp_')
        expect(vuln.fingerprint).to be_present
      end
    end
  end
end
