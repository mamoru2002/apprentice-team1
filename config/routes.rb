# frozen_string_literal: true

require_relative '../app/controllers/healthcheck_controller'
require_relative '../app/controllers/expense_logs_controller'
require_relative '../app/controllers/study_logs_controller'
require_relative '../app/controllers/summaries_controller'
require_relative '../app/controllers/calendar_controller'


module Config
  ROUTES = {
    '/api/healthcheck' => Controllers::HealthcheckController,
    '/api/study_logs' => Controllers::StudyLogsController,
    '/api/expense_logs' => Controllers::ExpenseLogsController,
    '/api/expense_summary' => Controllers::SummariesController,
    '/api/study_summary' => Controllers::SummariesController,
    '/api/daily_details'   => Controllers::SummariesController,
    '/api/calendar_data' => Controllers::CalendarController
  }.freeze
end
