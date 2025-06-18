# frozen_string_literal: true

require_relative "application_controller"
require_relative "../db/db"
require "json"
require "date"

module Controllers
  class SummariesController < ApplicationController
    def do_GET(req, res)
      case req.path
      when "/api/expense_summary"
        handle_expense_summary(req, res)
      when "/api/study_summary"
        handle_study_summary(req, res)
      else
        render_json(res, status: 404, body: { error: "Not Found" })
      end
    rescue Mysql2::Error
      render_json(res, status: 500,
                       body: { error: "\u30C7\u30FC\u30BF\u30D9\u30FC\u30B9\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F\u3002" })
    rescue StandardError => e
      render_json(res, status: 500, body: { error: "予期せぬサーバーエラーが発生しました: #{e.class}" })
    end

    def handle_expense_summary(_req, res)
      today = Date.today
      start_of_month = Date.new(today.year, today.month, 1)

      monthly_result = DB::Client.instance.query(
        "SELECT SUM(amount) AS total FROM expense_logs WHERE created_at >= ?",
        [start_of_month],
      ).first
      monthly_total = (monthly_result[:total] || 0).to_i

      grand_result = DB::Client.instance.query(
        "SELECT SUM(amount) AS total FROM expense_logs",
      ).first
      grand_total = (grand_result[:total] || 0).to_i

      render_json(res, status: 200, body: {
                    monthly_total: monthly_total,
                    grand_total: grand_total
                  })
    end

    def handle_study_summary(_req, res)
      today          = Date.today
      start_of_month = Date.new(today.year, today.month, 1)

      monthly_result = DB::Client.instance.query(
        "SELECT SUM(duration) AS total FROM study_logs WHERE created_at >= ?",
        [start_of_month],
      ).first
      monthly_total = (monthly_result[:total] || 0).to_i

      grand_result = DB::Client.instance.query(
        "SELECT SUM(duration) AS total FROM study_logs",
      ).first
      grand_total = (grand_result[:total] || 0).to_i

      render_json(res, status: 200, body: {
                    monthly_total: (monthly_total / 3600.0).round(2),
                    grand_total: (grand_total / 3600.0).round(2)
                  })
    end
  end
end
