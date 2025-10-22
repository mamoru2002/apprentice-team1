# frozen_string_literal: true

require_relative '../../application_controller'
require_relative '../../../db/db'

module Controllers
  module Api
    module V1
      class WorkItemsController < ApplicationController
        DEFAULT_COLUMNS = %w[id user_id name energy_percentage reframe].freeze
        BEFORE_SKETCH_CANDIDATES = %w[
          before_sketch_image_url
          before_sketch_data_url
          before_sketch_url
          sketch_image_url
        ].freeze

        def do_GET(req, res)
          apply_cors_headers(res)

          if req.path.match?(%r{^/api/v1/work_items/\d+})
            render_single(req, res)
          else
            render_collection(req, res)
          end
        rescue StandardError => e
          handle_server_error(res, e)
        end

        private

        def render_collection(req, res)
          user_id = require_user_id!(req, res)
          return unless user_id

          records = DB.client.select(
            "SELECT #{select_clause} FROM work_items WHERE user_id = ? ORDER BY created_at DESC",
            [user_id],
          )

          render_json(res, status: 200, body: records.map { |row| format_work_item(row) })
        end

        def render_single(req, res)
          user_id = require_user_id!(req, res)
          return unless user_id

          work_item_id = extract_positive_integer(req.path.split('/').last)
          unless work_item_id
            return render_json(res, status: 400, body: { error: 'work_item_id が不正です。' })
          end

          record = DB.client.select(
            "SELECT #{select_clause} FROM work_items WHERE id = ? AND user_id = ? LIMIT 1",
            [work_item_id, user_id],
          ).first

          if record
            render_json(res, status: 200, body: format_work_item(record))
          else
            render_json(res, status: 404, body: { error: '指定されたワークアイテムが見つかりません。' })
          end
        end

        def select_clause
          (@select_clause ||= begin
            cols = DEFAULT_COLUMNS.dup
            sketch_column = detect_sketch_column
            cols << sketch_column if sketch_column
            cols.join(', ')
          end)
        end

        def detect_sketch_column
          return @sketch_column if defined?(@sketch_column)

          client = DB.client
          @sketch_column = BEFORE_SKETCH_CANDIDATES.find do |column|
            begin
              client.select('SHOW COLUMNS FROM work_items LIKE ?', [column]).any?
            rescue Mysql2::Error
              false
            end
          end

          @sketch_column
        end

        def format_work_item(row)
          data = {
            id: row[:id],
            user_id: row[:user_id],
            name: row[:name],
            energy_percentage: row[:energy_percentage]&.to_f,
            reframe: row[:reframe]
          }

          if (column = detect_sketch_column)
            key = column.to_sym
            value = row[key]
            data[:before_sketch_url] = value if value.is_a?(String) && !value.strip.empty?
          end

          data
        end
      end
    end
  end
end
