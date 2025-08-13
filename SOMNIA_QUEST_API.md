# Somnia Quest API Integration - Dreava Launchpad

Документация API для интеграции платформы Dreava Launchpad с Somnia Quest системой.

## 🚀 Обзор

Мы интегрировали API endpoints для отслеживания действий пользователей на платформе Dreava Launchpad, включая:

- ✅ Создание коллекций NFT
- ✅ Запуск коллекций в продажу  
- ✅ Минт NFT
- ✅ Загрузка whitelist

## 📡 API Endpoints

### 1. Основной Endpoint для Верификации (Required by Somnia)

#### Path Style
```
GET /api/quest/verify/{walletAddress}
```

#### Query Style
```
GET /api/quest/verify?wallet={walletAddress}
```

**Пример запроса:**
```bash
curl "https://dreava.art/api/quest/verify/0x2bbb78236329eb7fe5b7ec9c239f44411d9a7b41"
```

**Ответ:**
```json
{
  "wallet": "0x2bbb78236329eb7fe5b7ec9c239f44411d9a7b41",
  "score": 770,
  "completed": true
}
```

**Поля ответа:**
- `wallet`: Адрес кошелька пользователя (всегда в lowercase)
- `score`: Общий счет пользователя за все действия
- `completed`: `true` если пользователь запустил коллекцию, `false` если нет

### 2. API с Фильтрацией по Дате (Настраиваемый ключ)

```
GET /api/quest/collections-by-date?startDate={date}&endDate={date}
```

**Примеры запросов:**
```bash
# Конкретный диапазон (15-18 августа)
curl "https://dreava.art/api/quest/collections-by-date?startDate=2024-08-15&endDate=2024-08-18"

# С точным временем
curl "https://dreava.art/api/quest/collections-by-date?startDate=2024-08-15T10:00:00&endDate=2024-08-18T23:59:59"

# Только начальная дата (до текущего момента)
curl "https://dreava.art/api/quest/collections-by-date?startDate=2024-08-15"
```

**Ответ:**
```json
{
  "dateRange": {
    "startDate": "2024-01-01T00:00:00.000Z",
    "endDate": "2024-01-31T23:59:59.999Z"
  },
  "summary": {
    "totalCollectionsLaunched": 15,
    "uniqueUsersWhoLaunched": 12
  },
  "collections": [
    {
      "wallet": "0x2bbb78236329eb7fe5b7ec9c239f44411d9a7b41",
      "collectionAddress": "0x123...",
      "collectionName": "My NFT Collection",
      "timestamp": "2024-01-15T10:30:00.000Z",
      "totalUserScore": 770
    }
  ]
}
```

**Параметры:**
- `startDate`: Начальная дата (ISO format: 2024-08-15 или 2024-08-15T10:00:00)
- `endDate`: Конечная дата (опционально, по умолчанию - текущая дата)

**Поддерживаемые форматы дат:**
- `2024-08-15` - дата без времени (автоматически 00:00:00 для startDate, 23:59:59 для endDate)
- `2024-08-15T10:30:00` - дата с временем
- `2024-08-15T10:30:00Z` - дата с временем UTC

### 3. Статистика Quest

```
GET /api/quest/stats
```

### 4. Статистика Коллекций и Скорость Минтинга

```
GET /api/quest/collection-stats?startDate={date}&endDate={date}
GET /api/quest/collection-stats?address={collectionAddress}
GET /api/quest/collection-stats?contentType={type}&animated={boolean}&coverType={type}
```

**Примеры запросов:**
```bash
# Все коллекции с фильтрацией по дате
curl "https://dreava.art/api/quest/collection-stats?startDate=2024-08-15&endDate=2024-08-18"

# Только GIF коллекции
curl "https://dreava.art/api/quest/collection-stats?contentType=gif"

# Только анимированные коллекции
curl "https://dreava.art/api/quest/collection-stats?animated=true"

# Коллекции с GIF обложкой
curl "https://dreava.art/api/quest/collection-stats?coverType=gif"

# Комбинированный фильтр: анимированные коллекции за август
curl "https://dreava.art/api/quest/collection-stats?startDate=2024-08-15&endDate=2024-08-18&animated=true"

# Статистика конкретной коллекции
curl "https://dreava.art/api/quest/collection-stats?address=0x123..."
```

**Доступные типы контента:**
- `gif` - GIF анимации
- `video` - Видео файлы (mp4, mov, webm и т.д.)
- `static` или `static_image` - Статичные изображения
- `animated` - Любой анимированный контент (GIF + видео)

**Ответ (все коллекции):**
```json
{
  "totalCollections": 25,
  "soldOutCollections": 8,
  "activeCollections": 17,
  "contentTypeStats": {
    "gif": 12,
    "video": 3,
    "static_image": 8,
    "animated": 15,
    "unknown": 2
  },
  "filters": {
    "dateRange": {
      "startDate": "2024-08-15",
      "endDate": "2024-08-18"
    },
    "contentType": "gif",
    "animated": true,
    "coverType": null
  },
  "collections": [
    {
      "address": "0x123...",
      "name": "Fast GIF Collection",
      "status": "sold_out",
      "launchedAt": "2024-08-15T10:00:00Z",
      "completedAt": "2024-08-15T14:30:00Z",
      "maxSupply": 1000,
      "totalMinted": 1000,
      "uniqueMintersCount": 456,
      "mintingSpeedHours": "4.50",
      "mintingSpeedDays": "0.19",
      "createdBy": "0xabc...",
      "contentAnalysis": {
        "coverType": "gif",
        "dominantContentType": "gif",
        "isAnimatedCollection": true,
        "nftContentTypes": {
          "gif": 850,
          "static_image": 150
        }
      }
    }
  ]
}
```

### 5. Статистика по Типам Контента

```
GET /api/quest/content-type-stats?startDate={date}&endDate={date}
```

**Пример запроса:**
```bash
curl "https://dreava.art/api/quest/content-type-stats?startDate=2024-08-15&endDate=2024-08-18"
```

**Ответ:**
```json
{
  "totalCollections": 25,
  "dateRange": {
    "startDate": "2024-08-15",
    "endDate": "2024-08-18"
  },
  "contentTypeBreakdown": {
    "gif": {
      "count": 12,
      "soldOutCount": 8,
      "averageMintingSpeedHours": "6.25",
      "collections": [...]
    },
    "video": {
      "count": 3,
      "soldOutCount": 1,
      "averageMintingSpeedHours": "12.50",
      "collections": [...]
    },
    "static_image": {
      "count": 8,
      "soldOutCount": 2,
      "averageMintingSpeedHours": "24.00",
      "collections": [...]
    }
  },
  "summary": {
    "gif": 12,
    "video": 3,
    "static_image": 8,
    "animated": 15,
    "unknown": 2
  }
}
```

### 6. Пользователи, Минтившие Коллекцию

```
GET /api/quest/collection-minters/{collectionAddress}?startDate={date}&endDate={date}
```

**Пример запроса:**
```bash
curl "https://dreava.art/api/quest/collection-minters/0x123...?startDate=2024-08-15&endDate=2024-08-18"
```

**Ответ:**
```json
{
  "address": "0x123...",
  "collectionName": "My Collection",
  "totalUniqueMintersTracked": 456,
  "collectionTotalMinted": 1000,
  "dateRange": {
    "startDate": "2024-08-15",
    "endDate": "2024-08-18"
  },
  "minters": [
    {
      "wallet": "0xabc...",
      "totalMinted": 15,
      "mintActions": 8,
      "firstMint": "2024-08-15T10:05:00Z",
      "lastMint": "2024-08-15T12:30:00Z",
      "userTotalScore": 250
    }
  ]
}
```

**Ответ:**
```json
{
  "totalUsers": 1250,
  "completedUsers": 156,
  "completionRate": "12.48%",
  "totalActions": 3890,
  "totalScore": 58350,
  "averageScore": "46.68",
  "actionBreakdown": {
    "collection_launched": 156,
    "collection_created": 320,
    "nft_minted": 2890,
    "whitelist_uploaded": 524
  },
  "lastUpdated": "2024-01-20T15:30:00.000Z"
}
```

## 🎯 Отслеживаемые Действия

### 1. Collection Launched (Основная задача квеста)
- **Тип:** `collection_launched`
- **Очки:** 100
- **Триггер:** Когда пользователь запускает коллекцию в продажу
- **Критерий completion:** `completed: true`

### 2. Collection Created  
- **Тип:** `collection_created`
- **Очки:** 50
- **Триггер:** Создание новой коллекции

### 3. NFT Minted
- **Тип:** `nft_minted` 
- **Очки:** 10
- **Триггер:** Минт NFT из любой коллекции

### 4. Whitelist Uploaded
- **Тип:** `whitelist_uploaded`
- **Очки:** 25
- **Триггер:** Загрузка whitelist для коллекции

## 🔒 Технические Детали

### Формат Адресов
- Все адреса кошельков сохраняются и возвращаются в **lowercase**
- API не чувствителен к регистру входящих адресов

### HTTP Status Codes
- `200 OK`: Успешный ответ (всегда, даже если `completed: false`)
- `400 Bad Request`: Неверные параметры запроса
- `500 Internal Server Error`: Внутренняя ошибка сервера

### Производительность
- Время ответа: < 100ms для верификации
- Время ответа: < 500ms для запросов по дате
- Данные кэшируются в памяти для быстрого доступа

## 🧪 Тестирование

### Примеры тестовых запросов:

```bash
# Проверка пользователя
curl "https://dreava.art/api/quest/verify/0x742d35Cc6634C0532925a3b8D4C9db9b4c4134c3"

# Проверка с query параметром  
curl "https://dreava.art/api/quest/verify?wallet=0x742d35Cc6634C0532925a3b8D4C9db9b4c4134c3"

# Получение данных за определенный период (15-18 августа)
curl "https://dreava.art/api/quest/collections-by-date?startDate=2024-08-15&endDate=2024-08-18"

# Статистика коллекций с фильтрацией по дате
curl "https://dreava.art/api/quest/collection-stats?startDate=2024-08-15&endDate=2024-08-18"

# Только GIF коллекции
curl "https://dreava.art/api/quest/collection-stats?contentType=gif"

# Только анимированные коллекции
curl "https://dreava.art/api/quest/collection-stats?animated=true"

# Статистика по типам контента
curl "https://dreava.art/api/quest/content-type-stats?startDate=2024-08-15"

# Статистика конкретной коллекции
curl "https://dreava.art/api/quest/collection-stats?address=0x123..."

# Пользователи, минтившие коллекцию
curl "https://dreava.art/api/quest/collection-minters/0x123...?startDate=2024-08-15"

# Общая статистика
curl "https://dreava.art/api/quest/stats"
```

### Ответы для тестирования:

**Пользователь без действий:**
```json
{
  "wallet": "0x123...",
  "score": 0,
  "completed": false
}
```

**Пользователь с завершенной задачей:**
```json
{
  "wallet": "0x456...",
  "score": 185,
  "completed": true
}
```

## 📊 Мониторинг

### Логирование
- Все запросы логируются с временными метками
- Ошибки логируются с деталями для отладки

### Метрики
- Количество запросов верификации
- Среднее время ответа
- Процент успешных запросов

## 🚨 Важные Заметки

1. **Автоматическое отслеживание**: Все действия записываются автоматически при выполнении на платформе
2. **Надежность**: API использует in-memory хранилище с автоматическим резервным копированием
3. **Масштабируемость**: Система готова к высокой нагрузке во время активных квестов
4. **Совместимость**: API полностью соответствует требованиям Somnia Quest платформы

## 📞 Контакты

При возникновении вопросов или проблем с API:
- Техническая поддержка: [ваш контакт]
- Документация: https://dreava.art/api/quest/stats
- Статус сервера: https://dreava.art/status

---

**Последнее обновление:** 2024-01-20  
**Версия API:** 1.0.0 