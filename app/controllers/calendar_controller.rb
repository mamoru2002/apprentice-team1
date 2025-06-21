# frozen_string_literal: true

require_relative "application_controller"
require_relative "../db/db"
require "json"
require "date"

module Controllers
  class CalendarController < ApplicationController
    def do_GET(_req, res)
      apply_cors_headers(res)
      fetch_calendar_data(res)
    rescue Mysql2::Error => e
      warn "DB error in CalendarController: #{e.message}"
      render_json(res, status: 500, body: { error: "データベースエラーが発生しました。" })
    rescue StandardError => e
      handle_server_error(res, e)
    end

    private

    def fetch_calendar_data(res)
      query = <<~SQL
        SELECT dates.date AS date,
               COALESCE(expense.total, 0) AS total_expense,
               ROUND(COALESCE(study.total, 0) / 3600.0, 2) AS total_hours
        FROM (
          SELECT date FROM expense_logs
          UNION
          SELECT date FROM study_logs
        ) dates
        LEFT JOIN (
          SELECT date, SUM(amount) AS total
          FROM expense_logs
          GROUP BY date
        ) expense ON dates.date = expense.date
        LEFT JOIN (
          SELECT date, SUM(duration) AS total
          FROM study_logs
          GROUP BY date
        ) study ON dates.date = study.date
        ORDER BY dates.date
      SQL

      result = DB.client.select(query)
      records = result.map do |row|
        {
          date: row[:date].to_s,
          total_expense: row[:total_expense].to_i,
          total_hours: row[:total_hours].to_f
        }
      end

      render_json(res, status: 200, body: records)
    end
  end
end
