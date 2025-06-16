require "json"
module Controllers
  class ApplicationController < WEBrick::HTTPServlet::AbstractServlet
    def render_json(res, status:, body:)
      res.status = status
      res["Content-Type"] = "application/json"
      res.body = JSON.generate(body)
    end
    def parse_json(req) = JSON.parse(req.body, symbolize_names: true) rescue nil
  end
end