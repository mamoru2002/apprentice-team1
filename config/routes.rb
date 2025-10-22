# frozen_string_literal: true

require_relative "../app/controllers/healthcheck_controller"
require_relative "../app/controllers/expense_logs_controller"
require_relative "../app/controllers/study_logs_controller"
require_relative "../app/controllers/summaries_controller"
require_relative "../app/controllers/calendar_controller"
require_relative "../app/controllers/categories_controller"
require_relative "../app/controllers/api/v1/motivation_masters_controller"
require_relative "../app/controllers/api/v1/preference_masters_controller"
require_relative "../app/controllers/api/v1/work_items_controller"
require_relative "../app/controllers/api/v1/work_item_motivations_controller"
require_relative "../app/controllers/api/v1/work_item_preferences_controller"
require_relative "../app/controllers/api/v1/placements_controller"

module Config
  ROUTES = {
    "/api/healthcheck" => Controllers::HealthcheckController,
    "/api/study_logs" => Controllers::StudyLogsController,
    "/api/expense_logs" => Controllers::ExpenseLogsController,
    "/api/expense_summary" => Controllers::SummariesController,
    "/api/study_summary" => Controllers::SummariesController,
    "/api/daily_details" => Controllers::SummariesController,
    "/api/calendar_data" => Controllers::CalendarController,
    "/api/expense_categories" => Controllers::CategoriesController,
    "/api/study_categories" => Controllers::CategoriesController,
    "/api/v1/motivation_masters" => Controllers::Api::V1::MotivationMastersController,
    "/api/v1/preference_masters" => Controllers::Api::V1::PreferenceMastersController,
    "/api/v1/work_items" => Controllers::Api::V1::WorkItemsController,
    "/api/v1/work_item_motivations" => Controllers::Api::V1::WorkItemMotivationsController,
    "/api/v1/work_item_preferences" => Controllers::Api::V1::WorkItemPreferencesController,
    "/api/v1/placements" => Controllers::Api::V1::PlacementsController
  }.freeze
end
