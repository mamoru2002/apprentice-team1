# frozen_string_literal: true

require_relative '../../application_controller'
require_relative '../../../db/db'

module Controllers
  module Api
    module V1
      class WorkItemMotivationsController < ApplicationController
        def do_GET(req, res)
          apply_cors_headers(res)

          user_id = require_user_id!(req, res)
          return unless user_id

          work_item_id = extract_positive_integer(req.query['work_item_id'])

          sql = <<~SQL
            SELECT wim.id,
                   wim.work_item_id,
                   wim.motivation_master_id,
                   mm.name
              FROM work_item_motivations wim
              JOIN motivation_masters mm ON mm.id = wim.motivation_master_id
             WHERE wim.user_id = ?
          SQL

          params = [user_id]
          if work_item_id
            sql += '   AND wim.work_item_id = ?'
            params << work_item_id
          end

          sql += ' ORDER BY mm.name ASC'

          records = DB.client.select(sql, params)

          render_json(res, status: 200, body: records.map { |row| format_record(row, user_id) })
        rescue StandardError => e
          handle_server_error(res, e)
        end

        def do_POST(req, res)
          apply_cors_headers(res)

          payload = parse_json_body(req)
          data = payload && payload[:work_item_motivation]
          user_id = extract_positive_integer(data && data[:user_id])
          work_item_id = extract_positive_integer(data && data[:work_item_id])
          master_id = extract_positive_integer(data && data[:motivation_master_id])

          errors = []
          errors << 'user_id を指定してください。' unless user_id
          errors << 'work_item_id を指定してください。' unless work_item_id
          errors << 'motivation_master_id を指定してください。' unless master_id

          unless errors.empty?
            return render_json(res, status: 422, body: { error: '入力値が不正です。', details: errors })
          end

          unless work_item_owned_by_user?(user_id, work_item_id)
            return render_json(res, status: 404, body: { error: '指定されたワークアイテムが見つかりません。' })
          end

          unless motivation_master_owned_by_user?(user_id, master_id)
            return render_json(res, status: 404, body: { error: '指定された動機が見つかりません。' })
          end

          new_id = DB.client.execute(
            "INSERT INTO work_item_motivations (user_id, work_item_id, motivation_master_id, created_at) VALUES (?, ?, ?, NOW())",
            [user_id, work_item_id, master_id],
          )

          record = DB.client.select(
            "SELECT wim.id, wim.work_item_id, wim.motivation_master_id, mm.name
           FROM work_item_motivations wim
           JOIN motivation_masters mm ON mm.id = wim.motivation_master_id
          WHERE wim.id = ?",
            [new_id],
          ).first

          render_json(res, status: 201, body: format_record(record, user_id))
        rescue Mysql2::Error => e
          case e.error_number
          when 1062
            render_json(res, status: 409, body: { error: 'この動機は既に選択されています。' })
          when 1452
            render_json(res, status: 404, body: { error: '関連するレコードが見つかりません。' })
          else
            handle_server_error(res, e)
          end
        rescue StandardError => e
          handle_server_error(res, e)
        end

        def do_DELETE(req, res)
          apply_cors_headers(res)

          user_id = require_user_id!(req, res)
          return unless user_id

          record_id = extract_positive_integer(req.path.split('/').last)
          unless record_id
            return render_json(res, status: 400, body: { error: '削除対象IDが不正です。' })
          end

          affected = DB.client.execute(
            'DELETE FROM work_item_motivations WHERE id = ? AND user_id = ?',
            [record_id, user_id],
          )

          if affected.positive?
            res.status = 204
          else
            render_json(res, status: 404, body: { error: '指定された紐づけが見つかりません。' })
          end
        rescue StandardError => e
          handle_server_error(res, e)
        end

        private

        def work_item_owned_by_user?(user_id, work_item_id)
          DB.client.select(
            'SELECT id FROM work_items WHERE id = ? AND user_id = ? LIMIT 1',
            [work_item_id, user_id],
          ).any?
        end

        def motivation_master_owned_by_user?(user_id, master_id)
          DB.client.select(
            'SELECT id FROM motivation_masters WHERE id = ? AND user_id = ? LIMIT 1',
            [master_id, user_id],
          ).any?
        end

        def format_record(row, user_id)
          {
            id: row[:id],
            user_id: user_id,
            work_item_id: row[:work_item_id],
            motivation_master_id: row[:motivation_master_id],
            motivation_name: row[:name]
          }
        end
      end
    end
  end
end
