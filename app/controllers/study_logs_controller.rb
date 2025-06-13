require_relative "application_controller"
module Controllers
  class StudyLogsController < ApplicationController
    def do_POST(req, res)
      payload = parse_json(req)
      render_json(res, status: 201, body: { message: "received", data: payload })
    end
    def do_GET(_req, res)
      render_json(res, status: 200, body: [])
    end
  end
end