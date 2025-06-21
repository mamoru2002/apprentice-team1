# frozen_string_literal: true

require "bundler/setup"
require "dotenv/load"
require "webrick"
require_relative "app/controllers/application_controller"
require_relative "app/controllers/healthcheck_controller"
require_relative "app/controllers/study_logs_controller"
require_relative "app/controllers/expense_logs_controller"
require_relative "app/controllers/summaries_controller"
require_relative "config/routes"

port = ENV.fetch("PORT", 4567).to_i
public_dir = File.expand_path("./public", __dir__)
server = WEBrick::HTTPServer.new(Port: port, DocumentRoot: public_dir)

Config::ROUTES.each do |path, klass|
  server.mount(path, klass)
end

trap("INT") { server.shutdown }

puts "=================================================="
puts "サーバーを http://localhost:#{port} で起動します。"
puts "ブラウザで上記URLにアクセスしてください。"
puts "停止するには Ctrl+C を押してください。"
puts "=================================================="

server.start
