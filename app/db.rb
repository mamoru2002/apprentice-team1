require 'mysql2'

def db_client
  Mysql2::Client.new(
    host: 'db',
    username: 'user',
    password: 'password',
    database: 'study_app'
  )
end