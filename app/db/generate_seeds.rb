# frozen_string_literal: true

require "date"

STUDY_CATEGORIES = %w[Ruby CSS JavaScript HTML Paiza].freeze
EXPENSE_CATEGORIES = %w[食費 衣服 日用品 美容 雑貨].freeze
OUTPUT_FILE = File.expand_path("02_seeds.sql", __dir__)

# --- データ生成ロジック ---
today = Date.today
start_date = today << 3
end_date = today >> 3

study_logs_values = []
expense_logs_values = []

(start_date..end_date).each do |date|
  next if rand > 0.8

  # 学習記録を1〜3件作成
  rand(1..3).times do
    title = STUDY_CATEGORIES.sample
    duration = rand(900..7200) # 15分〜2時間
    # SQLインジェクション対策でタイトルをエスケープ
    escaped_title = title.gsub("'", "''")
    study_logs_values << "('#{escaped_title}', #{duration}, '#{date}')"
  end

  # 支出記録を0〜4件作成
  rand(0..4).times do
    title = EXPENSE_CATEGORIES.sample
    amount = rand(300..5000)
    escaped_title = title.gsub("'", "''")
    expense_logs_values << "(#{amount}, '#{escaped_title}', '#{date}')"
  end
end

# --- SQLファイルへの書き込み ---
sql_content = <<~SQL

  SET NAMES utf8mb4;

  -- 既存のデータをクリア
  DELETE FROM study_logs;
  DELETE FROM expense_logs;

  -- 新しいテストデータを挿入
  INSERT INTO study_logs (title, duration, date) VALUES
  #{study_logs_values.join(",\n")};

  INSERT INTO expense_logs (amount, title, date) VALUES
  #{expense_logs_values.join(",\n")};
SQL

File.write(OUTPUT_FILE, sql_content)

puts "✅ テストデータ用のSQLファイル `#{OUTPUT_FILE}` を生成しました。"
