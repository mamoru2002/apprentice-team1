# frozen_string_literal: true

require_relative '../../application_controller'
require_relative '../../../db/db'

module Controllers
  module Api
    module V1
      class MotivationMastersController < ApplicationController
        MAX_NAME_LENGTH = 60

        def do_GET(req, res)
          apply_cors_headers(res)

          user_id = require_user_id!(req, res)
          return unless user_id

          records = DB.client.select(
            'SELECT id, user_id, name FROM motivation_masters WHERE user_id = ? ORDER BY id ASC',
            [user_id],
          )

          render_json(res, status: 200, body: records.map { |row| format_master(row) })
        rescue StandardError => e
          handle_server_error(res, e)
        end

        def do_POST(req, res)
          apply_cors_headers(res)

          payload = parse_json_body(req)
          data = payload && payload[:motivation_master]
          user_id = extract_positive_integer(data && data[:user_id])
          name = data && data[:name].to_s.strip

          errors = []
          errors << 'user_id を指定してください。' unless user_id
          if name.nil? || name.empty?
            errors << '名前を入力してください。'
          elsif name.length > MAX_NAME_LENGTH
            errors << "名前は#{MAX_NAME_LENGTH}文字以内で入力してください。"
          end

          unless errors.empty?
            return render_json(res, status: 422, body: { error: '入力値が不正です。', details: errors })
          end

          new_id = DB.client.execute(
            'INSERT INTO motivation_masters (user_id, name, created_at, updated_at) VALUES (?, ?, NOW(), NOW())',
            [user_id, name],
          )

          record = DB.client.select(
            'SELECT id, user_id, name FROM motivation_masters WHERE id = ?',
            [new_id],
          ).first

          render_json(res, status: 201, body: format_master(record))
        rescue Mysql2::Error => e
          case e.error_number
          when 1062
            render_json(res, status: 409, body: { error: '同じ名前の動機が既に登録されています。' })
          when 1452
            render_json(res, status: 404, body: { error: '指定されたユーザーが見つかりません。' })
          else
            handle_server_error(res, e)
          end
        rescue StandardError => e
          handle_server_error(res, e)
        end

        private

        def format_master(row)
          {
            id: row[:id],
            user_id: row[:user_id],
            name: row[:name]
          }
        end
      end
    end
  end
end
