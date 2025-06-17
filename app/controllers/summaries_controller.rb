require_relative "./application_controller"
require_relative "../db"
require "json"
require "date"

module Controllers
  class SummariesController < ApplicationController
    def do_GET(req, res)
      begin
        case req.path
        when "/expense_summary"
          handle_expense_summary(req, res)
        when "/study_summary"
          handle_study_summary(req, res)
        else
          render_json(res, status: 404, body: { error: "Not Found" })
        end
      rescue Mysql2::Error => e
        render_json(res, status: 500, body: { error: "データベースエラーが発生しました。" })
      rescue => e
        render_json(res, status: 500, body: { error: "予期せぬサーバーエラーが発生しました: #{e.class}" })
      end
    end

    private

    def handle_expense_summary(req, res)
      today = Date.today
      start_of_month = Date.new(today.year, today.month, 1)
      
      monthly_result = DB::Client.instance.query(
        "SELECT SUM(amount) AS total FROM expense_logs WHERE created_at >= ?",
        [start_of_month]
      ).first
      monthly_total = monthly_result[:total] || 0

      grand_result = DB::Client.instance.query(
        "SELECT SUM(amount) AS total FROM expense_logs"
      ).first
      grand_total = grand_result[:total] || 0

      render_json(res, status: 200, body: {
        monthly_total: monthly_total,
        grand_total: grand_total
      })
    end

    def handle_study_summary(req, res)
      today = Date.today
      start_of_month = Date.new(today.year, today.month, 1)

      monthly_result = DB::Client.instance.query(
        "SELECT SUM(duration) AS total FROM study_logs WHERE created_at >= ?",
        [start_of_month]
      ).first
      monthly_total_seconds = monthly_result[:total] || 0

      grand_result = DB::Client.instance.query(
        "SELECT SUM(duration) AS total FROM study_logs"
      ).first
      grand_total_seconds = grand_result[:total] || 0
      
      render_json(res, status: 200, body: {
        monthly_total: (monthly_total_seconds / 3600.0).round(2),
        grand_total: (grand_total_seconds / 3600.0).round(2)
      })
    end
  end
end
