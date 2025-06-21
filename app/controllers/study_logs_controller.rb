# frozen_string_literal: true

require_relative "application_controller"
require_relative "../db/db"
require "json"
require "date"

module Controllers
  class StudyLogsController < ApplicationController
    # POST /api/study_logs
    def do_POST(req, res)
      payload = parse_json_body(req)
      errors  = validate_params(payload)

      unless errors.empty?
        return render_json(res, status: 400,
                                 body: { error: "無効なパラメータです。", details: errors })
      end

      save_study_log(res,
                payload[:title],
                payload[:duration],
                payload[:date])
    rescue StandardError => e
      handle_server_error(res, e)
    end

    # GET /api/study_logs
    def do_GET(_req, res)
      results = DB.client.select(
        "SELECT id, title, duration, date, created_at
             FROM study_logs
         ORDER BY created_at DESC"
      )
      logs = results.map do |row|
        {
          id:               row[:id],
          title:            row[:title],
          duration_seconds: row[:duration],
          date:             row[:date].strftime("%Y-%m-%d"),
          created_at:       row[:created_at].strftime("%Y-%m-%dT%H:%M:%SZ")
        }
      end
      render_json(res, status: 200, body: logs)
    rescue Mysql2::Error => e
      warn "Database error fetching study logs: #{e.message}"
      render_json(res, status: 500, body: { error: "学習ログの取得に失敗しました。" })
    rescue StandardError => e
      warn "Unexpected error in StudyLogsController#do_GET: #{e.message}"
      render_json(res, status: 500, body: { error: "サーバーエラーが発生しました。" })
    end

    # PATCH /api/study_logs/:id
    def do_PATCH(req, res)
      id      = req.path.split("/").last
      payload = parse_json_body(req)
      errors  = validate_patch_params(payload)

      unless errors.empty?
        return render_json(res, status: 400,
                                 body: { error: "無効なパラメータです。", details: errors })
      end

      update_study_log(res, id, payload)
    rescue StandardError => e
      handle_server_error(res, e)
    end

    # DELETE /api/study_logs/:id
    def do_DELETE(req, res)
      id = req.path.split("/").last
      delete_study_log(res, id)
    rescue StandardError => e
      handle_server_error(res, e)
    end

    private

    def validate_params(payload)
      errs = []
      errs << "title は必須で、文字列である必要があります。" if payload[:title].to_s.strip.empty?
      errs << "duration は必須で、0以上の整数（ミリ秒）である必要があります。" unless payload[:duration].is_a?(Integer) && payload[:duration] >= 0
      errs
    end

    def validate_patch_params(payload)
      errs = []
      errs << "title は必須です。" if payload[:title].to_s.strip.empty?
      errs << "duration は必須で、0以上の整数（秒）である必要があります。" unless payload[:duration].is_a?(Integer) && payload[:duration] >= 0
      errs << "date は必須で、YYYY-MM-DD形式である必要があります。" unless payload[:date]&.match?(/\A\d{4}-\d{2}-\d{2}\z/)
      errs
    end

    def save_study_log(res, title, duration_ms, date_str = nil)
      secs = (duration_ms / 1000.0).round

      if date_str.to_s.strip.empty?
        sql  = <<~SQL
          INSERT INTO study_logs (title, duration, date, created_at)
          VALUES (?, ?, CURDATE(), NOW())
        SQL
        args = [title, secs]
      else
        sql  = <<~SQL
          INSERT INTO study_logs (title, duration, date, created_at)
          VALUES (?, ?, ?, NOW())
        SQL
        args = [title, secs, date_str]
      end

      DB.client.execute(sql, args)
      message = "#{title} の学習時間 #{format_duration(duration_ms)} を記録しました。"
      render_json(res, status: 201, body: { message: message })
    rescue Mysql2::Error => e
      warn "MySQL ERROR: #{e.message}"
      render_json(res, status: 500, body: { error: "データベースエラーが発生しました。" })
    end

    def format_duration(ms)
      return "0秒" unless ms.positive?
      total = ms / 1000
      h     = total / 3600
      m     = (total % 3600) / 60
      s     = total % 60
      [("#{h}時間" if h.positive?), ("#{m}分" if m.positive?), ("#{s}秒" if s.positive?)].compact.join
    end

    def update_study_log(res, id, payload)
      result = DB.client.execute(
        "UPDATE study_logs
            SET title = ?, duration = ?, date = ?
          WHERE id = ?",
        [payload[:title], payload[:duration], payload[:date], id]
      )

      if result > 0
        render_json(res, status: 200, body: { message: "ID:#{id}の学習記録を更新しました" })
      else
        render_json(res, status: 404, body: { error: "ID:#{id}の学習記録が見つかりません" })
      end
    end

    def delete_study_log(res, id)
      result = DB.client.execute("DELETE FROM study_logs WHERE id = ?", [id])
      if result > 0
        res.status = 204
      else
        render_json(res, status: 404, body: { error: "ID:#{id}の学習記録が見つかりません" })
      end
    end
  end
end