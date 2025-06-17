# frozen_string_literal: true

require 'mysql2'
require 'singleton'

module DB
  class Client
    include Singleton
    def initialize
      @client = Mysql2::Client.new(
        host: ENV.fetch('DB_HOST', 'db'),
        username: ENV.fetch('DB_USER', 'user'),
        password: ENV.fetch('DB_PASSWORD', 'password'),
        database: ENV.fetch('DB_NAME', 'app'),
        encoding: 'utf8mb4',
        symbolize_keys: true
      )
    end

    def query(sql, params = [])
      stmt = @client.prepare(sql)
      stmt.execute(*params)
    end
  end
end
