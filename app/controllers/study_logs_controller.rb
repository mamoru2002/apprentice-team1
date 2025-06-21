# frozen_string_literal: true

require_relative "application_controller"
require_relative "../db/db"
require "json"
require "date"

module Controllers
  class StudyLogsController < ApplicationController
    def do_POST(req, res)
      payload = parse_json_body(req)
      errors = validate_params(payload)

      unless errors.empty?
        return render_json(res, status: 400,
                                body: { error: "無効なパラメータです。", details: errors })
      end

      save_study_log(res, payload[:title], payload[:duration])
    rescue StandardError => e
      handle_server_error(res, e)
    end

    def do_GET(_req, res)
      results = DB.client.select(
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
      if payload[:title].to_s.empty?
        errors << "title は必須で、文字列である必要があります。"
      end
      unless payload[:duration].is_a?(Integer) && payload[:duration] >= 0
        errors << "duration は必須で、0以上の整数（ミリ秒）である必要があります。"
      end
      errors
    end

    def save_study_log(res, title, duration_ms)
      duration_seconds = (duration_ms / 1000.0).round
      DB.client.execute(
        "INSERT INTO study_logs (title, duration, date, created_at) VALUES (?, ?, CURDATE(), NOW())",
        [title, duration_seconds],
      )
      message = "#{title} の学習時間 #{format_duration(duration_ms)} を記録しました。"
      render_json(res, status: 201, body: { message: message })
    end

    def format_duration(ms)
      return "0秒" unless ms.positive?

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
      result.empty? ? "0秒" : result
    end

    def do_PATCH(req, res)
      id = req.path.split('/').last
      payload = parse_json_body(req)
      errors = validate_patch_params(payload)
      unless errors.empty?
        return render_json(res, status: 400, body: { error: "無効なパラメータです。", details: errors})
      end
      update_study_log(res, id, payload)
    rescue StandardError => e
      handle_server_error(res, e)
    end

    def do_DELETE(req, res)
      id = req.path.split('/').last
      delete_study_log(res, id)
    rescue StandardError => e
      handle_server_error(res, e)
    end

    private

    def validate_patch_params(payload)
      errors = []
      errors << "title は必須です。" if payload[:title].to_s.empty?
      errors << "duration は必須で、0以上の整数である必要があります。" unless payload[:duration].is_a?(Integer) && payload[:duration] >= 0
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

    def update_study_log(res, id, payload)
      result = DB.client.execute(
        'UPDATE study_logs SET title = ?, duration = ?, date = ? WHERE id = ?',
        [payload[:title], payload[:duration], payload[:date], id]
      )

      if result > 0
        render_json(res, status: 200, body: { message: "ID:#{id}の学習記録を更新しました" })
      else
        render_json(res, status: 404, body: { error: "ID:#{id}の学習記録が見つかりません" })
      end
    end

    def delete_study_log(res, id)
      result = DB.client.execute('DELETE FROM study_logs WHERE id = ?', [id])
      
      if result > 0
        res.status = 204
      else
        render_json(res, status: 404, body: { error: "ID:#{id}の学習記録が見つかりません" })
      end
    end
  end
end