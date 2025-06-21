# frozen_string_literal: true

require_relative "application_controller"
require_relative "../db/db"
require "json"
require "date"

module Controllers
  class SummariesController < ApplicationController
    def do_GET(req, res)
      set_cors_headers(res)

      case req.path
      when "/api/expense_summary"
        handle_expense_summary(req, res)
      when "/api/study_summary"
        handle_study_summary(req, res)
      when "/api/daily_details"
        handle_daily_details(req, res)
      else
        render_json(res, status: 404, body: { error: "Not Found" })
      end
    rescue Mysql2::Error => e
      warn "Database error in SummariesController: #{e.message}"
      render_json(res, status: 500, body: { error: "データベースエラーが発生しました。" })
    rescue StandardError => e
      handle_server_error(res, e)
    end

    private

    def handle_expense_summary(req, res)
      month_str = req.query['month'] || Date.today.strftime('%Y-%m')
      target_month = Date.parse("#{month_str}-01")

      start_of_month = Date.new(target_month.year, target_month.month, 1)
      end_of_month = start_of_month.next_month.prev_day


      monthly_result = DB.client.select(
        "SELECT SUM(amount) AS total FROM expense_logs WHERE date BETWEEN ? AND ?",
        [start_of_month, end_of_month],
      ).first
      monthly_total = (monthly_result[:total] || 0).to_i

      grand_result = DB.client.select("SELECT SUM(amount) AS total FROM expense_logs").first
      grand_total = (grand_result[:total] || 0).to_i

      render_json(res, status: 200, body: { monthly_total: monthly_total, grand_total: grand_total })
    end

    def handle_study_summary(req, res)
      month_str = req.query['month'] || Date.today.strftime('%Y-%m')
      target_month = Date.parse("#{month_str}-01")

      start_of_month = Date.new(target_month.year, target_month.month, 1)
      end_of_month = start_of_month.next_month.prev_day


      monthly_result = DB.client.select(
        "SELECT SUM(duration) AS total FROM study_logs WHERE date BETWEEN ? AND ?",
        [start_of_month, end_of_month],
      ).first
      monthly_total_seconds = (monthly_result[:total] || 0).to_i


      grand_result = DB.client.select("SELECT SUM(duration) AS total FROM study_logs").first
      grand_total_seconds = (grand_result[:total] || 0).to_i

      render_json(res, status: 200, body: {
                    monthly_total_hours: (monthly_total_seconds / 3600.0).round(2),
                    grand_total_hours: (grand_total_seconds / 3600.0).round(2)
                  })
    end

    def handle_daily_details(req, res)
      date_str = req.query["date"]
      unless valid_date?(date_str)
        return render_json(res, status: 400, body: { error: "日付の形式が不正です。YYYY-MM-DD形式で指定してください。" })
      end

      fetch_and_render_daily_details(res, date_str)
    end

    def valid_date?(date_str)
      return false unless date_str && date_str.match?(/\A\d{4}-\d{2}-\d{2}\z/)
      Date.parse(date_str)
      true
    rescue Date::Error
      false
    end

    def fetch_and_render_daily_details(res, date)

      expense_records = DB.client.select(
        "SELECT id, amount, title FROM expense_logs WHERE date = ?",
        [date]
      )

      study_records = DB.client.select(
        "SELECT id, duration, title FROM study_logs WHERE date = ?",
        [date]
      )

      response_body = {
        expenses: expense_records.map { |row| { id: row[:id], amount: row[:amount], category: row[:title] } },
        studies: study_records.map { |row| { id: row[:id], duration_seconds: row[:duration], category: row[:title] } }
      }

      render_json(res, status: 200, body: response_body)
    end
  end
end