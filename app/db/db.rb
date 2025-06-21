# frozen_string_literal: true

require "mysql2"

module DB
  class Client
    def initialize
      @options = {
        host: ENV.fetch("DB_HOST", "db"),
        username: ENV.fetch("DB_USER", "user"),
        password: ENV.fetch("DB_PASSWORD", "password"),
        database: ENV.fetch("DB_NAME", "app"),
        encoding: "utf8mb4",
        symbolize_keys: true
      }
    end

    # SELECT文など、データを「取得」するためのメソッド
    def select(sql, params = [])
      client = connect
      statement = client.prepare(sql)
      statement.execute(*params)&.to_a
    rescue Mysql2::Error => e
      handle_error(e, sql, params)
      raise
    ensure
      client&.close
    end

    # INSERT, UPDATE, DELETEなど、データを「変更」するためのメソッド
    def execute(sql, params = [])
      client = connect
      statement = client.prepare(sql)
      statement.execute(*params)
      # 変更された行数を返す
      client.affected_rows
    rescue Mysql2::Error => e
      handle_error(e, sql, params)
      raise
    ensure
      client&.close
    end

    private

    def connect
      Mysql2::Client.new(@options)
    end

    def handle_error(error, sql, params)
      warn "--- MySQL Error ---"
      warn "Message: #{error.message}"
      warn "SQL: #{sql}"
      warn "Params: #{params.inspect}"
      warn "---------------------"
    end
  end

  def self.client
    Client.new
  end
end
