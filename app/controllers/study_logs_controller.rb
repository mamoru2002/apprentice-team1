# frozen_string_literal: true

require_relative "application_controller"
require_relative "../db/db"
require "json"

module Controllers
  class StudyLogsController < ApplicationController
    def do_POST(req, res)
      payload = parse_json_body(req)
      errors = validate_params(payload)

      unless errors.empty?
        return render_json(res, status: 400,
                                body: { error: "\u7121\u52B9\u306A\u30D1\u30E9\u30E1\u30FC\u30BF\u3067\u3059\u3002", details: errors })
      end

      save_study_log(res, payload[:taskName], payload[:duration])
    rescue StandardError => e
      handle_server_error(res, e)
    end

    def do_GET(_req, res)
      results = DB::Client.instance.query(
        "SELECT id, title, duration, created_at
             FROM study_logs
         ORDER BY created_at DESC",
      )
      logs = results.map do |row|
        {
          id: row[:id],
          title: row[:title],
          duration_seconds: row[:duration],
          created_at: row[:created_at].strftime("%Y-%m-%dT%H:%M:%SZ")
        }
      end
      render_json(res, status: 200, body: logs)
    rescue Mysql2::Error => e
      warn "Database error fetching study logs: #{e.message}"
      render_json(res, status: 500, body: { error: "学習ログの取得に失敗しました。" })
    rescue StandardError => e
      warn "Unexpected error in StudyLogsController#do_GET: #{e.class} - #{e.message}"
      render_json(res, status: 500, body: { error: "サーバーエラーが発生しました。" })
    end

    def validate_params(payload)
      errors = []
      if payload[:taskName].to_s.empty?
        errors << "taskName \u306F\u5FC5\u9808\u3067\u3001\u6587\u5B57\u5217\u3067\u3042\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059\u3002"
      end
      unless payload[:duration].is_a?(Integer) && payload[:duration] >= 0
        errors << "duration \u306F\u5FC5\u9808\u3067\u30010\u4EE5\u4E0A\u306E\u6574\u6570\uFF08\u30DF\u30EA\u79D2\uFF09\u3067\u3042\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059\u3002"
      end
      errors
    end

    def save_study_log(res, title, duration_ms)
      duration_seconds = (duration_ms / 1000.0).round
      DB::Client.instance.query(
        "INSERT INTO study_logs (title, duration, created_at) VALUES (?, ?, NOW())",
        [title, duration_seconds],
      )
      message = "#{title} の学習時間 #{format_duration(duration_ms)} を記録しました。"
      render_json(res, status: 201, body: { message: message })
    end

    def format_duration(ms)
      return "0\u79D2" unless ms.positive?

      total_secs = ms / 1000
      hrs = total_secs / 3600
      mins = (total_secs % 3600) / 60
      secs = total_secs % 60

      parts = [
        ("#{hrs}時間" if hrs.positive?),
        ("#{mins}分"   if mins.positive?),
        ("#{secs}秒"   if secs.positive?)
      ].compact

      result = parts.join
      result.empty? ? "0\u79D2" : result
    end
  end
end
