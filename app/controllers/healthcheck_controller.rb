# frozen_string_literal: true

require_relative "application_controller"
module Controllers
  class HealthcheckController < ApplicationController
    def do_GET(_req, res)
      render_json(res, status: 200, body: { status: "ok" })
    end
  end
end
