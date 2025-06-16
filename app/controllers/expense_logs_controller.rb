require_relative "./application_controller"
require_relative "../db"
require "json"

module Controllers
  class ExpenseLogsController < ApplicationController
    def do_POST(req, res)
      payload = parse_json(req)
      amount = payload[:amount]
      title   = payload[:title]

      errors = []
      errors << "amount は必須で、0以上の整数である必要があります。" unless amount.is_a?(Integer) && amount >= 0

      unless errors.empty?
        return render_json(res, status: 400, body: { error: "無効なパラメータです。", details: errors })
      end

      DB::Client.instance.query(
        "INSERT INTO expense_logs (amount, title, created_at) VALUES (?, ?, NOW())",
        [amount, title]
      )
      render_json(res, status: 201, body: { message: "支出を記録しました。", logged: { amount: amount, title: title } })
    end

    def do_GET(_req, res)
      results = DB::Client.instance.query("SELECT id, amount, title, created_at FROM expense_logs ORDER BY created_at DESC")
      logs = results.map do |row|
        {
          id: row[:id],
          amount: row[:amount],
          title: row[:title],
          created_at: row[:created_at].strftime("%Y-%m-%dT%H:%M:%SZ")
        }
      end
      render_json(res, status: 200, body: logs)
    end
  end
end