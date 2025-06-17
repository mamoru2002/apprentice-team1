# frozen_string_literal: true

require_relative 'application_controller'
require_relative '../db/db'
require 'json'

module Controllers
  class ExpenseLogsController < ApplicationController
  

    def do_POST(req, res)
      payload = parse_json_body(req)
      errors = validate_params(payload)

      return render_json(res, status: 400, body: { error: '無効なパラメータです。', details: errors }) unless errors.empty?

      save_expense_log(res, payload[:title], payload[:amount])
    rescue StandardError => e
      handle_server_error(res, e)
    end

    def validate_params(payload)
      errors = []
      errors << 'title は必須で、文字列である必要があります。' if payload[:title].to_s.empty?
      errors << 'amount は必須で、0以上の整数である必要があります。' unless payload[:amount].is_a?(Integer) && payload[:amount] >= 0
      errors
    end

    def save_expense_log(res, title, amount)
      DB::Client.instance.query(
        'INSERT INTO expense_logs (title, amount, created_at) VALUES (?, ?, NOW())',
        [title, amount]
      )
      render_json(res, status: 201, body: { message: "#{title} を #{amount}円で記録しました。" })
    end
  end
end
