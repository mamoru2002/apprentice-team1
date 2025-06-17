require_relative '../app/controllers/healthcheck_controller'
require_relative '../app/controllers/expense_logs_controller'
require_relative '../app/controllers/study_logs_controller'
require_relative '../app/controllers/summaries_controller'

module Config
  Routes = {
    "/healthcheck"      => Controllers::HealthcheckController,
    "/study_logs"       => Controllers::StudyLogsController,
    "/expense_logs"     => Controllers::ExpenseLogsController,
    "/expense_summary"  => Controllers::SummariesController,
    "/study_summary"    => Controllers::SummariesController
  }.freeze
end