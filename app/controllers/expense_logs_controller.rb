require_relative "./application_controller"
require_relative "../db"
require "json"

module Controllers
  class ExpenseLogsController < ApplicationController
    def do_POST(req, res)
      begin
        payload = parse_json(req)

        title  = payload[:title]
        amount = payload[:amount]

        errors = []
        if title.nil? || !title.is_a?(String) || title.empty?
          errors << "title は必須で、文字列である必要があります。"
        end
        if amount.nil? || !amount.is_a?(Integer) || amount < 0
          errors << "amount は必須で、0以上の整数である必要があります。"
        end
        unless errors.empty?
          return render_json(res, status: 400,
            body: { error: "無効なパラメータです。", details: errors })
        end

        DB::Client.instance.query(
          "INSERT INTO expense_logs (title, amount, created_at) VALUES (?, ?, NOW())",
          [title, amount]
        )

        render_json(
          res,
          status: 201,
          body: {
            message: "#{title} を #{amount}円で記録しました。",
            logged:  { title: title, amount: amount }
          }
        )

      rescue JSON::ParserError => e
        render_json(res, status: 400, body: { error: "JSON形式エラー", details: e.message })
      rescue Mysql2::Error => e
        warn "Database error in ExpenseLogsController: #{e.message}"
        render_json(res, status: 500, body: { error: "データベースエラーが発生しました。" })
      rescue => e
        warn "Unexpected error in ExpenseLogsController: #{e.class} - #{e.message}\n#{e.backtrace.join("\n")}"
        render_json(res, status: 500, body: { error: "予期せぬサーバーエラーが発生しました: #{e.class}" })
      end
    end

    def do_GET(_req, res)
      begin
        results = DB::Client.instance.query(
          "SELECT id, title, amount, created_at FROM expense_logs ORDER BY created_at DESC"
        )

        logs = results.map do |row|
          {
            id:         row[:id],
            title:      row[:title],
            amount:     row[:amount],
            created_at: row[:created_at].strftime("%Y-%m-%dT%H:%M:%SZ")
          }
        end
        render_json(res, status: 200, body: logs)

      rescue Mysql2::Error => e
        warn "Database error fetching expense logs: #{e.message}"
        render_json(res, status: 500, body: { error: "データベースエラーにより取得できませんでした。" })
      rescue => e
        warn "Unexpected error fetching expense logs: #{e.class} - #{e.message}\n#{e.backtrace.join("\n")}"
        render_json(res, status: 500, body: { error: "予期せぬエラーが発生しました: #{e.class}" })
      end
    end
  end
end