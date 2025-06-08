
require 'webrick'
require_relative './db'

server = WEBrick::HTTPServer.new(Port: 4567, DocumentRoot: './app/public')

server.mount_proc '/' do |req, res|
  html = File.read('./app/views/index.html')
  res['Content-Type'] = 'text/html'
  res.body = html
end

trap('INT') { server.shutdown }

server.start