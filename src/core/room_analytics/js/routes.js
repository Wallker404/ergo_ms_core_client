export default {
  "AnalyticsModule": {
    "path": "/room-analytics",
    "redirect": { "name": "AnalyzePage" },
    "meta": {
      "title": "Модуль анализа помещения",
      "requiresAuth": true
    }
  },
  "AnalyzePage": {
    "path": "/room-analytics/analyze",
    "component": "@/core/room_analytics/AnalyticsModule/AnalizePage.vue",
    "meta": {
      "title": "Анализ помещения",
      "requiresAuth": true
    }
  },
  "LoadPlan": {
    "path": "/room-analytics/load-plan",
    "component": "@/core/room_analytics/AnalyticsModule/LoadPlan.vue",
    "meta": {
      "title": "Загрузить план",
      "requiresAuth": true
    }
  },
  "SurveyStart": {
    "path": "/room-analytics/survey-start",
    "component": "@/core/room_analytics/AnalyticsModule/SurveyStart.vue",
    "meta": {
      "title": "Пройти анкетирование",
      "requiresAuth": true
    }
  },
  "DataUpload": {
    "path": "/room-analytics/data-upload",
    "component": "@/core/room_analytics/AnalyticsInsruments/DataUpload.vue",
    "meta": {
      "title": "Загрузка данных",
      "requiresAuth": true
    }
  },
  "ModelEditor": {
    "path": "/room-analytics/model-editor",
    "component": "@/core/room_analytics/AnalyticsInsruments/ModelEditor.vue",
    "meta": {
      "title": "Редактирование мат. модели",
      "requiresAuth": true
    }
  },
  "RegressionAnalysis": {
    "path": "/room-analytics/regression-analysis",
    "component": "@/core/room_analytics/AnalyticsInsruments/RegressionAnalysis.vue",
    "meta": {
      "title": "Регрессионный анализ",
      "requiresAuth": true
    }
  },
  "ClassificationAnalysis": {
    "path": "/room-analytics/classification-analysis",
    "component": "@/core/room_analytics/AnalyticsInsruments/ClassificationAnalysis.vue",
    "meta": {
      "title": "Классификация",
      "requiresAuth": true
    }
  },
  "ClusteringAnalysis": {
    "path": "/room-analytics/clustering-analysis",
    "component": "@/core/room_analytics/AnalyticsInsruments/ClusteringAnalysis.vue",
    "meta": {
      "title": "Кластеризационный анализ",
      "requiresAuth": true
    }
  },
  "BayesianAnalysis": {
    "path": "/room-analytics/bayesian-analysis",
    "component": "@/core/room_analytics/AnalyticsInsruments/BayesianAnalysis.vue",
    "meta": {
      "title": "Байсовый анализ",
      "requiresAuth": true
    }
  }
}
