#frozen_string_literal: true

require_relative "application_controller"
require_relative "../db/db"
require "json"

module Controllers
  class CategoriesController < ApplicationController
    def do_GET(req, res)
      table_name = get_table_name_from_path(req.path)
      categories = DB.client.select("SELECT id, name FROM #{table_name} ORDER BY id ASC")
      render_json(res, status: 200, body: categories)
    rescue StandardError => e
      handle_server_error(res, e)
    end

    def do_POST(req, res)
      table_name = get_table_name_from_path(req.path)
      payload = parse_json_body(req)
      name = payload[:name].to_s.strip

      if name.empty?
        return render_json(res, status: 400, body: { error: "カテゴリ名は空にできません。" })
      end

      new_id = DB.client.execute("INSERT INTO #{table_name} (name) VALUES (?)", [name])
      new_category = DB.client.select("SELECT id, name FROM #{table_name} WHERE id = ?", [new_id]).first
      
      render_json(res, status: 201, body: new_category)
    rescue Mysql2::Error => e
      if e.error_number == 1062
        render_json(res, status: 409, body: { error: "カテゴリ「#{name}」は既に存在します。" })
      else
        handle_server_error(res, e)
      end
    rescue StandardError => e
      handle_server_error(res, e)
    end

    def do_DELETE(req, res)
      table_name = get_table_name_from_path(req.path)
      name_to_delete = URI.decode_www_form_component(req.path.split('/').last)
      affected_rows = DB.client.execute("DELETE FROM #{table_name} WHERE name = ?", [name_to_delete])
      if affected_rows.positive?
        res.status = 204
      else
        render_json(res, status: 404, body: { error: "カテゴリが見つかりません。" })
      end
    rescue StandardError => e
      handle_server_error(res, e)
    end

    private

    def get_table_name_from_path(path)
      if path.start_with?("/api/expense_categories")
        "expense_categories"
      elsif path.start_with?("/api/study_categories")
        "study_categories"
      else
        raise "Invalid path for CategoriesController"
      end
    end
  end
end