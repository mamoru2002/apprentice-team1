require 'webrick'
require 'json'

class ApplicationController < WEBrick::HTTPServlet::AbstractServlet
  def do_GET(req, res)
    set_cors_headers(res)
    render_json(res, status: 404, body: { error: 'Not Found' })
  end

  def do_POST(req, res)
    set_cors_headers(res)
    render_json(res, status: 404, body: { error: 'Not Found' })
  end

  def do_OPTIONS(req, res)
    set_cors_headers(res)
    res.status = 200
  end



  private

  def set_cors_headers(res)
    res['Access-Control-Allow-Origin'] = '*'
    res['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    res['Access-Control-Allow-Headers'] = 'Content-Type'
  end

  def parse_json_body(req)
    JSON.parse(req.body, symbolize_names: true)
  rescue JSON::ParserError
    nil
  end

  def render_json(res, status:, body:)
    res.status = status
    res['Content-Type'] = 'application/json'
    res.body = JSON.generate(body)
  end

  def handle_server_error(res, error)
    warn "Unexpected error: #{error.class} - #{error.message}"
    render_json(res, status: 500, body: { error: 'サーバーで予期せぬエラーが発生しました。' })
  end
end
