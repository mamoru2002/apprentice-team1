# frozen_string_literal: true

require_relative "application_controller"
require_relative "../db/db"
require "json"
require "date"

module Controllers
  class ExpenseLogsController < ApplicationController
    def do_POST(req, res)
      payload = parse_json_body(req)
      errors = validate_params(payload)

      unless errors.empty?
        return render_json(res, status: 400,
                                body: { error: "無効なパラメータです。", details: errors })
      end

      save_expense_log(res, payload[:title], payload[:amount])
    rescue StandardError => e
      handle_server_error(res, e)
    end
    
    def do_GET(_req, res)
      results = DB.client.select(
        "SELECT id, title, amount, created_at FROM expense_logs ORDER BY created_at DESC",
      )
      logs = results.map do |row|
        {
          id: row[:id],
          title: row[:title],
          amount: row[:amount],
          created_at: row[:created_at].strftime("%Y-%m-%dT%H:%M:%SZ")
        }
      end
      render_json(res, status: 200, body: logs)
    rescue Mysql2::Error => e
      warn "Database error fetching expense logs: #{e.message}"
      render_json(res, status: 400,
                       body: { error: "支出ログの取得に失敗しました。" })
    rescue StandardError => e
      warn "Unexpected error in ExpenseLogsController#do_GET: #{e.class} - #{e.message}"
      render_json(res, status: 500,
                       body: { error: "サーバーエラーが発生しました。" })
    end

    def validate_params(payload)
      errors = []
      errors << "title は必須で、文字列である必要があります。" if payload[:title].to_s.empty?
      errors << "amount は必須で、0 以上の整数である必要があります。" unless payload[:amount].is_a?(Integer) && payload[:amount] >= 0
      errors
    end

    def save_expense_log(res, title, amount)
      DB.client.execute(
        "INSERT INTO expense_logs (title, amount, date, created_at) VALUES (?, ?, CURDATE(), NOW())",
        [title, amount],
      )
      render_json(res, status: 201, body: { message: "#{title} を #{amount}円で記録しました。" })
    rescue Mysql2::Error => e
      warn "MySQL ERROR: #{e.message}"
      render_json(res, status: 500, body: { error: "データベースエラーが発生しました。" })
    end

    def do_PATCH(req, res)
      id = req.path.split('/').last
      payload = parse_json_body(req)
      errors = validate_patch_params(payload)
      unless errors.empty?
        return render_json(res, status: 400, body: { error: "無効なパラメータです。", details: errors })
      end
      update_expense_log(res, id, payload)
    rescue StandardError => e
      handle_server_error(res, e)
    end

    def do_DELETE(req, res)
      id = req.path.split('/').last
      delete_expense_log(res, id)
    rescue StandardError => e
      handle_server_error(res, e)
    end

    private

    def validate_patch_params(payload)
      errors = []
      errors << "title は必須です。" if payload[:title].to_s.empty?
      errors << "amount は必須で、0以上の整数である必要があります。" unless payload[:amount].is_a?(Integer) && payload[:amount] >= 0
      errors << "date は必須で、YYYY-MM-DD形式である必要があります。" unless valid_date?(payload[:date])
      errors
    end
    
    def valid_date?(date_str)
        return false unless date_str && date_str.match?(/\A\d{4}-\d{2}-\d{2}\z/)
        Date.parse(date_str)
        true
    rescue Date::Error
        false
    end
    
    def update_expense_log(res, id, payload)
      result = DB.client.execute(
        'UPDATE expense_logs SET title = ?, amount = ?, date = ? WHERE id = ?',
        [payload[:title], payload[:amount], payload[:date], id]
      )

      if result > 0
        render_json(res, status: 200, body: { message: "ID:#{id}の支出記録を更新しました" })
      else
        render_json(res, status: 404, body: { error: "ID:#{id}の支出記録が見つかりません" })
      end
    end

    def delete_expense_log(res, id)
      result = DB.client.execute('DELETE FROM expense_logs WHERE id = ?', [id])
      
      if result > 0
        res.status = 204
      else
        render_json(res, status: 404, body: { error: "ID:#{id}の支出記録が見つかりません" })
      end
    end
  end
end