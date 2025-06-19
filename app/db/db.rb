# frozen_string_literal: true

require "mysql2"
require "singleton"

module DB
  class Client
    include Singleton
    def initialize
      @client = Mysql2::Client.new(
        host: ENV.fetch("DB_HOST", "db"),
        username: ENV.fetch("DB_USER", "user"),
        password: ENV.fetch("DB_PASSWORD", "password"),
        database: ENV.fetch("DB_NAME", "app"),
        encoding: "utf8mb4",
        symbolize_keys: true,
      )
    end

    def query(sql, params = [])
      statement = @client.prepare(sql)
      result = statement.execute(*params)

      # INSERT や UPDATE など、結果セットを返さないクエリの場合、
      # result は nil になるため、先にチェックして空の配列を返す。
      return [] if result.nil?

      # 結果セットを Ruby の配列に変換する。
      # これにより、すべての結果がRuby側に読み込まれ、DB接続が解放される。
      # これが「Commands out of sync」エラーへの決定的な解決策。
      result.to_a
    rescue Mysql2::Error => e
      # (エラーログ出力部分は変更なし)
      warn "--- MySQL Error ---"
      warn "Message: #{e.message}"
      warn "SQL: #{sql}"
      warn "Params: #{params.inspect}"
      warn "---------------------"
      raise
    end
  end
end
