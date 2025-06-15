require_relative "./application_controller"
require_relative "../db"
require 'json'

module Controllers
  class StudyLogsController < ApplicationController
    def do_POST(req, res)
      begin
        payload = parse_json(req)

        title = payload[:taskName]
        duration_ms = payload[:duration]

        errors = []
        if title.nil? || !title.is_a?(String) || title.empty?
          errors << "taskName は必須で、文字列である必要があります。"
        end
        if duration_ms.nil? || !duration_ms.is_a?(Integer) || duration_ms < 0
          errors << "duration は必須で、0以上の整数（ミリ秒）である必要があります。"
        end

        unless errors.empty?
          render_json(res, status: 400, body: { error: "無効なパラメータです。", details: errors })
          return
        end

        duration_seconds = (duration_ms / 1000.0).round # ミリ秒を秒に変換し、丸める

        DB::Client.instance.query(
          "INSERT INTO study_logs (title, duration, created_at) VALUES (?, ?, NOW())",
          [title, duration_seconds] # 秒単位で保存
        )

        success_message = "#{title} の学習時間 #{format_duration_for_response(duration_ms)} を記録しました。"
        render_json(res, status: 201, body: { message: success_message, logged: { taskName: title, duration_ms: duration_ms, duration_s: duration_seconds } })

      rescue JSON::ParserError => e
        render_json(res, status: 400, body: { error: 'リクエストボディが正しいJSON形式ではありません。', details: e.message })
      rescue Mysql2::Error => e
        warn "Database error in StudyLogsController: #{e.message}"
        render_json(res, status: 500, body: { error: 'データベースエラーが発生しました。記録に失敗しました。' })
      rescue => e
        warn "Unexpected error in StudyLogsController: #{e.class} - #{e.message}\n#{e.backtrace.join("\n")}"
        render_json(res, status: 500, body: { error: "予期せぬサーバーエラーが発生しました: #{e.class}" })
      end
    end

    def do_GET(_req, res)
      render_json(res, status: 200, body: [])
    end

    private

    def format_duration_for_response(time_ms)
      return "0秒" if time_ms == 0

      ms_part = (time_ms % 1000) / 10
      total_secs = time_ms / 1000
      secs_part = total_secs % 60
      total_mins = total_secs / 60
      mins_part = total_mins % 60
      hrs_part = total_mins / 60

      parts = []
      parts << "#{hrs_part}時間" if hrs_part > 0
      parts << "#{mins_part}分" if mins_part > 0
      
      if secs_part > 0 || ms_part > 0
        sec_ms_string = secs_part.to_s
        if ms_part > 0
          sec_ms_string += ".#{ms_part.to_s.rjust(2, '0')}"
        end
        parts << "#{sec_ms_string}秒"
      elsif parts.empty?
        parts << "0秒"
      end
      
      parts.join('')
    end
  end
end