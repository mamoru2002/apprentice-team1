# frozen_string_literal: true

require_relative "application_controller"
require_relative "../db/db"
require "json"

module Controllers
  class ExpenseLogsController < ApplicationController
    def do_POST(req, res)
      payload = parse_json_body(req)
      errors = validate_params(payload)

      unless errors.empty?
        return render_json(res, status: 400,
                                body: { error: "\u7121\u52B9\u306A\u30D1\u30E9\u30E1\u30FC\u30BF\u3067\u3059\u3002", details: errors })
      end

      save_expense_log(res, payload[:title], payload[:amount])
    rescue StandardError => e
      handle_server_error(res, e)
    end

    def validate_params(payload)
      errors = []
      if payload[:title].to_s.empty?
        errors << "title \u306F\u5FC5\u9808\u3067\u3001\u6587\u5B57\u5217\u3067\u3042\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059\u3002"
      end
      unless payload[:amount].is_a?(Integer) && payload[:amount] >= 0
        errors << "amount \u306F\u5FC5\u9808\u3067\u30010\u4EE5\u4E0A\u306E\u6574\u6570\u3067\u3042\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059\u3002"
      end
      errors
    end

    def save_expense_log(res, title, amount)
      DB::Client.instance.query(
        "INSERT INTO expense_logs (title, amount, created_at) VALUES (?, ?, NOW())",
        [title, amount],
      )
      render_json(res, status: 201, body: { message: "#{title} を #{amount}円で記録しました。" })
    rescue Mysql2::Error => e
      warn "MySQL ERROR: #{e.message}"
      raise # ← 一度投げ直してログに全文出す
    end
  end
end
