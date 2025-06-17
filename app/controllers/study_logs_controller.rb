# frozen_string_literal: true

require_relative 'application_controller'
require_relative '../db/db'
require 'json'

module Controllers
  class StudyLogsController < ApplicationController
  

    def do_POST(req, res)
      payload = parse_json_body(req)
      errors = validate_params(payload)

      return render_json(res, status: 400, body: { error: '無効なパラメータです。', details: errors }) unless errors.empty?

      save_study_log(res, payload[:taskName], payload[:duration])
    rescue StandardError => e
      handle_server_error(res, e)
    end

    def validate_params(payload)
      errors = []
      errors << 'taskName は必須で、文字列である必要があります。' if payload[:taskName].to_s.empty?
      unless payload[:duration].is_a?(Integer) && payload[:duration] >= 0
        errors << 'duration は必須で、0以上の整数（ミリ秒）である必要があります。'
      end
      errors
    end

    def save_study_log(res, title, duration_ms)
      duration_seconds = (duration_ms / 1000.0).round
      DB::Client.instance.query(
        'INSERT INTO study_logs (title, duration, created_at) VALUES (?, ?, NOW())',
        [title, duration_seconds]
      )
      message = "#{title} の学習時間 #{format_duration(duration_ms)} を記録しました。"
      render_json(res, status: 201, body: { message: message })
    end

    def format_duration(ms)
      return '0秒' unless ms.positive?

      total_secs = ms / 1000
      hrs = total_secs / 3600
      mins = (total_secs % 3600) / 60
      secs = total_secs % 60

      [
        ("#{hrs}時間" if hrs.positive?),
        ("#{mins}分" if mins.positive?),
        ("#{secs}秒" if secs.positive?)
      ].compact.join.presence || '0秒'
    end
  end
end
