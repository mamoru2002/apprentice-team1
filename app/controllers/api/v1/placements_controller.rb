# frozen_string_literal: true

require_relative '../../application_controller'
require_relative '../../../db/db'

module Controllers
  module Api
    module V1
      class PlacementsController < ApplicationController
        ALLOWED_KINDS = %w[motivation preference].freeze

        def do_GET(req, res)
          apply_cors_headers(res)

          user_id = require_user_id!(req, res)
          return unless user_id

          work_item_id = extract_positive_integer(req.query['work_item_id'])
          unless work_item_id
            return render_json(res, status: 400, body: { error: 'work_item_id パラメータは必須です。' })
          end

          unless work_item_owned_by_user?(user_id, work_item_id)
            return render_json(res, status: 404, body: { error: '指定されたワークアイテムが見つかりません。' })
          end

          sql = <<~SQL
            SELECT id, user_id, work_item_id, kind, master_id, x, y
              FROM placements
             WHERE user_id = ? AND work_item_id = ?
          ORDER BY id ASC
          SQL

          records = DB.client.select(sql, [user_id, work_item_id])

          render_json(res, status: 200, body: records.map { |row| format_record(row) })
        rescue StandardError => e
          handle_server_error(res, e)
        end

        def do_POST(req, res)
          apply_cors_headers(res)

          payload = parse_json_body(req)
          data = payload && payload[:placement]
          user_id = extract_positive_integer(data && data[:user_id])
          work_item_id = extract_positive_integer(data && data[:work_item_id])
          kind = data && data[:kind].to_s
          master_id = extract_positive_integer(data && data[:master_id])
          x = data && data[:x]
          y = data && data[:y]

          errors = validate_payload(user_id, work_item_id, kind, master_id, x, y)
          unless errors.empty?
            return render_json(res, status: 422, body: { error: '入力値が不正です。', details: errors })
          end

          unless work_item_owned_by_user?(user_id, work_item_id)
            return render_json(res, status: 404, body: { error: '指定されたワークアイテムが見つかりません。' })
          end

          master_error = ensure_master_available(user_id, work_item_id, kind, master_id)
          if master_error
            return render_json(res, status: 404, body: { error: master_error })
          end

          new_id = DB.client.execute(
            <<~SQL,
              INSERT INTO placements (user_id, work_item_id, kind, master_id, x, y, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
            SQL
            [user_id, work_item_id, kind, master_id, x, y],
          )

          record = DB.client.select(
            'SELECT id, user_id, work_item_id, kind, master_id, x, y FROM placements WHERE id = ?',
            [new_id],
          ).first

          render_json(res, status: 201, body: format_record(record))
        rescue Mysql2::Error => e
          case e.error_number
          when 1062
            render_json(res, status: 409, body: { error: 'このカードは既に配置されています。' })
          when 1452
            render_json(res, status: 404, body: { error: '関連するレコードが見つかりません。' })
          else
            handle_server_error(res, e)
          end
        rescue StandardError => e
          handle_server_error(res, e)
        end

        def do_PATCH(req, res)
          apply_cors_headers(res)

          placement_id = extract_positive_integer(req.path.split('/').last)
          unless placement_id
            return render_json(res, status: 400, body: { error: 'placement ID が不正です。' })
          end

          payload = parse_json_body(req)
          data = payload && payload[:placement] || {}
          user_id = extract_positive_integer(data[:user_id] || req.query['user_id'])
          work_item_id = extract_positive_integer(data[:work_item_id] || req.query['work_item_id'])
          x = data[:x]
          y = data[:y]

          errors = []
          errors << 'user_id を指定してください。' unless user_id
          errors << 'work_item_id を指定してください。' unless work_item_id
          errors.concat(validate_coordinates(x, y))

          unless errors.empty?
            return render_json(res, status: 422, body: { error: '入力値が不正です。', details: errors })
          end

          unless work_item_owned_by_user?(user_id, work_item_id)
            return render_json(res, status: 404, body: { error: '指定されたワークアイテムが見つかりません。' })
          end

          affected = DB.client.execute(
            'UPDATE placements SET x = ?, y = ?, updated_at = NOW() WHERE id = ? AND user_id = ? AND work_item_id = ?',
            [x, y, placement_id, user_id, work_item_id],
          )

          if affected.positive?
            record = DB.client.select(
              'SELECT id, user_id, work_item_id, kind, master_id, x, y FROM placements WHERE id = ?',
              [placement_id],
            ).first
            render_json(res, status: 200, body: format_record(record))
          else
            render_json(res, status: 404, body: { error: '指定された配置が見つかりません。' })
          end
        rescue StandardError => e
          handle_server_error(res, e)
        end

        def do_DELETE(req, res)
          apply_cors_headers(res)

          placement_id = extract_positive_integer(req.path.split('/').last)
          unless placement_id
            return render_json(res, status: 400, body: { error: 'placement ID が不正です。' })
          end

          user_id = require_user_id!(req, res)
          return unless user_id

          work_item_id = extract_positive_integer(req.query['work_item_id'])
          unless work_item_id
            return render_json(res, status: 400, body: { error: 'work_item_id パラメータは必須です。' })
          end

          unless work_item_owned_by_user?(user_id, work_item_id)
            return render_json(res, status: 404, body: { error: '指定されたワークアイテムが見つかりません。' })
          end

          affected = DB.client.execute(
            'DELETE FROM placements WHERE id = ? AND user_id = ? AND work_item_id = ?',
            [placement_id, user_id, work_item_id],
          )

          if affected.positive?
            res.status = 204
          else
            render_json(res, status: 404, body: { error: '指定された配置が見つかりません。' })
          end
        rescue StandardError => e
          handle_server_error(res, e)
        end

        private

        def validate_payload(user_id, work_item_id, kind, master_id, x, y)
          errors = []
          errors << 'user_id を指定してください。' unless user_id
          errors << 'work_item_id を指定してください。' unless work_item_id
          unless ALLOWED_KINDS.include?(kind)
            errors << 'kind は motivation または preference を指定してください。'
          end
          errors << 'master_id を指定してください。' unless master_id
          errors.concat(validate_coordinates(x, y))
          errors
        end

        def validate_coordinates(x, y)
          messages = []
          messages << 'x は0から1の数値で指定してください。' unless valid_coordinate?(x)
          messages << 'y は0から1の数値で指定してください。' unless valid_coordinate?(y)
          messages
        end

        def valid_coordinate?(value)
          value.is_a?(Numeric) && value >= 0.0 && value <= 1.0
        end

        def format_record(row)
          {
            id: row[:id],
            user_id: row[:user_id],
            work_item_id: row[:work_item_id],
            kind: row[:kind],
            master_id: row[:master_id],
            x: row[:x].to_f,
            y: row[:y].to_f
          }
        end

        def work_item_owned_by_user?(user_id, work_item_id)
          DB.client.select(
            'SELECT id FROM work_items WHERE id = ? AND user_id = ? LIMIT 1',
            [work_item_id, user_id],
          ).any?
        end

        def ensure_master_available(user_id, work_item_id, kind, master_id)
          case kind
          when 'motivation'
            return '指定された動機が見つかりません。' unless motivation_master_owned_by_user?(user_id, master_id)

            return 'この動機はワークアイテムに紐づいていません。先にステップ3で選択してください。' unless linked_motivation?(user_id, work_item_id, master_id)
          when 'preference'
            return '指定された嗜好が見つかりません。' unless preference_master_owned_by_user?(user_id, master_id)

            return 'この嗜好はワークアイテムに紐づいていません。先にステップ3で選択してください。' unless linked_preference?(user_id, work_item_id, master_id)
          end

          nil
        end

        def motivation_master_owned_by_user?(user_id, master_id)
          DB.client.select(
            'SELECT id FROM motivation_masters WHERE id = ? AND user_id = ? LIMIT 1',
            [master_id, user_id],
          ).any?
        end

        def preference_master_owned_by_user?(user_id, master_id)
          DB.client.select(
            'SELECT id FROM preference_masters WHERE id = ? AND user_id = ? LIMIT 1',
            [master_id, user_id],
          ).any?
        end

        def linked_motivation?(user_id, work_item_id, master_id)
          DB.client.select(
            <<~SQL,
              SELECT 1
                FROM work_item_motivations
               WHERE user_id = ? AND work_item_id = ? AND motivation_master_id = ?
               LIMIT 1
            SQL
            [user_id, work_item_id, master_id],
          ).any?
        end

        def linked_preference?(user_id, work_item_id, master_id)
          DB.client.select(
            <<~SQL,
              SELECT 1
                FROM work_item_preferences
               WHERE user_id = ? AND work_item_id = ? AND preference_master_id = ?
               LIMIT 1
            SQL
            [user_id, work_item_id, master_id],
          ).any?
        end
      end
    end
  end
end
