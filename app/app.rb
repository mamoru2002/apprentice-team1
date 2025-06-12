
require 'bundler/setup'
require 'dotenv/load'
require 'webrick'
require_relative '../app/db'
require_relative '../app/controllers/application_controller'
require_relative '../app/controllers/healthcheck_controller'
require_relative '../app/controllers/study_logs_controller'
require_relative '../app/controllers/expense_logs_controller'
require_relative '../config/routes'

port = ENV.fetch('PORT', '4567').to_i
server = WEBrick::HTTPServer.new(Port: port)

Config::Routes.each { |path, klass| server.mount(path, klass) }

server.mount_proc '/' do |req, res|
  html = File.read('./app/views/index.html')
  res['Content-Type'] = 'text/html'
  res.body = html
end

trap('INT') { server.shutdown }
server.start