import type { ModuleConfig } from "@stats-viz/shared/wals/types";

export const moduleConfig: ModuleConfig = {
  "id": "mes-linear-regression",
  "repoName": "mes-linear-regression-visualization",
  "title": "MES Linear Regression",
  "subtitle": "WALS/MES city skyscraper regression template rebuilt with static data.",
  "category": "WALS MES",
  "sourcePath": "apps/mes-linear-regression/src",
  "data": {
    "source": "表8-13 中国城市摩天大楼数量(教材数据,具体教材版本待补充)",
    "cities": [
      {
        "city": "海口",
        "GDP": 590.55,
        "completed": 1,
        "planning": 4
      },
      {
        "city": "兰州",
        "GDP": 1100.39,
        "completed": 0,
        "planning": 5
      },
      {
        "city": "贵阳",
        "GDP": 1383.07,
        "completed": 2,
        "planning": 16
      },
      {
        "city": "太原",
        "GDP": 1778.05,
        "completed": 0,
        "planning": 1
      },
      {
        "city": "南昌",
        "GDP": 2207.11,
        "completed": 3,
        "planning": 5
      },
      {
        "city": "昆明",
        "GDP": 2509.58,
        "completed": 0,
        "planning": 6
      },
      {
        "city": "合肥",
        "GDP": 2702.5,
        "completed": 1,
        "planning": 5
      },
      {
        "city": "福州",
        "GDP": 3065,
        "completed": 2,
        "planning": 6
      },
      {
        "city": "西安",
        "GDP": 3241.49,
        "completed": 2,
        "planning": 2
      },
      {
        "city": "长春",
        "GDP": 3329,
        "completed": 1,
        "planning": 3
      },
      {
        "city": "哈尔滨",
        "GDP": 3665.9,
        "completed": 1,
        "planning": 1
      },
      {
        "city": "济南",
        "GDP": 3910.8,
        "completed": 0,
        "planning": 2
      },
      {
        "city": "郑州",
        "GDP": 4002.9,
        "completed": 2,
        "planning": 3
      },
      {
        "city": "长沙",
        "GDP": 4500,
        "completed": 4,
        "planning": 11
      },
      {
        "city": "沈阳",
        "GDP": 5015,
        "completed": 7,
        "planning": 22
      },
      {
        "city": "南京",
        "GDP": 5086,
        "completed": 14,
        "planning": 21
      },
      {
        "city": "成都",
        "GDP": 5500,
        "completed": 2,
        "planning": 9
      },
      {
        "city": "武汉",
        "GDP": 5515.76,
        "completed": 7,
        "planning": 26
      },
      {
        "city": "杭州",
        "GDP": 5945.82,
        "completed": 5,
        "planning": 6
      },
      {
        "city": "重庆",
        "GDP": 7894.24,
        "completed": 23,
        "planning": 13
      },
      {
        "city": "天津",
        "GDP": 9108.83,
        "completed": 14,
        "planning": 26
      },
      {
        "city": "苏州",
        "GDP": 9168,
        "completed": 5,
        "planning": 10
      },
      {
        "city": "深圳",
        "GDP": 9510.91,
        "completed": 33,
        "planning": 46
      },
      {
        "city": "广州",
        "GDP": 10604.48,
        "completed": 23,
        "planning": 36
      },
      {
        "city": "北京",
        "GDP": 13777.9,
        "completed": 6,
        "planning": 11
      },
      {
        "city": "上海",
        "GDP": 16872.42,
        "completed": 44,
        "planning": 15
      },
      {
        "city": "香港",
        "GDP": 15790,
        "completed": 54,
        "planning": 0
      }
    ]
  },
  "examples": [
    {
      "id": "city-regression",
      "title": "Regression Visualization",
      "kind": "linear-regression",
      "sourcePath": "apps/mes-linear-regression/src/module-config.ts",
      "description": "Model planned skyscrapers from either completed buildings or GDP, using the WALS city dataset.",
      "teachingPoints": [
        "Changing the predictor changes slope, residuals, and R-squared.",
        "Large cities can exert strong leverage on the fitted line."
      ],
      "controls": [
        {
          "id": "feature",
          "label": "Feature",
          "type": "select",
          "defaultValue": "completed",
          "options": [
            {
              "value": "completed",
              "label": "Completed buildings"
            },
            {
              "value": "GDP",
              "label": "GDP"
            }
          ]
        },
        {
          "id": "excludeHighLeverage",
          "label": "Exclude Shanghai and Hong Kong",
          "type": "select",
          "defaultValue": "no",
          "options": [
            {
              "value": "no",
              "label": "Keep all cities"
            },
            {
              "value": "yes",
              "label": "Exclude high leverage cities"
            }
          ]
        }
      ]
    }
  ]
};
