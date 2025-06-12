module Config
  Routes = {
    "/healthcheck"  => Controllers::HealthcheckController,
    "/study_logs"   => Controllers::StudyLogsController,
    "/expense_logs" => Controllers::ExpenseLogsController
  }.freeze
end