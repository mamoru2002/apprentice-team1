# frozen_string_literal: true

require "mysql2"

module DB

  class Client
    def initialize
      # 接続情報を@optionsに保存
      @options = {
        host: ENV.fetch("DB_HOST", "db"),
        username: ENV.fetch("DB_USER", "user"),
        password: ENV.fetch("DB_PASSWORD", "password"),
        database: ENV.fetch("DB_NAME", "app"),
        encoding: "utf8mb4",
        symbolize_keys: true
      }
      @client = nil # この時点では接続しない
    end

    def query(sql, params = [])
      # メソッドが呼ばれるたびに接続し、使い終わったら切断する
      connect
      statement = @client.prepare(sql)
      result = statement.execute(*params)
      # 結果を配列として即座にメモリに読み込むことで、
      # 「Commands out of sync」エラーを防ぐ
      result&.to_a
    rescue Mysql2::Error => e
      warn "--- MySQL Error ---"
      warn "Message: #{e.message}"
      warn "SQL: #{sql}"
      warn "Params: #{params.inspect}"
      warn "---------------------"
      raise # エラーを再度発生させ、呼び出し元で処理する
    ensure
      # 処理が成功してもエラーが発生しても、必ず接続を閉じる
      @client&.close
    end

    private

    def connect
      @client = Mysql2::Client.new(@options)
    end
  end

  # アプリケーション全体でこのメソッドを使ってDBクライアントを取得する
  def self.client
    Client.new
  end
end