# Maintenance — Breezeway BigQuery Schema

Project:    `miami-vr-data`
Dataset:    `etl_stage`
Generated:  2026-05-20T20:56:33.118Z
Tables:     15

## Table inventory

| # | table | rows | columns |
|---|---|---:|---:|
| 1 | `parsed_breezeway_companies` | 1 | 2 |
| 2 | `parsed_breezeway_people` | 52 | 32 |
| 3 | `parsed_breezeway_people_groups` | 237 | 4 |
| 4 | `parsed_breezeway_people_type_departments` | 101 | 2 |
| 5 | `parsed_breezeway_properties` | 397 | 23 |
| 6 | `parsed_breezeway_properties_groups` | 471 | 4 |
| 7 | `parsed_breezeway_reservations` | 15578 | 25 |
| 8 | `parsed_breezeway_reservations_guests` | 11194 | 9 |
| 9 | `parsed_breezeway_reservations_tags` | 545 | 3 |
| 10 | `parsed_breezeway_supplies` | 216 | 21 |
| 11 | `parsed_breezeway_task_comments` | 644 | 4 |
| 12 | `parsed_breezeway_task_requirements` | 24999 | 10 |
| 13 | `parsed_breezeway_task_tags` | 13965 | 3 |
| 14 | `parsed_breezeway_tasks` | 69022 | 33 |
| 15 | `parsed_breezeway_tasks_assignments` | 30588 | 6 |

## parsed_breezeway_companies

Rows: 1

### Columns

| # | name | type | nullable |
|---|---|---|---|
| 1 | `company_id` | `STRING` | YES |
| 2 | `company_name` | `STRING` | YES |

### Sample (5 rows)

```json
[
  {
    "company_id": "20307",
    "company_name": "Miami Vacation Rentals"
  }
]
```

## parsed_breezeway_people

Rows: 52

### Columns

| # | name | type | nullable |
|---|---|---|---|
| 1 | `people_id` | `INT64` | YES |
| 2 | `accept_decline_tasks` | `BOOL` | YES |
| 3 | `active` | `BOOL` | YES |
| 4 | `availability_friday` | `JSON` | YES |
| 5 | `availability_monday` | `JSON` | YES |
| 6 | `availability_saturday` | `JSON` | YES |
| 7 | `availability_sunday` | `JSON` | YES |
| 8 | `availability_thursday` | `JSON` | YES |
| 9 | `availability_tuesday` | `JSON` | YES |
| 10 | `availability_wednesday` | `JSON` | YES |
| 11 | `emails` | `JSON` | YES |
| 12 | `employee_code` | `STRING` | YES |
| 13 | `first_name` | `STRING` | YES |
| 14 | `groups_listed` | `JSON` | YES |
| 15 | `people_id_payload` | `STRING` | YES |
| 16 | `last_name` | `STRING` | YES |
| 17 | `shifts_friday_active` | `BOOL` | YES |
| 18 | `shifts_friday_shifts` | `JSON` | YES |
| 19 | `shifts_monday_active` | `BOOL` | YES |
| 20 | `shifts_monday_shifts` | `JSON` | YES |
| 21 | `shifts_saturday_active` | `BOOL` | YES |
| 22 | `shifts_saturday_shifts` | `JSON` | YES |
| 23 | `shifts_sunday_active` | `BOOL` | YES |
| 24 | `shifts_sunday_shifts` | `JSON` | YES |
| 25 | `shifts_thursday_active` | `BOOL` | YES |
| 26 | `shifts_thursday_shifts` | `JSON` | YES |
| 27 | `shifts_tuesday_active` | `BOOL` | YES |
| 28 | `shifts_tuesday_shifts` | `JSON` | YES |
| 29 | `shifts_wednesday_active` | `BOOL` | YES |
| 30 | `shifts_wednesday_shifts` | `JSON` | YES |
| 31 | `type_departments` | `JSON` | YES |
| 32 | `type_role` | `STRING` | YES |

### Sample (5 rows)

```json
[
  {
    "people_id": 403339,
    "accept_decline_tasks": false,
    "active": true,
    "availability_friday": null,
    "availability_monday": null,
    "availability_saturday": null,
    "availability_sunday": null,
    "availability_thursday": null,
    "availability_tuesday": null,
    "availability_wednesday": null,
    "emails": "[\"ana.saavedra@miamivacationrentals.com\"]",
    "employee_code": null,
    "first_name": "Ana",
    "groups_listed": "[{\"id\":38579,\"name\":\"Arya\",\"parent_group_id\":null},{\"id\":49049,\"name\":\"District\",\"parent_group_id\":null},{\"id\":38577,\"name\":\"Elser\",\"parent_group_id\":null},{\"id\":38376,\"name\":\"Icon\",\"parent_group_id\":null},{\"id\":49064,\"name\":\"Icon Advantage HK\",\"parent_group_id\":38376},{\"id\":49094,\"name\":\"Icon LFD HK\",\"parent_group_id\":38376},{\"id\":40970,\"name\":\"Maxine\",\"parent_group_id\":38579},{\"id\":38827,\"name\":\"Natiivo\",\"parent_group_id\":null}]",
    "people_id_payload": "403339",
    "last_name": "Saavedra",
    "shifts_friday_active": false,
    "shifts_friday_shifts": "[]",
    "shifts_monday_active": false,
    "shifts_monday_shifts": "[]",
    "shifts_saturday_active": false,
    "shifts_saturday_shifts": "[]",
    "shifts_sunday_active": false,
    "shifts_sunday_shifts": "[]",
    "shifts_thursday_active": false,
    "shifts_thursday_shifts": "[]",
    "shifts_tuesday_active": false,
    "shifts_tuesday_shifts": "[]",
    "shifts_wednesday_active": false,
    "shifts_wednesday_shifts": "[]",
    "type_departments": "[\"inspection\",\"housekeeping\",\"maintenance\",\"office\",\"linens\",\"guest_services\"]",
    "type_role": "administrator"
  },
  {
    "people_id": 311815,
    "accept_decline_tasks": false,
    "active": true,
    "availability_friday": null,
    "availability_monday": null,
    "availability_saturday": null,
    "availability_sunday": null,
    "availability_thursday": null,
    "availability_tuesday": null,
    "availability_wednesday": null,
    "emails": "[\"mercedesabud117@gmail.com\"]",
    "employee_code": "LFD HK OWNER",
    "first_name": "Mercedes",
    "groups_listed": "[{\"id\":49094,\"name\":\"Icon LFD HK\",\"parent_group_id\":38376}]",
    "people_id_payload": "311815",
    "last_name": "LFD",
    "shifts_friday_active": false,
    "shifts_friday_shifts": "[]",
    "shifts_monday_active": false,
    "shifts_monday_shifts": "[]",
    "shifts_saturday_active": false,
    "shifts_saturday_shifts": "[]",
    "shifts_sunday_active": false,
    "shifts_sunday_shifts": "[]",
    "shifts_thursday_active": false,
    "shifts_thursday_shifts": "[]",
    "shifts_tuesday_active": false,
    "shifts_tuesday_shifts": "[]",
    "shifts_wednesday_active": false,
    "shifts_wednesday_shifts": "[]",
    "type_departments": "[\"inspection\",\"housekeeping\",\"maintenance\"]",
    "type_role": "administrator"
  },
  {
    "people_id": 313346,
    "accept_decline_tasks": false,
    "active": true,
    "availability_friday": null,
    "availability_monday": null,
    "availability_saturday": null,
    "availability_sunday": null,
    "availability_thursday": null,
    "availability_tuesday": null,
    "availability_wednesday": null,
    "emails": "[\"nathaliatrujillo89@gmail.com\"]",
    "employee_code": "LFD HK",
    "first_name": "Nathalia HK",
    "groups_listed": "[{\"id\":38376,\"name\":\"Icon\",\"parent_group_id\":null},{\"id\":49064,\"name\":\"Icon Advantage HK\",\"parent_group_id\":38376},{\"id\":49094,\"name\":\"Icon LFD HK\",\"parent_group_id\":38376}]",
    "people_id_payload": "313346",
    "last_name": "LFD",
    "shifts_friday_active": false,
    "shifts_friday_shifts": "[]",
    "shifts_monday_active": false,
    "shifts_monday_shifts": "[]",
    "shifts_saturday_active": false,
    "shifts_saturday_shifts": "[]",
    "shifts_sunday_active": false,
    "shifts_sunday_shifts": "[]",
    "shifts_thursday_active": false,
    "shifts_thursday_shifts": "[]",
    "shifts_tuesday_active": false,
    "shifts_tuesday_shifts": "[]",
    "shifts_wednesday_active": false,
    "shifts_wednesday_shifts": "[]",
    "type_departments": "[\"inspection\",\"housekeeping\",\"maintenance\"]",
    "type_role": "representative"
  },
  {
    "people_id": 313352,
    "accept_decline_tasks": false,
    "active": true,
    "availability_friday": null,
    "availability_monday": null,
    "availability_saturday": null,
    "availability_sunday": null,
    "availability_thursday": null,
    "availability_tuesday": null,
    "availability_wednesday": null,
    "emails": "[\"oproenzab76@gmail.com\"]",
    "employee_code": "LFD HK",
    "first_name": "Odalvys HK",
    "groups_listed": "[{\"id\":38376,\"name\":\"Icon\",\"parent_group_id\":null},{\"id\":49064,\"name\":\"Icon Advantage HK\",\"parent_group_id\":38376},{\"id\":49094,\"name\":\"Icon LFD HK\",\"parent_group_id\":38376}]",
    "people_id_payload": "313352",
    "last_name": "LFD",
    "shifts_friday_active": false,
    "shifts_friday_shifts": "[]",
    "shifts_monday_active": false,
    "shifts_monday_shifts": "[]",
    "shifts_saturday_active": false,
    "shifts_saturday_shifts": "[]",
    "shifts_sunday_active": false,
    "shifts_sunday_shifts": "[]",
    "shifts_thursday_active": false,
    "shifts_thursday_shifts": "[]",
    "shifts_tuesday_active": false,
    "shifts_tuesday_shifts": "[]",
    "shifts_wednesday_active": false,
    "shifts_wednesday_shifts": "[]",
    "type_departments": "[\"inspection\",\"housekeeping\",\"maintenance\"]",
    "type_role": "representative"
  },
  {
    "people_id": 313355,
    "accept_decline_tasks": false,
    "active": true,
    "availability_friday": null,
    "availability_monday": null,
    "availability_saturday": null,
    "availability_sunday": null,
    "availability_thursday": null,
    "availability_tuesday": null,
    "availability_wednesday": null,
    "emails": "[\"rosauracorrales@yahoo.com\"]",
    "employee_code": "LFD HK",
    "first_name": "Rosa HK",
    "groups_listed": "[{\"id\":38376,\"name\":\"Icon\",\"parent_group_id\":null},{\"id\":49064,\"name\":\"Icon Advantage HK\",\"parent_group_id\":38376},{\"id\":49094,\"name\":\"Icon LFD HK\",\"parent_group_id\":38376}]",
    "people_id_payload": "313355",
    "last_name": "LFD",
    "shifts_friday_active": false,
    "shifts_friday_shifts": "[]",
    "shifts_monday_active": false,
    "shifts_monday_shifts": "[]",
    "shifts_saturday_active": false,
    "shifts_saturday_shifts": "[]",
    "shifts_sunday_active": false,
    "shifts_sunday_shifts": "[]",
    "shifts_thursday_active": false,
    "shifts_thursday_shifts": "[]",
    "shifts_tuesday_active": false,
    "shifts_tuesday_shifts": "[]",
    "shifts_wednesday_active": false,
    "shifts_wednesday_shifts": "[]",
    "type_departments": "[\"inspection\",\"housekeeping\",\"maintenance\"]",
    "type_role": "representative"
  }
]
```

## parsed_breezeway_people_groups

Rows: 237

### Columns

| # | name | type | nullable |
|---|---|---|---|
| 1 | `people_id` | `INT64` | YES |
| 2 | `people_group_id` | `STRING` | YES |
| 3 | `people_group_name` | `STRING` | YES |
| 4 | `people_parent_group_id` | `STRING` | YES |

### Sample (5 rows)

```json
[
  {
    "people_id": 325447,
    "people_group_id": "49049",
    "people_group_name": "District",
    "people_parent_group_id": null
  },
  {
    "people_id": 304184,
    "people_group_id": "49064",
    "people_group_name": "Icon Advantage HK",
    "people_parent_group_id": "38376"
  },
  {
    "people_id": 332816,
    "people_group_id": "40970",
    "people_group_name": "Maxine",
    "people_parent_group_id": "38579"
  },
  {
    "people_id": 313346,
    "people_group_id": "49094",
    "people_group_name": "Icon LFD HK",
    "people_parent_group_id": "38376"
  },
  {
    "people_id": 374377,
    "people_group_id": "49094",
    "people_group_name": "Icon LFD HK",
    "people_parent_group_id": "38376"
  }
]
```

## parsed_breezeway_people_type_departments

Rows: 101

### Columns

| # | name | type | nullable |
|---|---|---|---|
| 1 | `people_id` | `INT64` | YES |
| 2 | `people_type_departments` | `JSON` | YES |

### Sample (5 rows)

```json
[
  {
    "people_id": 403339,
    "people_type_departments": "\"housekeeping\""
  },
  {
    "people_id": 325443,
    "people_type_departments": "\"inspection\""
  },
  {
    "people_id": 311816,
    "people_type_departments": "\"maintenance\""
  },
  {
    "people_id": 313353,
    "people_type_departments": "\"inspection\""
  },
  {
    "people_id": 311800,
    "people_type_departments": "\"inspection\""
  }
]
```

## parsed_breezeway_properties

Rows: 397

### Columns

| # | name | type | nullable |
|---|---|---|---|
| 1 | `property_id` | `INT64` | YES |
| 2 | `address1` | `STRING` | YES |
| 3 | `address2` | `STRING` | YES |
| 4 | `building` | `STRING` | YES |
| 5 | `city` | `STRING` | YES |
| 6 | `company_id` | `STRING` | YES |
| 7 | `country` | `STRING` | YES |
| 8 | `display` | `STRING` | YES |
| 9 | `property_groups` | `JSON` | YES |
| 10 | `property_id_payload` | `STRING` | YES |
| 11 | `latitude` | `STRING` | YES |
| 12 | `longitude` | `STRING` | YES |
| 13 | `name` | `STRING` | YES |
| 14 | `notes` | `JSON` | YES |
| 15 | `photos` | `JSON` | YES |
| 16 | `reference_company_id` | `STRING` | YES |
| 17 | `reference_external_property_id` | `STRING` | YES |
| 18 | `reference_property_id` | `STRING` | YES |
| 19 | `state` | `STRING` | YES |
| 20 | `status` | `STRING` | YES |
| 21 | `wifi_name` | `STRING` | YES |
| 22 | `wifi_password` | `STRING` | YES |
| 23 | `zipcode` | `STRING` | YES |

### Sample (5 rows)

```json
[
  {
    "property_id": 1138541,
    "address1": "401 Biscayne Boulevard Way",
    "address2": null,
    "building": null,
    "city": "Miami",
    "company_id": "20307",
    "country": "US",
    "display": "PA.ELSER 04 105",
    "property_groups": "[]",
    "property_id_payload": "1138541",
    "latitude": "25.7714404",
    "longitude": "-80.1863962",
    "name": "PA.ELSER 04 105",
    "notes": "{}",
    "photos": "[{\"caption\":null,\"default\":true,\"id\":570569554,\"original_url\":\"https://assets.guesty.com/image/upload/v1761146079/production/67f3e2c2c3c7926782f6fd63/ofbhgqiwlz4gsfdbffzt.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/e45da7b4-6021-43bc-9664-18584134536c.jpg\"}]",
    "reference_company_id": "0oaor5yi2gtOPMBQx5d7",
    "reference_external_property_id": "68ffe7ec73d643001465b81e",
    "reference_property_id": "68ffe7ec73d643001465b81e",
    "state": "Florida",
    "status": "inactive",
    "wifi_name": null,
    "wifi_password": null,
    "zipcode": "33132"
  },
  {
    "property_id": 1138539,
    "address1": "401 Biscayne Boulevard Way",
    "address2": null,
    "building": null,
    "city": "Miami",
    "company_id": "20307",
    "country": "US",
    "display": "PA.ELSER 04 104",
    "property_groups": "[]",
    "property_id_payload": "1138539",
    "latitude": "25.7714404",
    "longitude": "-80.1863962",
    "name": "PA.ELSER 04 104",
    "notes": "{}",
    "photos": "[{\"caption\":null,\"default\":true,\"id\":570569501,\"original_url\":\"https://assets.guesty.com/image/upload/v1761146079/production/67f3e2c2c3c7926782f6fd63/ofbhgqiwlz4gsfdbffzt.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/2883ff55-4bf0-4b09-bdf8-aff2f12072e8.jpg\"}]",
    "reference_company_id": "0oaor5yi2gtOPMBQx5d7",
    "reference_external_property_id": "68ffe7ec73d643001465b716",
    "reference_property_id": "68ffe7ec73d643001465b716",
    "state": "Florida",
    "status": "inactive",
    "wifi_name": null,
    "wifi_password": null,
    "zipcode": "33132"
  },
  {
    "property_id": 1138564,
    "address1": "401 Biscayne Boulevard Way",
    "address2": null,
    "building": null,
    "city": "Miami",
    "company_id": "20307",
    "country": "US",
    "display": "PA.ELSER 04 110",
    "property_groups": "[]",
    "property_id_payload": "1138564",
    "latitude": "25.7714404",
    "longitude": "-80.1863962",
    "name": "PA.ELSER 04 110",
    "notes": "{}",
    "photos": "[{\"caption\":null,\"default\":true,\"id\":570569792,\"original_url\":\"https://assets.guesty.com/image/upload/v1761146079/production/67f3e2c2c3c7926782f6fd63/ofbhgqiwlz4gsfdbffzt.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/e3ed4ad0-17c0-43cc-b014-b981b13d245a.jpg\"}]",
    "reference_company_id": "0oaor5yi2gtOPMBQx5d7",
    "reference_external_property_id": "68ffe7ee75c3fa0012c65e0a",
    "reference_property_id": "68ffe7ee75c3fa0012c65e0a",
    "state": "Florida",
    "status": "inactive",
    "wifi_name": null,
    "wifi_password": null,
    "zipcode": "33132"
  },
  {
    "property_id": 1138569,
    "address1": "401 Biscayne Boulevard Way",
    "address2": null,
    "building": null,
    "city": "Miami",
    "company_id": "20307",
    "country": "US",
    "display": "PA.ELSER 04 112",
    "property_groups": "[]",
    "property_id_payload": "1138569",
    "latitude": "25.7714404",
    "longitude": "-80.1863962",
    "name": "PA.ELSER 04 112",
    "notes": "{}",
    "photos": "[{\"caption\":null,\"default\":true,\"id\":570570310,\"original_url\":\"https://assets.guesty.com/image/upload/v1761146079/production/67f3e2c2c3c7926782f6fd63/ofbhgqiwlz4gsfdbffzt.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/8df44a70-7ff8-4c5b-bb2b-da91fec80c80.jpg\"}]",
    "reference_company_id": "0oaor5yi2gtOPMBQx5d7",
    "reference_external_property_id": "68ffe7ef388847000e4825d2",
    "reference_property_id": "68ffe7ef388847000e4825d2",
    "state": "Florida",
    "status": "inactive",
    "wifi_name": null,
    "wifi_password": null,
    "zipcode": "33132"
  },
  {
    "property_id": 1138545,
    "address1": "401 Biscayne Boulevard Way",
    "address2": null,
    "building": null,
    "city": "Miami",
    "company_id": "20307",
    "country": "US",
    "display": "PA.ELSER 04 106",
    "property_groups": "[]",
    "property_id_payload": "1138545",
    "latitude": "25.7714404",
    "longitude": "-80.1863962",
    "name": "PA.ELSER 04 106",
    "notes": "{}",
    "photos": "[{\"caption\":null,\"default\":true,\"id\":570569564,\"original_url\":\"https://assets.guesty.com/image/upload/v1761146079/production/67f3e2c2c3c7926782f6fd63/ofbhgqiwlz4gsfdbffzt.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/c26afc7e-5322-45d3-bc13-9595e5011ebe.jpg\"}]",
    "reference_company_id": "0oaor5yi2gtOPMBQx5d7",
    "reference_external_property_id": "68ffe7ecacdfb20011427f5a",
    "reference_property_id": "68ffe7ecacdfb20011427f5a",
    "state": "Florida",
    "status": "inactive",
    "wifi_name": null,
    "wifi_password": null,
    "zipcode": "33132"
  }
]
```

## parsed_breezeway_properties_groups

Rows: 471

### Columns

| # | name | type | nullable |
|---|---|---|---|
| 1 | `property_id` | `INT64` | YES |
| 2 | `property_group_id` | `STRING` | YES |
| 3 | `property_group_name` | `STRING` | YES |
| 4 | `property_parent_group_id` | `STRING` | YES |

### Sample (5 rows)

```json
[
  {
    "property_id": 1173477,
    "property_group_id": "38376",
    "property_group_name": "Icon",
    "property_parent_group_id": null
  },
  {
    "property_id": 1140927,
    "property_group_id": "38577",
    "property_group_name": "Elser",
    "property_parent_group_id": null
  },
  {
    "property_id": 1168064,
    "property_group_id": "38577",
    "property_group_name": "Elser",
    "property_parent_group_id": null
  },
  {
    "property_id": 1015982,
    "property_group_id": "38577",
    "property_group_name": "Elser",
    "property_parent_group_id": null
  },
  {
    "property_id": 1009313,
    "property_group_id": "38577",
    "property_group_name": "Elser",
    "property_parent_group_id": null
  }
]
```

## parsed_breezeway_reservations

Rows: 15578

### Columns

| # | name | type | nullable |
|---|---|---|---|
| 1 | `reservation_id` | `INT64` | YES |
| 2 | `access_code` | `STRING` | YES |
| 3 | `checkin_date` | `DATE` | YES |
| 4 | `checkin_early` | `STRING` | YES |
| 5 | `checkin_time` | `STRING` | YES |
| 6 | `checkout_date` | `DATE` | YES |
| 7 | `checkout_late` | `STRING` | YES |
| 8 | `checkout_time` | `STRING` | YES |
| 9 | `flags` | `JSON` | YES |
| 10 | `guests` | `JSON` | YES |
| 11 | `guide_url` | `STRING` | YES |
| 12 | `reservation_id_payload` | `STRING` | YES |
| 13 | `note` | `STRING` | YES |
| 14 | `property_id` | `STRING` | YES |
| 15 | `reference_external_property_id` | `STRING` | YES |
| 16 | `reference_property_id` | `STRING` | YES |
| 17 | `reference_reservation_id` | `STRING` | YES |
| 18 | `status` | `STRING` | YES |
| 19 | `reservation_tags` | `JSON` | YES |
| 20 | `type_guest_code` | `STRING` | YES |
| 21 | `type_guest_name` | `STRING` | YES |
| 22 | `type_reservation_code` | `STRING` | YES |
| 23 | `type_reservation_name` | `STRING` | YES |
| 24 | `type_stay_code` | `STRING` | YES |
| 25 | `type_stay_name` | `STRING` | YES |

### Sample (5 rows)

```json
[
  {
    "reservation_id": 88361769,
    "access_code": null,
    "checkin_date": {
      "value": "2026-04-09"
    },
    "checkin_early": null,
    "checkin_time": "16:00:00",
    "checkout_date": {
      "value": "2026-04-13"
    },
    "checkout_late": null,
    "checkout_time": "10:00:00",
    "flags": "[]",
    "guests": "[]",
    "guide_url": "https://guide.breezeway.io/YFmg4wXAQck",
    "reservation_id_payload": "88361769",
    "note": null,
    "property_id": "1009347",
    "reference_external_property_id": "6806b0a0d541a60014bcb407",
    "reference_property_id": "6806b0a0d541a60014bcb407",
    "reference_reservation_id": "696c86c9d11ffe98e4cfa9bf",
    "status": "deleted",
    "reservation_tags": "[]",
    "type_guest_code": null,
    "type_guest_name": null,
    "type_reservation_code": "lockoff",
    "type_reservation_name": "Lock-off",
    "type_stay_code": null,
    "type_stay_name": null
  },
  {
    "reservation_id": 94882271,
    "access_code": null,
    "checkin_date": {
      "value": "2026-04-18"
    },
    "checkin_early": null,
    "checkin_time": "16:00:00",
    "checkout_date": {
      "value": "2026-04-25"
    },
    "checkout_late": null,
    "checkout_time": "10:00:00",
    "flags": "[]",
    "guests": "[]",
    "guide_url": "https://guide.breezeway.io/up556LIoaJE",
    "reservation_id_payload": "94882271",
    "note": null,
    "property_id": "1009374",
    "reference_external_property_id": "6806b0b00d6ec90013d270b4",
    "reference_property_id": "6806b0b00d6ec90013d270b4",
    "reference_reservation_id": "69dd9b0bd64090a84d9a40da",
    "status": "deleted",
    "reservation_tags": "[]",
    "type_guest_code": null,
    "type_guest_name": null,
    "type_reservation_code": "lockoff",
    "type_reservation_name": "Lock-off",
    "type_stay_code": null,
    "type_stay_name": null
  },
  {
    "reservation_id": 78968955,
    "access_code": null,
    "checkin_date": {
      "value": "2025-11-01"
    },
    "checkin_early": null,
    "checkin_time": "16:00:00",
    "checkout_date": {
      "value": "2025-11-15"
    },
    "checkout_late": null,
    "checkout_time": "10:00:00",
    "flags": "[]",
    "guests": "[]",
    "guide_url": "https://guide.breezeway.io/MsfZYMekBhU",
    "reservation_id_payload": "78968955",
    "note": null,
    "property_id": "1009259",
    "reference_external_property_id": "6806b0d722e8a400131db079",
    "reference_property_id": "6806b0d722e8a400131db079",
    "reference_reservation_id": "6806b0d952e8897ec245cb4d",
    "status": "deleted",
    "reservation_tags": "[]",
    "type_guest_code": null,
    "type_guest_name": null,
    "type_reservation_code": "hold",
    "type_reservation_name": "Hold",
    "type_stay_code": null,
    "type_stay_name": null
  },
  {
    "reservation_id": 94327555,
    "access_code": null,
    "checkin_date": {
      "value": "2026-04-11"
    },
    "checkin_early": null,
    "checkin_time": "16:00:00",
    "checkout_date": {
      "value": "2026-04-15"
    },
    "checkout_late": null,
    "checkout_time": "10:00:00",
    "flags": "[]",
    "guests": "[]",
    "guide_url": "https://guide.breezeway.io/8axjppSFa9o",
    "reservation_id_payload": "94327555",
    "note": null,
    "property_id": "1009259",
    "reference_external_property_id": "6806b0d722e8a400131db079",
    "reference_property_id": "6806b0d722e8a400131db079",
    "reference_reservation_id": "69d312ca6ab33bf28619eda6",
    "status": "deleted",
    "reservation_tags": "[]",
    "type_guest_code": null,
    "type_guest_name": null,
    "type_reservation_code": "lockoff",
    "type_reservation_name": "Lock-off",
    "type_stay_code": null,
    "type_stay_name": null
  },
  {
    "reservation_id": 95584512,
    "access_code": null,
    "checkin_date": {
      "value": "2026-05-04"
    },
    "checkin_early": null,
    "checkin_time": "16:00:00",
    "checkout_date": {
      "value": "2026-05-06"
    },
    "checkout_late": null,
    "checkout_time": "10:00:00",
    "flags": "[]",
    "guests": "[]",
    "guide_url": "https://guide.breezeway.io/yCzxCisdzGQ",
    "reservation_id_payload": "95584512",
    "note": null,
    "property_id": "1009259",
    "reference_external_property_id": "6806b0d722e8a400131db079",
    "reference_property_id": "6806b0d722e8a400131db079",
    "reference_reservation_id": "69e7ebd1d990bc26cf1a5d7d",
    "status": "deleted",
    "reservation_tags": "[]",
    "type_guest_code": null,
    "type_guest_name": null,
    "type_reservation_code": "lockoff",
    "type_reservation_name": "Lock-off",
    "type_stay_code": null,
    "type_stay_name": null
  }
]
```

## parsed_breezeway_reservations_guests

Rows: 11194

### Columns

| # | name | type | nullable |
|---|---|---|---|
| 1 | `reservation_id` | `INT64` | YES |
| 2 | `guest_email` | `STRING` | YES |
| 3 | `first_name` | `STRING` | YES |
| 4 | `last_name` | `STRING` | YES |
| 5 | `country_code` | `STRING` | YES |
| 6 | `dial_code` | `STRING` | YES |
| 7 | `phone_number` | `STRING` | YES |
| 8 | `guest_primary` | `STRING` | YES |
| 9 | `type_phone_number` | `STRING` | YES |

### Sample (5 rows)

```json
[
  {
    "reservation_id": 87632446,
    "guest_email": null,
    "first_name": "Caitlin",
    "last_name": "Williams",
    "country_code": "us",
    "dial_code": "1",
    "phone_number": "3173625288",
    "guest_primary": "true",
    "type_phone_number": null
  },
  {
    "reservation_id": 85051173,
    "guest_email": "jay@kushmart.com",
    "first_name": "James",
    "last_name": "Adames",
    "country_code": "us",
    "dial_code": "1",
    "phone_number": "6468944412",
    "guest_primary": "true",
    "type_phone_number": null
  },
  {
    "reservation_id": 87299412,
    "guest_email": "nhuesm.432782@guest.booking.com",
    "first_name": "Nicole",
    "last_name": "Huesman",
    "country_code": "us",
    "dial_code": "1",
    "phone_number": "5038075599",
    "guest_primary": "true",
    "type_phone_number": null
  },
  {
    "reservation_id": 88225730,
    "guest_email": "rgrover729@gmail.com",
    "first_name": "Robert",
    "last_name": "Grover",
    "country_code": "us",
    "dial_code": "1",
    "phone_number": "7734749597",
    "guest_primary": "true",
    "type_phone_number": null
  },
  {
    "reservation_id": 86101630,
    "guest_email": "tina.meigh@maplesandcalder.com",
    "first_name": "Tina",
    "last_name": "Wind",
    "country_code": "ky",
    "dial_code": "1",
    "phone_number": "3455265242",
    "guest_primary": "true",
    "type_phone_number": null
  }
]
```

## parsed_breezeway_reservations_tags

Rows: 545

### Columns

| # | name | type | nullable |
|---|---|---|---|
| 1 | `reservation_id` | `INT64` | YES |
| 2 | `reservation_tag_id` | `STRING` | YES |
| 3 | `reservation_tag_name` | `STRING` | YES |

### Sample (5 rows)

```json
[
  {
    "reservation_id": 88070640,
    "reservation_tag_id": "10287",
    "reservation_tag_name": "Late Checkout"
  },
  {
    "reservation_id": 97763918,
    "reservation_tag_id": "10286",
    "reservation_tag_name": "Early Checkin"
  },
  {
    "reservation_id": 91729882,
    "reservation_tag_id": "10286",
    "reservation_tag_name": "Early Checkin"
  },
  {
    "reservation_id": 85944120,
    "reservation_tag_id": "10287",
    "reservation_tag_name": "Late Checkout"
  },
  {
    "reservation_id": 86926319,
    "reservation_tag_id": "10287",
    "reservation_tag_name": "Late Checkout"
  }
]
```

## parsed_breezeway_supplies

Rows: 216

### Columns

| # | name | type | nullable |
|---|---|---|---|
| 1 | `supplies_id` | `INT64` | YES |
| 2 | `total_price` | `STRING` | YES |
| 3 | `company_id` | `STRING` | YES |
| 4 | `created_at` | `TIMESTAMP` | YES |
| 5 | `description` | `STRING` | YES |
| 6 | `supplies_id_payload` | `STRING` | YES |
| 7 | `internal_id` | `STRING` | YES |
| 8 | `is_billable` | `STRING` | YES |
| 9 | `low_stock_alert` | `STRING` | YES |
| 10 | `low_stock_count` | `STRING` | YES |
| 11 | `markup_pricing_type` | `STRING` | YES |
| 12 | `markup_rate` | `STRING` | YES |
| 13 | `name` | `STRING` | YES |
| 14 | `size` | `STRING` | YES |
| 15 | `stock_count` | `STRING` | YES |
| 16 | `supply_category_id` | `STRING` | YES |
| 17 | `supply_unit_type` | `STRING` | YES |
| 18 | `type_stock_status_code` | `STRING` | YES |
| 19 | `type_stock_status_name` | `STRING` | YES |
| 20 | `unit_cost` | `STRING` | YES |
| 21 | `updated_at` | `TIMESTAMP` | YES |

### Sample (5 rows)

```json
[
  {
    "supplies_id": 232349,
    "total_price": null,
    "company_id": "20307",
    "created_at": {
      "value": "2025-05-26T15:08:50.000Z"
    },
    "description": "Bathroom - Bath Towel",
    "supplies_id_payload": "232349",
    "internal_id": "I-01",
    "is_billable": "true",
    "low_stock_alert": "false",
    "low_stock_count": "0",
    "markup_pricing_type": "0",
    "markup_rate": "22",
    "name": "Poly White Bath Towel - 12/Pack",
    "size": "",
    "stock_count": "0",
    "supply_category_id": "11656",
    "supply_unit_type": "ea",
    "type_stock_status_code": null,
    "type_stock_status_name": null,
    "unit_cost": "51.49",
    "updated_at": {
      "value": "2025-05-26T15:08:50.000Z"
    }
  },
  {
    "supplies_id": 232384,
    "total_price": null,
    "company_id": "20307",
    "created_at": {
      "value": "2025-05-26T15:08:51.000Z"
    },
    "description": "Flower clear vase",
    "supplies_id_payload": "232384",
    "internal_id": "I-36",
    "is_billable": "true",
    "low_stock_alert": "false",
    "low_stock_count": "0",
    "markup_pricing_type": "0",
    "markup_rate": "22",
    "name": "Flower clear vase",
    "size": "",
    "stock_count": "0",
    "supply_category_id": "11656",
    "supply_unit_type": "ea",
    "type_stock_status_code": null,
    "type_stock_status_name": null,
    "unit_cost": "9.99",
    "updated_at": {
      "value": "2025-05-26T15:08:51.000Z"
    }
  },
  {
    "supplies_id": 232363,
    "total_price": null,
    "company_id": "20307",
    "created_at": {
      "value": "2025-05-26T15:08:51.000Z"
    },
    "description": "Room - VÅRELD, Bedspread, 91x98 \"",
    "supplies_id_payload": "232363",
    "internal_id": "I-15",
    "is_billable": "true",
    "low_stock_alert": "false",
    "low_stock_count": "0",
    "markup_pricing_type": "0",
    "markup_rate": "22",
    "name": "BEDSPREAD, 91x98 \", White",
    "size": "",
    "stock_count": "0",
    "supply_category_id": "11656",
    "supply_unit_type": "ea",
    "type_stock_status_code": null,
    "type_stock_status_name": null,
    "unit_cost": "50.28",
    "updated_at": {
      "value": "2025-05-26T15:08:51.000Z"
    }
  },
  {
    "supplies_id": 232392,
    "total_price": null,
    "company_id": "20307",
    "created_at": {
      "value": "2025-05-26T15:08:51.000Z"
    },
    "description": "Closet- Wood Hangers",
    "supplies_id_payload": "232392",
    "internal_id": "I-44",
    "is_billable": "true",
    "low_stock_alert": "false",
    "low_stock_count": "0",
    "markup_pricing_type": "0",
    "markup_rate": "22",
    "name": "HANGERS for clothes, white",
    "size": "",
    "stock_count": "0",
    "supply_category_id": "11656",
    "supply_unit_type": "ea",
    "type_stock_status_code": null,
    "type_stock_status_name": null,
    "unit_cost": "9.62",
    "updated_at": {
      "value": "2025-05-26T15:08:51.000Z"
    }
  },
  {
    "supplies_id": 232364,
    "total_price": null,
    "company_id": "20307",
    "created_at": {
      "value": "2025-05-26T15:08:51.000Z"
    },
    "description": "Kitchen - BIG ALUMINUM BOWL",
    "supplies_id_payload": "232364",
    "internal_id": "I-16",
    "is_billable": "true",
    "low_stock_alert": "false",
    "low_stock_count": "0",
    "markup_pricing_type": "0",
    "markup_rate": "22",
    "name": "BIG ALUMINUM BOWL",
    "size": "",
    "stock_count": "0",
    "supply_category_id": "11656",
    "supply_unit_type": "ea",
    "type_stock_status_code": null,
    "type_stock_status_name": null,
    "unit_cost": "11.99",
    "updated_at": {
      "value": "2025-05-26T15:08:51.000Z"
    }
  }
]
```

## parsed_breezeway_task_comments

Rows: 644

### Columns

| # | name | type | nullable |
|---|---|---|---|
| 1 | `task_id` | `INT64` | YES |
| 2 | `task_comment_id` | `INT64` | YES |
| 3 | `comment` | `STRING` | YES |
| 4 | `created_at` | `TIMESTAMP` | YES |

### Sample (5 rows)

```json
[
  {
    "task_id": 102576965,
    "task_comment_id": 30835538,
    "comment": " Se busca en el storage 25 minutos ",
    "created_at": {
      "value": "2025-06-24T14:00:17.000Z"
    }
  },
  {
    "task_id": 105290046,
    "task_comment_id": 31719301,
    "comment": "1 hira",
    "created_at": {
      "value": "2025-07-14T08:22:46.000Z"
    }
  },
  {
    "task_id": 106669891,
    "task_comment_id": 32195253,
    "comment": "15 minutos",
    "created_at": {
      "value": "2025-07-24T12:08:42.000Z"
    }
  },
  {
    "task_id": 122793002,
    "task_comment_id": 37337256,
    "comment": "15 minutos ",
    "created_at": {
      "value": "2025-11-30T02:09:56.000Z"
    }
  },
  {
    "task_id": 118952890,
    "task_comment_id": 36154066,
    "comment": "15 minutos ",
    "created_at": {
      "value": "2025-10-28T10:19:15.000Z"
    }
  }
]
```

## parsed_breezeway_task_requirements

Rows: 24999

### Columns

| # | name | type | nullable |
|---|---|---|---|
| 1 | `task_id` | `INT64` | YES |
| 2 | `task_requirement_id` | `STRING` | YES |
| 3 | `home_element_name` | `STRING` | YES |
| 4 | `note` | `STRING` | YES |
| 5 | `photo_required` | `STRING` | YES |
| 6 | `response` | `STRING` | YES |
| 7 | `section_name` | `STRING` | YES |
| 8 | `type_requirement` | `STRING` | YES |
| 9 | `photos` | `JSON` | YES |
| 10 | `actions` | `JSON` | YES |

### Sample (5 rows)

```json
[
  {
    "task_id": 136991564,
    "task_requirement_id": "136991564-Unit Check-yes / no",
    "home_element_name": null,
    "note": null,
    "photo_required": "false",
    "response": "no",
    "section_name": "Unit Check",
    "type_requirement": "yes / no",
    "photos": "[]",
    "actions": "\"Is the property clean?\""
  },
  {
    "task_id": 129868135,
    "task_requirement_id": "129868135-Unit Check-yes / no",
    "home_element_name": null,
    "note": null,
    "photo_required": "false",
    "response": "no",
    "section_name": "Unit Check",
    "type_requirement": "yes / no",
    "photos": "[]",
    "actions": "\"Is the property clean?\""
  },
  {
    "task_id": 114870601,
    "task_requirement_id": "114870601-Unit Check-yes / no",
    "home_element_name": null,
    "note": null,
    "photo_required": "false",
    "response": "no",
    "section_name": "Unit Check",
    "type_requirement": "yes / no",
    "photos": "[]",
    "actions": "\"Is the property clean?\""
  },
  {
    "task_id": 138065518,
    "task_requirement_id": "138065518-Unit Check-yes / no",
    "home_element_name": null,
    "note": null,
    "photo_required": "false",
    "response": "no",
    "section_name": "Unit Check",
    "type_requirement": "yes / no",
    "photos": "[]",
    "actions": "\"Is the property clean?\""
  },
  {
    "task_id": 138907098,
    "task_requirement_id": "138907098-None-yes / no",
    "home_element_name": "Fire Extinguisher",
    "note": null,
    "photo_required": "true",
    "response": "no",
    "section_name": null,
    "type_requirement": "yes / no",
    "photos": "[\"https://s3.amazonaws.com/brzw-photos/d74d9972-5861-46af-a605-75751bc361a2.jpg\"]",
    "actions": "\"Fire extinguisher in the unit\""
  }
]
```

## parsed_breezeway_task_tags

Rows: 13965

### Columns

| # | name | type | nullable |
|---|---|---|---|
| 1 | `task_id` | `INT64` | YES |
| 2 | `task_tag_id` | `STRING` | YES |
| 3 | `task_tag_name` | `STRING` | YES |

### Sample (5 rows)

```json
[
  {
    "task_id": 115028469,
    "task_tag_id": "151783",
    "task_tag_name": "Owner Billable"
  },
  {
    "task_id": 142398387,
    "task_tag_id": "247780",
    "task_tag_name": "Corrective"
  },
  {
    "task_id": 145252363,
    "task_tag_id": "247780",
    "task_tag_name": "Corrective"
  },
  {
    "task_id": 134829159,
    "task_tag_id": "247780",
    "task_tag_name": "Corrective"
  },
  {
    "task_id": 115770848,
    "task_tag_id": "151783",
    "task_tag_name": "Owner Billable"
  }
]
```

## parsed_breezeway_tasks

Rows: 69022

### Columns

| # | name | type | nullable |
|---|---|---|---|
| 1 | `task_id` | `INT64` | YES |
| 2 | `assignments` | `JSON` | YES |
| 3 | `bill_to` | `STRING` | YES |
| 4 | `costs` | `STRING` | YES |
| 5 | `created_at` | `TIMESTAMP` | YES |
| 6 | `created_by_id` | `JSON` | YES |
| 7 | `created_by_name` | `JSON` | YES |
| 8 | `description` | `STRING` | YES |
| 9 | `finished_at` | `TIMESTAMP` | YES |
| 10 | `home_id` | `STRING` | YES |
| 11 | `tasks_id_payload` | `STRING` | YES |
| 12 | `name` | `STRING` | YES |
| 13 | `paused` | `BOOL` | YES |
| 14 | `photos` | `JSON` | YES |
| 15 | `rate_paid` | `STRING` | YES |
| 16 | `rate_type` | `STRING` | YES |
| 17 | `reference_property_id` | `STRING` | YES |
| 18 | `report_url` | `STRING` | YES |
| 19 | `requested_by` | `STRING` | YES |
| 20 | `scheduled_date` | `STRING` | YES |
| 21 | `scheduled_time` | `STRING` | YES |
| 22 | `started_at` | `TIMESTAMP` | YES |
| 23 | `supplies` | `JSON` | YES |
| 24 | `tags` | `JSON` | YES |
| 25 | `task_tags` | `JSON` | YES |
| 26 | `template_id` | `STRING` | YES |
| 27 | `total_time` | `STRING` | YES |
| 28 | `type_department` | `STRING` | YES |
| 29 | `type_priority` | `STRING` | YES |
| 30 | `type_task_status_code` | `STRING` | YES |
| 31 | `type_task_status_name` | `STRING` | YES |
| 32 | `type_task_status_stage` | `STRING` | YES |
| 33 | `updated_at` | `TIMESTAMP` | YES |

### Sample (5 rows)

```json
[
  {
    "task_id": 117755229,
    "assignments": "[{\"assignee_id\":304852,\"employee_code\":\"ELSER MAINTENANCE\",\"expires_at\":null,\"id\":158910545,\"name\":\"Cristian Bello\",\"type_task_user_status\":\"assigned\"}]",
    "bill_to": "owner",
    "costs": null,
    "created_at": {
      "value": "2025-10-18T17:21:29.000Z"
    },
    "created_by_id": "304852",
    "created_by_name": "\"Cristian Bello\"",
    "description": "",
    "finished_at": {
      "value": "2025-10-18T17:27:35.000Z"
    },
    "home_id": "1009459",
    "tasks_id_payload": "117755229",
    "name": "\nBathtub caulking – Removed old silicone and applied silicone on floor edges and tub borders",
    "paused": false,
    "photos": "[{\"id\":562901747,\"url\":\"https://s3.amazonaws.com/brzw-photos/1e5bc70c-ad0c-4757-9bbc-4837a70416ca.jpg\"},{\"id\":562901866,\"url\":\"https://s3.amazonaws.com/brzw-photos/dc0e1cf5-3029-4ed2-a7eb-6af388db5377.jpg\"},{\"id\":562908227,\"url\":\"https://s3.amazonaws.com/brzw-photos/8c0b3209-0edc-46e7-b853-af033316ca1f.jpg\"},{\"id\":562908336,\"url\":\"https://s3.amazonaws.com/brzw-photos/ac62ddca-2dce-4643-bcbc-0f19d711567e.jpg\"}]",
    "rate_paid": null,
    "rate_type": "hourly",
    "reference_property_id": "6806b25ec20fd00011d74f80",
    "report_url": "https://portal.breezeway.io/task/report/3efc2145-82da-4afc-8775-ab99e2a05907",
    "requested_by": null,
    "scheduled_date": "2025-10-18",
    "scheduled_time": null,
    "started_at": {
      "value": "2025-10-18T17:21:41.000Z"
    },
    "supplies": "[]",
    "tags": "[]",
    "task_tags": "[]",
    "template_id": null,
    "total_time": "0:05:54",
    "type_department": "maintenance",
    "type_priority": "normal",
    "type_task_status_code": "approved",
    "type_task_status_name": "Approved",
    "type_task_status_stage": "finished",
    "updated_at": {
      "value": "2025-11-03T14:31:50.000Z"
    }
  },
  {
    "task_id": 116984844,
    "assignments": "[{\"assignee_id\":304852,\"employee_code\":\"ELSER MAINTENANCE\",\"expires_at\":null,\"id\":157737982,\"name\":\"Cristian Bello\",\"type_task_user_status\":\"assigned\"}]",
    "bill_to": "owner",
    "costs": null,
    "created_at": {
      "value": "2025-10-12T17:00:41.000Z"
    },
    "created_by_id": "304852",
    "created_by_name": "\"Cristian Bello\"",
    "description": "",
    "finished_at": {
      "value": "2025-10-12T17:08:01.000Z"
    },
    "home_id": "1009264",
    "tasks_id_payload": "116984844",
    "name": "\nToilet caulking – Removed and applied new silicone around toilet",
    "paused": false,
    "photos": "[]",
    "rate_paid": null,
    "rate_type": "hourly",
    "reference_property_id": "6806b24e87cfcb0013e1af0f",
    "report_url": "https://portal.breezeway.io/task/report/2647045a-aeb6-48b7-a8f9-5debd0c9e547",
    "requested_by": null,
    "scheduled_date": "2025-10-12",
    "scheduled_time": null,
    "started_at": {
      "value": "2025-10-12T17:00:46.000Z"
    },
    "supplies": "[]",
    "tags": "[\"Owner Billable\"]",
    "task_tags": "[{\"id\":151783,\"name\":\"Owner Billable\"}]",
    "template_id": "471280",
    "total_time": "0:07:15",
    "type_department": "maintenance",
    "type_priority": "normal",
    "type_task_status_code": "approved",
    "type_task_status_name": "Approved",
    "type_task_status_stage": "finished",
    "updated_at": {
      "value": "2025-11-03T14:12:55.000Z"
    }
  },
  {
    "task_id": 108310866,
    "assignments": "[{\"assignee_id\":304852,\"employee_code\":\"ELSER MAINTENANCE\",\"expires_at\":null,\"id\":154993645,\"name\":\"Cristian Bello\",\"type_task_user_status\":\"assigned\"},{\"assignee_id\":304858,\"employee_code\":\"ARYA MAINTENANCE\",\"expires_at\":null,\"id\":145102484,\"name\":\"Manuel Velasco\",\"type_task_user_status\":\"assigned\"}]",
    "bill_to": "owner",
    "costs": null,
    "created_at": {
      "value": "2025-08-05T15:44:44.000Z"
    },
    "created_by_id": "304861",
    "created_by_name": "\"Robinson Rodriguez\"",
    "description": "Loose toilet cover. No parts replaced",
    "finished_at": {
      "value": "2025-10-24T20:13:10.000Z"
    },
    "home_id": "1009284",
    "tasks_id_payload": "108310866",
    "name": "\nToilet flush handle – Tightened nut, corrected chain, and secured handle",
    "paused": false,
    "photos": "[{\"id\":568009484,\"url\":\"https://s3.amazonaws.com/brzw-photos/ae0dfd80-7d96-4ca3-aa60-8b3466b7f09f.jpg\"},{\"id\":568009603,\"url\":\"https://s3.amazonaws.com/brzw-photos/11601f81-a70e-41d4-83d0-b16fba7e0b87.jpg\"},{\"id\":568010115,\"url\":\"https://s3.amazonaws.com/brzw-photos/0b86f024-f99f-47a0-809a-31327386b531.jpg\"}]",
    "rate_paid": null,
    "rate_type": "hourly",
    "reference_property_id": "6806b1d7fb295d000fc1947e",
    "report_url": "https://portal.breezeway.io/task/report/fbb03edd-adbf-4a91-8249-bef923dbf09c",
    "requested_by": null,
    "scheduled_date": "2025-10-24",
    "scheduled_time": null,
    "started_at": {
      "value": "2025-08-05T15:44:58.000Z"
    },
    "supplies": "[]",
    "tags": "[\"Owner Billable\"]",
    "task_tags": "[{\"id\":151783,\"name\":\"Owner Billable\"}]",
    "template_id": "410068",
    "total_time": "6:08:17",
    "type_department": "maintenance",
    "type_priority": "normal",
    "type_task_status_code": "approved",
    "type_task_status_name": "Approved",
    "type_task_status_stage": "finished",
    "updated_at": {
      "value": "2025-11-03T14:21:06.000Z"
    }
  },
  {
    "task_id": 117880474,
    "assignments": "[{\"assignee_id\":304858,\"employee_code\":\"ARYA MAINTENANCE\",\"expires_at\":null,\"id\":159091342,\"name\":\"Manuel Velasco\",\"type_task_user_status\":\"assigned\"}]",
    "bill_to": "owner",
    "costs": null,
    "created_at": {
      "value": "2025-10-19T21:29:50.000Z"
    },
    "created_by_id": "304858",
    "created_by_name": "\"Manuel Velasco\"",
    "description": "",
    "finished_at": {
      "value": "2025-10-19T21:45:00.000Z"
    },
    "home_id": "1009247",
    "tasks_id_payload": "117880474",
    "name": "\nToilet parts polishing – Applied cleaning liquid, polished lids",
    "paused": false,
    "photos": "[{\"id\":564035980,\"url\":\"https://s3.amazonaws.com/brzw-photos/1fa9e495-1c9a-4593-bc9e-3a22949f0bfc.jpg\"},{\"id\":564035994,\"url\":\"https://s3.amazonaws.com/brzw-photos/9cc66817-4523-4170-b3ab-d76aba90d88a.jpg\"},{\"id\":564036003,\"url\":\"https://s3.amazonaws.com/brzw-photos/e0f4d012-ddf3-4c05-831d-34969fd88703.jpg\"},{\"id\":564036017,\"url\":\"https://s3.amazonaws.com/brzw-photos/8392971e-a056-4737-9966-5e46d523227e.jpg\"}]",
    "rate_paid": null,
    "rate_type": "hourly",
    "reference_property_id": "6806b159c1d93b0011c76825",
    "report_url": "https://portal.breezeway.io/task/report/52003d0e-8983-4f35-9eb4-168bbc78a7c8",
    "requested_by": null,
    "scheduled_date": "2025-10-19",
    "scheduled_time": null,
    "started_at": {
      "value": "2025-10-19T21:29:58.000Z"
    },
    "supplies": "[]",
    "tags": "[]",
    "task_tags": "[]",
    "template_id": null,
    "total_time": "0:15:02",
    "type_department": "maintenance",
    "type_priority": "normal",
    "type_task_status_code": "approved",
    "type_task_status_name": "Approved",
    "type_task_status_stage": "finished",
    "updated_at": {
      "value": "2025-11-03T14:23:34.000Z"
    }
  },
  {
    "task_id": 119881811,
    "assignments": "[{\"assignee_id\":298497,\"employee_code\":\"ARYA OPERATIONS MANAGER\",\"expires_at\":null,\"id\":162291256,\"name\":\"Federica Arabia\",\"type_task_user_status\":\"assigned\"}]",
    "bill_to": "owner",
    "costs": null,
    "created_at": {
      "value": "2025-11-05T00:36:35.000Z"
    },
    "created_by_id": "298497",
    "created_by_name": "\"Federica Arabia\"",
    "description": "",
    "finished_at": {
      "value": "2025-10-27T23:37:35.000Z"
    },
    "home_id": "1009757",
    "tasks_id_payload": "119881811",
    "name": " Decoration installation – Placed 1 cushion and a throw. Items included",
    "paused": false,
    "photos": "[{\"id\":576612879,\"url\":\"https://s3.amazonaws.com/brzw-photos/9ec29666-d162-426f-bcc5-627bc3ca517d.jpg\"}]",
    "rate_paid": null,
    "rate_type": "hourly",
    "reference_property_id": "68265f9a49db1b001092a79f",
    "report_url": "https://portal.breezeway.io/task/report/4c1dc167-750e-46d4-b0ae-320cef7a3d2a",
    "requested_by": null,
    "scheduled_date": "2025-10-15",
    "scheduled_time": null,
    "started_at": null,
    "supplies": "[]",
    "tags": "[]",
    "task_tags": "[]",
    "template_id": null,
    "total_time": null,
    "type_department": "maintenance",
    "type_priority": "normal",
    "type_task_status_code": "approved",
    "type_task_status_name": "Approved",
    "type_task_status_stage": "finished",
    "updated_at": {
      "value": "2025-11-05T03:45:57.000Z"
    }
  }
]
```

## parsed_breezeway_tasks_assignments

Rows: 30588

### Columns

| # | name | type | nullable |
|---|---|---|---|
| 1 | `task_id` | `INT64` | YES |
| 2 | `assignee_id` | `STRING` | YES |
| 3 | `expires_at` | `TIMESTAMP` | YES |
| 4 | `assignment_id` | `STRING` | YES |
| 5 | `assignment_name` | `STRING` | YES |
| 6 | `type_task_user_status` | `STRING` | YES |

### Sample (5 rows)

```json
[
  {
    "task_id": 110532993,
    "assignee_id": "304858",
    "expires_at": null,
    "assignment_id": "149057225",
    "assignment_name": "Manuel Velasco",
    "type_task_user_status": "assigned"
  },
  {
    "task_id": 116148334,
    "assignee_id": "304852",
    "expires_at": null,
    "assignment_id": "156482585",
    "assignment_name": "Cristian Bello",
    "type_task_user_status": "assigned"
  },
  {
    "task_id": 103411855,
    "assignee_id": "304858",
    "expires_at": null,
    "assignment_id": "137808553",
    "assignment_name": "Manuel Velasco",
    "type_task_user_status": "assigned"
  },
  {
    "task_id": 135259705,
    "assignee_id": "304852",
    "expires_at": null,
    "assignment_id": "182922995",
    "assignment_name": "Cristian Bello",
    "type_task_user_status": "assigned"
  },
  {
    "task_id": 139561586,
    "assignee_id": "304858",
    "expires_at": null,
    "assignment_id": "189227504",
    "assignment_name": "Manuel Velasco",
    "type_task_user_status": "assigned"
  }
]
```

## Phase 0 — targeted diagnostics

### Q1/Q2 — cost columns on `parsed_breezeway_tasks`

| name | type |
|---|---|
| `costs` | `STRING` |
| `rate_paid` | `STRING` |
| `rate_type` | `STRING` |
| `supplies` | `JSON` |

### Q3 — task type signal

Neither `task_type` nor `subdepartment` columns present — classification must come from `parsed_breezeway_task_tags` join or title heuristic.
### Q4 — date columns on `parsed_breezeway_tasks` (for cronograma)

| name | type |
|---|---|
| `created_at` | `TIMESTAMP` |
| `created_by_id` | `JSON` |
| `created_by_name` | `JSON` |
| `finished_at` | `TIMESTAMP` |
| `scheduled_date` | `STRING` |
| `scheduled_time` | `STRING` |
| `started_at` | `TIMESTAMP` |
| `total_time` | `STRING` |
| `updated_at` | `TIMESTAMP` |

### Q5 — freshness column candidates (any table)

| table | column | type |
|---|---|---|
| `parsed_breezeway_supplies` | `updated_at` | `TIMESTAMP` |
| `parsed_breezeway_tasks` | `updated_at` | `TIMESTAMP` |

### Q6 — property name sample (for string-match vs Postgres `Unit.name`)

```json
[
  {
    "property_id": 1138541,
    "address1": "401 Biscayne Boulevard Way",
    "address2": null,
    "building": null,
    "city": "Miami",
    "company_id": "20307",
    "country": "US",
    "display": "PA.ELSER 04 105",
    "property_groups": "[]",
    "property_id_payload": "1138541",
    "latitude": "25.7714404",
    "longitude": "-80.1863962",
    "name": "PA.ELSER 04 105",
    "notes": "{}",
    "photos": "[{\"caption\":null,\"default\":true,\"id\":570569554,\"original_url\":\"https://assets.guesty.com/image/upload/v1761146079/production/67f3e2c2c3c7926782f6fd63/ofbhgqiwlz4gsfdbffzt.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/e45da7b4-6021-43bc-9664-18584134536c.jpg\"}]",
    "reference_company_id": "0oaor5yi2gtOPMBQx5d7",
    "reference_external_property_id": "68ffe7ec73d643001465b81e",
    "reference_property_id": "68ffe7ec73d643001465b81e",
    "state": "Florida",
    "status": "inactive",
    "wifi_name": null,
    "wifi_password": null,
    "zipcode": "33132"
  },
  {
    "property_id": 1138539,
    "address1": "401 Biscayne Boulevard Way",
    "address2": null,
    "building": null,
    "city": "Miami",
    "company_id": "20307",
    "country": "US",
    "display": "PA.ELSER 04 104",
    "property_groups": "[]",
    "property_id_payload": "1138539",
    "latitude": "25.7714404",
    "longitude": "-80.1863962",
    "name": "PA.ELSER 04 104",
    "notes": "{}",
    "photos": "[{\"caption\":null,\"default\":true,\"id\":570569501,\"original_url\":\"https://assets.guesty.com/image/upload/v1761146079/production/67f3e2c2c3c7926782f6fd63/ofbhgqiwlz4gsfdbffzt.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/2883ff55-4bf0-4b09-bdf8-aff2f12072e8.jpg\"}]",
    "reference_company_id": "0oaor5yi2gtOPMBQx5d7",
    "reference_external_property_id": "68ffe7ec73d643001465b716",
    "reference_property_id": "68ffe7ec73d643001465b716",
    "state": "Florida",
    "status": "inactive",
    "wifi_name": null,
    "wifi_password": null,
    "zipcode": "33132"
  },
  {
    "property_id": 1138564,
    "address1": "401 Biscayne Boulevard Way",
    "address2": null,
    "building": null,
    "city": "Miami",
    "company_id": "20307",
    "country": "US",
    "display": "PA.ELSER 04 110",
    "property_groups": "[]",
    "property_id_payload": "1138564",
    "latitude": "25.7714404",
    "longitude": "-80.1863962",
    "name": "PA.ELSER 04 110",
    "notes": "{}",
    "photos": "[{\"caption\":null,\"default\":true,\"id\":570569792,\"original_url\":\"https://assets.guesty.com/image/upload/v1761146079/production/67f3e2c2c3c7926782f6fd63/ofbhgqiwlz4gsfdbffzt.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/e3ed4ad0-17c0-43cc-b014-b981b13d245a.jpg\"}]",
    "reference_company_id": "0oaor5yi2gtOPMBQx5d7",
    "reference_external_property_id": "68ffe7ee75c3fa0012c65e0a",
    "reference_property_id": "68ffe7ee75c3fa0012c65e0a",
    "state": "Florida",
    "status": "inactive",
    "wifi_name": null,
    "wifi_password": null,
    "zipcode": "33132"
  },
  {
    "property_id": 1138569,
    "address1": "401 Biscayne Boulevard Way",
    "address2": null,
    "building": null,
    "city": "Miami",
    "company_id": "20307",
    "country": "US",
    "display": "PA.ELSER 04 112",
    "property_groups": "[]",
    "property_id_payload": "1138569",
    "latitude": "25.7714404",
    "longitude": "-80.1863962",
    "name": "PA.ELSER 04 112",
    "notes": "{}",
    "photos": "[{\"caption\":null,\"default\":true,\"id\":570570310,\"original_url\":\"https://assets.guesty.com/image/upload/v1761146079/production/67f3e2c2c3c7926782f6fd63/ofbhgqiwlz4gsfdbffzt.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/8df44a70-7ff8-4c5b-bb2b-da91fec80c80.jpg\"}]",
    "reference_company_id": "0oaor5yi2gtOPMBQx5d7",
    "reference_external_property_id": "68ffe7ef388847000e4825d2",
    "reference_property_id": "68ffe7ef388847000e4825d2",
    "state": "Florida",
    "status": "inactive",
    "wifi_name": null,
    "wifi_password": null,
    "zipcode": "33132"
  },
  {
    "property_id": 1138545,
    "address1": "401 Biscayne Boulevard Way",
    "address2": null,
    "building": null,
    "city": "Miami",
    "company_id": "20307",
    "country": "US",
    "display": "PA.ELSER 04 106",
    "property_groups": "[]",
    "property_id_payload": "1138545",
    "latitude": "25.7714404",
    "longitude": "-80.1863962",
    "name": "PA.ELSER 04 106",
    "notes": "{}",
    "photos": "[{\"caption\":null,\"default\":true,\"id\":570569564,\"original_url\":\"https://assets.guesty.com/image/upload/v1761146079/production/67f3e2c2c3c7926782f6fd63/ofbhgqiwlz4gsfdbffzt.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/c26afc7e-5322-45d3-bc13-9595e5011ebe.jpg\"}]",
    "reference_company_id": "0oaor5yi2gtOPMBQx5d7",
    "reference_external_property_id": "68ffe7ecacdfb20011427f5a",
    "reference_property_id": "68ffe7ecacdfb20011427f5a",
    "state": "Florida",
    "status": "inactive",
    "wifi_name": null,
    "wifi_password": null,
    "zipcode": "33132"
  },
  {
    "property_id": 1138557,
    "address1": "401 Biscayne Boulevard Way",
    "address2": null,
    "building": null,
    "city": "Miami",
    "company_id": "20307",
    "country": "US",
    "display": "PA.ELSER 04 108",
    "property_groups": "[]",
    "property_id_payload": "1138557",
    "latitude": "25.7714404",
    "longitude": "-80.1863962",
    "name": "PA.ELSER 04 108",
    "notes": "{}",
    "photos": "[{\"caption\":null,\"default\":true,\"id\":570570162,\"original_url\":\"https://assets.guesty.com/image/upload/v1761146079/production/67f3e2c2c3c7926782f6fd63/ofbhgqiwlz4gsfdbffzt.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/f34c3cbe-bd5f-44ac-91b7-de00fac76fd4.jpg\"}]",
    "reference_company_id": "0oaor5yi2gtOPMBQx5d7",
    "reference_external_property_id": "68ffe7ed75c3fa0012c65d02",
    "reference_property_id": "68ffe7ed75c3fa0012c65d02",
    "state": "Florida",
    "status": "inactive",
    "wifi_name": null,
    "wifi_password": null,
    "zipcode": "33132"
  },
  {
    "property_id": 1138550,
    "address1": "401 Biscayne Boulevard Way",
    "address2": null,
    "building": null,
    "city": "Miami",
    "company_id": "20307",
    "country": "US",
    "display": "PA.ELSER 04 107",
    "property_groups": "[]",
    "property_id_payload": "1138550",
    "latitude": "25.7714404",
    "longitude": "-80.1863962",
    "name": "PA.ELSER 04 107",
    "notes": "{}",
    "photos": "[{\"caption\":null,\"default\":true,\"id\":570569590,\"original_url\":\"https://assets.guesty.com/image/upload/v1761146079/production/67f3e2c2c3c7926782f6fd63/ofbhgqiwlz4gsfdbffzt.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/2eef3299-1d35-4391-b243-6d1bd90360a2.jpg\"}]",
    "reference_company_id": "0oaor5yi2gtOPMBQx5d7",
    "reference_external_property_id": "68ffe7ed75c3fa0012c65bfa",
    "reference_property_id": "68ffe7ed75c3fa0012c65bfa",
    "state": "Florida",
    "status": "inactive",
    "wifi_name": null,
    "wifi_password": null,
    "zipcode": "33132"
  },
  {
    "property_id": 1138558,
    "address1": "401 Biscayne Boulevard Way",
    "address2": null,
    "building": null,
    "city": "Miami",
    "company_id": "20307",
    "country": "US",
    "display": "PA.ELSER 04 109",
    "property_groups": "[]",
    "property_id_payload": "1138558",
    "latitude": "25.7714404",
    "longitude": "-80.1863962",
    "name": "PA.ELSER 04 109",
    "notes": "{}",
    "photos": "[{\"caption\":null,\"default\":true,\"id\":570569725,\"original_url\":\"https://assets.guesty.com/image/upload/v1761146079/production/67f3e2c2c3c7926782f6fd63/ofbhgqiwlz4gsfdbffzt.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/4875512b-04fb-4f67-9cc5-ac83fb32e93b.jpg\"}]",
    "reference_company_id": "0oaor5yi2gtOPMBQx5d7",
    "reference_external_property_id": "68ffe7eeacdfb20011428062",
    "reference_property_id": "68ffe7eeacdfb20011428062",
    "state": "Florida",
    "status": "inactive",
    "wifi_name": null,
    "wifi_password": null,
    "zipcode": "33132"
  },
  {
    "property_id": 1138566,
    "address1": "401 Biscayne Boulevard Way",
    "address2": null,
    "building": null,
    "city": "Miami",
    "company_id": "20307",
    "country": "US",
    "display": "PA.ELSER 04 111",
    "property_groups": "[]",
    "property_id_payload": "1138566",
    "latitude": "25.7714404",
    "longitude": "-80.1863962",
    "name": "PA.ELSER 04 111",
    "notes": "{}",
    "photos": "[{\"caption\":null,\"default\":true,\"id\":570570183,\"original_url\":\"https://assets.guesty.com/image/upload/v1761146079/production/67f3e2c2c3c7926782f6fd63/ofbhgqiwlz4gsfdbffzt.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/af732ba6-c9ae-41be-95ac-7db9c46f7ef3.jpg\"}]",
    "reference_company_id": "0oaor5yi2gtOPMBQx5d7",
    "reference_external_property_id": "68ffe7eeacdfb2001142816a",
    "reference_property_id": "68ffe7eeacdfb2001142816a",
    "state": "Florida",
    "status": "inactive",
    "wifi_name": null,
    "wifi_password": null,
    "zipcode": "33132"
  },
  {
    "property_id": 1135797,
    "address1": "401 Biscayne Boulevard Way",
    "address2": null,
    "building": null,
    "city": "Miami",
    "company_id": "20307",
    "country": "US",
    "display": "PA.ELSER 04 103",
    "property_groups": "[]",
    "property_id_payload": "1135797",
    "latitude": "25.7714404",
    "longitude": "-80.1863962",
    "name": "PA.ELSER 04 103",
    "notes": "{}",
    "photos": "[{\"caption\":null,\"default\":true,\"id\":566585338,\"original_url\":\"https://assets.guesty.com/image/upload/v1761146079/production/67f3e2c2c3c7926782f6fd63/ofbhgqiwlz4gsfdbffzt.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/f367e8e4-d8a7-411e-a7a5-39ba0c4c2ea8.jpg\"}]",
    "reference_company_id": "0oaor5yi2gtOPMBQx5d7",
    "reference_external_property_id": "68f8f47ac993880020731575",
    "reference_property_id": "68f8f47ac993880020731575",
    "state": "Florida",
    "status": "inactive",
    "wifi_name": null,
    "wifi_password": null,
    "zipcode": "33132"
  },
  {
    "property_id": 1288031,
    "address1": "485 Brickell Avenue",
    "address2": null,
    "building": "Icon",
    "city": "Miami",
    "company_id": "20307",
    "country": "US",
    "display": "Icon 4202 1",
    "property_groups": "[]",
    "property_id_payload": "1288031",
    "latitude": "25.7686625",
    "longitude": "-80.188727",
    "name": "Icon 4202 1",
    "notes": "{}",
    "photos": "[{\"caption\":null,\"default\":true,\"id\":691781620,\"original_url\":\"https://assets.guesty.com/image/upload/v1765326788/production/67f3e2c2c3c7926782f6fd63/pgwmxw0l92e9jtaeoh7f.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/942a67bf-910c-41bc-8845-0decd436a7f6.jpg\"},{\"caption\":null,\"default\":false,\"id\":691781621,\"original_url\":\"https://assets.guesty.com/image/upload/v1748906118/production/67f3e2c2c3c7926782f6fd63/dqwzbneoirofjnvchmdh.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/c2fa868b-8035-4490-9d51-a40a34db2004.jpg\"},{\"caption\":null,\"default\":false,\"id\":691781622,\"original_url\":\"https://assets.guesty.com/image/upload/v1748906119/production/67f3e2c2c3c7926782f6fd63/uol5ik9fpqwegipuieww.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/80d726c8-2c85-4321-b82d-fdb717e45dd6.jpg\"},{\"caption\":null,\"default\":false,\"id\":691781623,\"original_url\":\"https://assets.guesty.com/image/upload/v1748906118/production/67f3e2c2c3c7926782f6fd63/cbkjody5sncwqgjaxxdt.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/b9d58102-51ec-4afd-b56b-98e8f211a0ed.jpg\"},{\"caption\":null,\"default\":false,\"id\":691781625,\"original_url\":\"https://assets.guesty.com/image/upload/v1748906118/production/67f3e2c2c3c7926782f6fd63/roadotukl6a1mujolfos.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/03e37b24-1f9e-4c8c-a76b-6c5f75bd13c3.jpg\"},{\"caption\":null,\"default\":false,\"id\":691781626,\"original_url\":\"https://assets.guesty.com/image/upload/v1747853178/production/67f3e2c2c3c7926782f6fd63/li7ie9r2fvuzcmw0dae2.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/92ffe991-05ae-4b82-b42f-4bc0af845934.jpg\"},{\"caption\":null,\"default\":false,\"id\":691781627,\"original_url\":\"https://assets.guesty.com/image/upload/v1748906120/production/67f3e2c2c3c7926782f6fd63/fdlarmyjuhimasyq3p4p.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/8bdc5222-4a02-4045-aca0-2071349a999a.jpg\"},{\"caption\":null,\"default\":false,\"id\":691781628,\"original_url\":\"https://assets.guesty.com/image/upload/v1748906124/production/67f3e2c2c3c7926782f6fd63/ba8xctufq1xtvwbelobn.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/7b3ddd8d-c049-492e-9825-cb8c8143ff77.jpg\"},{\"caption\":null,\"default\":false,\"id\":691781629,\"original_url\":\"https://assets.guesty.com/image/upload/v1748906126/production/67f3e2c2c3c7926782f6fd63/bdlrqkaz9e5jvswnvmhc.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/47b59c79-a5aa-4de4-9deb-098c45f86a8d.jpg\"},{\"caption\":null,\"default\":false,\"id\":691781630,\"original_url\":\"https://assets.guesty.com/image/upload/v1748906126/production/67f3e2c2c3c7926782f6fd63/rxatqj6rfgivvmpeqfzm.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/6e78c9fe-aed5-4e27-bb2e-859c211c9c76.jpg\"},{\"caption\":null,\"default\":false,\"id\":691781631,\"original_url\":\"https://assets.guesty.com/image/upload/v1748906130/production/67f3e2c2c3c7926782f6fd63/jyjv12lwrzk3rjljz7qc.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/4303dd01-a168-4b98-9b98-2ffb634f44e6.jpg\"},{\"caption\":null,\"default\":false,\"id\":691781632,\"original_url\":\"https://assets.guesty.com/image/upload/v1748906130/production/67f3e2c2c3c7926782f6fd63/g9u3lolicqkdyot7mf2m.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/396bc87b-cc73-4599-9a56-4cb88fe7aca1.jpg\"},{\"caption\":null,\"default\":false,\"id\":691781637,\"original_url\":\"https://assets.guesty.com/image/upload/v1748906130/production/67f3e2c2c3c7926782f6fd63/wehvnwkgwui4wmcaekvy.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/f737fbb1-e3d3-47aa-a4a7-7b56a9af581f.jpg\"},{\"caption\":null,\"default\":false,\"id\":691781642,\"original_url\":\"https://assets.guesty.com/image/upload/v1748906132/production/67f3e2c2c3c7926782f6fd63/tnhfeenij3smqzx65m4c.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/d0661b1f-1c93-4388-b4e4-6c7354348776.jpg\"},{\"caption\":null,\"default\":false,\"id\":691781643,\"original_url\":\"https://assets.guesty.com/image/upload/v1748019831/production/67f3e2c2c3c7926782f6fd63/z6g4uh85gaqdoblnvb3j.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/2bc9c302-2e1e-4cb6-b0b1-bab721a48da6.jpg\"},{\"caption\":null,\"default\":false,\"id\":691781644,\"original_url\":\"https://assets.guesty.com/image/upload/v1747853178/production/67f3e2c2c3c7926782f6fd63/prb6btok8apqactztf35.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/18132b88-c06e-4b10-9562-22b8cd7c2b13.jpg\"},{\"caption\":null,\"default\":false,\"id\":691781645,\"original_url\":\"https://assets.guesty.com/image/upload/v1748019831/production/67f3e2c2c3c7926782f6fd63/zg4fcwmdjajli2o1nxqi.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/4715afb2-70ea-4a6c-be89-b64d78eff9ca.jpg\"},{\"caption\":null,\"default\":false,\"id\":691781646,\"original_url\":\"https://assets.guesty.com/image/upload/v1747853178/production/67f3e2c2c3c7926782f6fd63/hhsq7411pwuxlr6glzom.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/5e010358-90b7-4e9d-b8bc-f01be06fc5c2.jpg\"},{\"caption\":null,\"default\":false,\"id\":691781647,\"original_url\":\"https://assets.guesty.com/image/upload/v1747853178/production/67f3e2c2c3c7926782f6fd63/zbjznbgvw7xgp4jbunp9.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/f9bdd541-b4fc-459a-8f31-595d177b325f.jpg\"},{\"caption\":null,\"default\":false,\"id\":691781648,\"original_url\":\"https://assets.guesty.com/image/upload/v1747853180/production/67f3e2c2c3c7926782f6fd63/bm4bxdsmwlvivnxrzhtr.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/be54e0f2-54ea-4496-9fd7-3933f7672c30.jpg\"},{\"caption\":null,\"default\":false,\"id\":691781649,\"original_url\":\"https://assets.guesty.com/image/upload/v1747853181/production/67f3e2c2c3c7926782f6fd63/ow2ufzsgzq48quuo9e86.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/387fd7ac-ada0-420a-98dc-f56c4c498bbd.jpg\"},{\"caption\":null,\"default\":false,\"id\":691781653,\"original_url\":\"https://assets.guesty.com/image/upload/v1747853181/production/67f3e2c2c3c7926782f6fd63/k0n8khzsayy6hydgvm3j.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/09daec7c-3890-4f56-bce6-2599ed8da906.jpg\"},{\"caption\":null,\"default\":false,\"id\":691781657,\"original_url\":\"https://assets.guesty.com/image/upload/v1747853181/production/67f3e2c2c3c7926782f6fd63/funifwklgn4p5kmkq51a.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/2a601688-3234-484e-8efb-d08e33570e1a.jpg\"},{\"caption\":null,\"default\":false,\"id\":691781658,\"original_url\":\"https://assets.guesty.com/image/upload/v1747853178/production/67f3e2c2c3c7926782f6fd63/bv3am7qs0n6kulh4qcj0.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/9dbb5422-a5fc-4efc-be42-3ee642a5ecc7.jpg\"},{\"caption\":null,\"default\":false,\"id\":691781660,\"original_url\":\"https://assets.guesty.com/image/upload/v1747853182/production/67f3e2c2c3c7926782f6fd63/bjw48grmhgqylxzcc72z.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/17a000a2-b51c-4aaa-abab-410eb79bb4cc.jpg\"},{\"caption\":null,\"default\":false,\"id\":691781661,\"original_url\":\"https://assets.guesty.com/image/upload/v1747853183/production/67f3e2c2c3c7926782f6fd63/amcufilgsxm9qtwbkpit.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/0cdcf32c-75af-4add-8a8e-150033f7fe44.jpg\"},{\"caption\":null,\"default\":false,\"id\":691781662,\"original_url\":\"https://assets.guesty.com/image/upload/v1766676489/production/67f3e2c2c3c7926782f6fd63/gqrhoiannad202mxxfs2.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/c06afde6-51da-4c29-80f6-a398ef391f1e.jpg\"}]",
    "reference_company_id": "0oaor5yi2gtOPMBQx5d7",
    "reference_external_property_id": "699de5db3fed10003533dbd2",
    "reference_property_id": "699de5db3fed10003533dbd2",
    "state": "Florida",
    "status": "inactive",
    "wifi_name": null,
    "wifi_password": null,
    "zipcode": "33131"
  },
  {
    "property_id": 1009390,
    "address1": "485 Brickell Avenue",
    "address2": null,
    "building": "Icon",
    "city": "Miami",
    "company_id": "20307",
    "country": "US",
    "display": "Icon 4211",
    "property_groups": "[]",
    "property_id_payload": "1009390",
    "latitude": "25.7686625",
    "longitude": "-80.188727",
    "name": "Icon 4211",
    "notes": "{}",
    "photos": "[{\"caption\":null,\"default\":true,\"id\":439668237,\"original_url\":\"https://assets.guesty.com/image/upload/listing_images_s3/production/property-photos/37f4da83043b83939b4521da05e532826ad2c6d607c3dec7/6806b0bdc20fd00011d727f7/52df7fbf-01a0-42-J82G-\",\"url\":\"https://s3.amazonaws.com/brzw-photos/f12b55db-c3db-4114-ae43-d2876270563d.jpg\"},{\"caption\":null,\"default\":false,\"id\":439668238,\"original_url\":\"https://assets.guesty.com/image/upload/listing_images_s3/production/property-photos/37f4da83043b83939b4521da05e532826ad2c6d607c3dec7/6806b0bdc20fd00011d727f7/2bd3cf7f-7398-45-kVDgp\",\"url\":\"https://s3.amazonaws.com/brzw-photos/476eeb80-d2b5-4332-a0d1-37cf9971e02b.jpg\"},{\"caption\":null,\"default\":false,\"id\":439668239,\"original_url\":\"https://assets.guesty.com/image/upload/listing_images_s3/production/property-photos/37f4da83043b83939b4521da05e532826ad2c6d607c3dec7/6806b0bdc20fd00011d727f7/50bed360-5ec9-4b-iUlQL\",\"url\":\"https://s3.amazonaws.com/brzw-photos/71074dbe-feb9-4492-9abb-60a5c8a7a496.jpg\"},{\"caption\":null,\"default\":false,\"id\":439668240,\"original_url\":\"https://assets.guesty.com/image/upload/listing_images_s3/production/property-photos/37f4da83043b83939b4521da05e532826ad2c6d607c3dec7/6806b0bdc20fd00011d727f7/89edd054-fa2c-4b-dxpet\",\"url\":\"https://s3.amazonaws.com/brzw-photos/2d611c7b-b810-4f61-b7e7-a14b6af79589.jpg\"},{\"caption\":null,\"default\":false,\"id\":439668241,\"original_url\":\"https://assets.guesty.com/image/upload/listing_images_s3/production/property-photos/37f4da83043b83939b4521da05e532826ad2c6d607c3dec7/6806b0bdc20fd00011d727f7/b1b36922-36b7-4b-X5PVS\",\"url\":\"https://s3.amazonaws.com/brzw-photos/7d3fb49d-549a-4b2c-8715-0c885422edb8.jpg\"},{\"caption\":null,\"default\":false,\"id\":439668242,\"original_url\":\"https://assets.guesty.com/image/upload/listing_images_s3/production/property-photos/37f4da83043b83939b4521da05e532826ad2c6d607c3dec7/6806b0bdc20fd00011d727f7/8e4ee441-cf9d-45-oGkq7\",\"url\":\"https://s3.amazonaws.com/brzw-photos/d20c5510-984a-461d-9602-7820cfe2c168.jpg\"},{\"caption\":null,\"default\":false,\"id\":439668243,\"original_url\":\"https://assets.guesty.com/image/upload/listing_images_s3/production/property-photos/37f4da83043b83939b4521da05e532826ad2c6d607c3dec7/6806b0bdc20fd00011d727f7/446c140d-5b03-44-CATAl\",\"url\":\"https://s3.amazonaws.com/brzw-photos/9e181fce-6fdd-412e-9f4f-2414e7412352.jpg\"},{\"caption\":null,\"default\":false,\"id\":439668244,\"original_url\":\"https://assets.guesty.com/image/upload/listing_images_s3/production/property-photos/37f4da83043b83939b4521da05e532826ad2c6d607c3dec7/6806b0bdc20fd00011d727f7/de092281-40ab-49-Pe-Gu\",\"url\":\"https://s3.amazonaws.com/brzw-photos/70aa43ff-4999-4ebf-aa80-09ab23969806.jpg\"},{\"caption\":null,\"default\":false,\"id\":439668245,\"original_url\":\"https://assets.guesty.com/image/upload/listing_images_s3/production/property-photos/37f4da83043b83939b4521da05e532826ad2c6d607c3dec7/6806b0bdc20fd00011d727f7/fd10350e-5d64-45-xGaBE\",\"url\":\"https://s3.amazonaws.com/brzw-photos/a88351bb-1444-4ef4-9223-79d49ac5ccc7.jpg\"},{\"caption\":null,\"default\":false,\"id\":439668246,\"original_url\":\"https://assets.guesty.com/image/upload/listing_images_s3/production/property-photos/37f4da83043b83939b4521da05e532826ad2c6d607c3dec7/6806b0bdc20fd00011d727f7/f91b2a2b-8e5a-4b-YW6-L\",\"url\":\"https://s3.amazonaws.com/brzw-photos/4109359f-6aee-413e-80eb-ec04e07fdbde.jpg\"},{\"caption\":null,\"default\":false,\"id\":439668247,\"original_url\":\"https://assets.guesty.com/image/upload/listing_images_s3/production/property-photos/37f4da83043b83939b4521da05e532826ad2c6d607c3dec7/6806b0bdc20fd00011d727f7/d445c8cf-1103-4c-6qBo8\",\"url\":\"https://s3.amazonaws.com/brzw-photos/3b640857-1559-4468-880d-6f795328d263.jpg\"},{\"caption\":null,\"default\":false,\"id\":439668248,\"original_url\":\"https://assets.guesty.com/image/upload/listing_images_s3/production/property-photos/37f4da83043b83939b4521da05e532826ad2c6d607c3dec7/6806b0bdc20fd00011d727f7/d56f4b98-285e-4c-WnxiQ\",\"url\":\"https://s3.amazonaws.com/brzw-photos/49dc1163-14f8-4f0a-a566-e6903b683ec7.jpg\"}]",
    "reference_company_id": "0oaor5yi2gtOPMBQx5d7",
    "reference_external_property_id": "6806b258bdf6c0001203bd3e",
    "reference_property_id": "6806b258bdf6c0001203bd3e",
    "state": "Florida",
    "status": "inactive",
    "wifi_name": null,
    "wifi_password": null,
    "zipcode": "33131"
  },
  {
    "property_id": 1288020,
    "address1": "485 Brickell Avenue",
    "address2": null,
    "building": "Icon",
    "city": "Miami",
    "company_id": "20307",
    "country": "US",
    "display": "Icon 4405 1",
    "property_groups": "[]",
    "property_id_payload": "1288020",
    "latitude": "25.7686625",
    "longitude": "-80.188727",
    "name": "Icon 4405 1",
    "notes": "{}",
    "photos": "[{\"caption\":null,\"default\":true,\"id\":691780427,\"original_url\":\"https://assets.guesty.com/image/upload/v1765327962/production/67f3e2c2c3c7926782f6fd63/nzk8dp086y8qeaemokv7.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/f2f00e03-f33d-40ed-9a0d-7ddf9da3e246.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780428,\"original_url\":\"https://assets.guesty.com/image/upload/v1748983175/production/67f3e2c2c3c7926782f6fd63/vzqtjoh2ye2qct0zuisf.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/fdbc84cc-ffa1-4b67-8f96-b3e28330e9d5.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780429,\"original_url\":\"https://assets.guesty.com/image/upload/v1748983175/production/67f3e2c2c3c7926782f6fd63/fqzh9lpkcrgxtsdyg14g.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/bc258073-ac0e-4b8b-bf2f-be2b038dc6ca.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780430,\"original_url\":\"https://assets.guesty.com/image/upload/v1748983175/production/67f3e2c2c3c7926782f6fd63/legslocxyjbvxwvizuls.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/50ed5b50-c656-4a3a-9d0e-ccf14ba24725.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780431,\"original_url\":\"https://assets.guesty.com/image/upload/v1748983176/production/67f3e2c2c3c7926782f6fd63/mnvjxauqhqmlib2lhqsu.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/4cc2c673-6cb4-402c-928c-1b2a01b1a1b7.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780432,\"original_url\":\"https://assets.guesty.com/image/upload/v1747853308/production/67f3e2c2c3c7926782f6fd63/e7myq3e9ahhalmskufkr.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/12f3fee6-5443-470f-8fcf-a819c1a7b0c5.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780433,\"original_url\":\"https://assets.guesty.com/image/upload/v1748983175/production/67f3e2c2c3c7926782f6fd63/is2daa8je5hz3ogithdg.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/f56d0be3-00d3-43f9-81e7-f4ce08a10d30.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780434,\"original_url\":\"https://assets.guesty.com/image/upload/v1748983175/production/67f3e2c2c3c7926782f6fd63/rs8oh1rsuj9bz2agxj6x.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/2a8150af-7f00-4eb8-a248-f94355c0ca45.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780435,\"original_url\":\"https://assets.guesty.com/image/upload/v1747853312/production/67f3e2c2c3c7926782f6fd63/rwppr2pyzc54tfuhhtl1.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/5058c799-b7ea-49dd-8772-69863d8f5170.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780436,\"original_url\":\"https://assets.guesty.com/image/upload/v1748983178/production/67f3e2c2c3c7926782f6fd63/uvjiiwe3g2roam0kygvp.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/e98219ca-9039-400d-976a-2af9ae650010.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780437,\"original_url\":\"https://assets.guesty.com/image/upload/v1747853308/production/67f3e2c2c3c7926782f6fd63/bi50nga2rf34nky1vwta.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/86304c6f-3eb1-4979-b98d-a70c0bce70cf.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780438,\"original_url\":\"https://assets.guesty.com/image/upload/v1748019939/production/67f3e2c2c3c7926782f6fd63/a73ptzru3ig2pd4j8rbj.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/9084402e-19db-40fc-8020-00e40963bf10.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780439,\"original_url\":\"https://assets.guesty.com/image/upload/v1747853312/production/67f3e2c2c3c7926782f6fd63/ztksnjomdmnvd7cm9wki.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/c20ca32e-e785-41d0-8407-6d855972e65f.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780440,\"original_url\":\"https://assets.guesty.com/image/upload/v1747853309/production/67f3e2c2c3c7926782f6fd63/arpqplro6xjg0vis5oyc.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/ef326340-52f2-46a7-875c-ffb373510b39.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780441,\"original_url\":\"https://assets.guesty.com/image/upload/v1748019939/production/67f3e2c2c3c7926782f6fd63/ivb73xw3nqayjnqmx2ka.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/da50af38-e040-427b-be90-bf6aac50947d.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780442,\"original_url\":\"https://assets.guesty.com/image/upload/v1747853308/production/67f3e2c2c3c7926782f6fd63/ybn2gfyywezbwzvorft0.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/bf1ed9a9-c1c6-40d0-86ac-883726e6f9ea.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780444,\"original_url\":\"https://assets.guesty.com/image/upload/v1747853309/production/67f3e2c2c3c7926782f6fd63/ly5rs5gaidn14ato4djm.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/7c1a2806-4fb1-468d-bf7a-2c9d813a7623.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780445,\"original_url\":\"https://assets.guesty.com/image/upload/v1766439795/production/67f3e2c2c3c7926782f6fd63/mcocstsbm3u5mdizgqjb.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/85dd8431-4280-403d-b107-f6f74fe2f9fa.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780446,\"original_url\":\"https://assets.guesty.com/image/upload/v1747853312/production/67f3e2c2c3c7926782f6fd63/nbs6oklazrzd2akyrjap.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/82f96d85-9b76-445c-bd4d-57370e26886f.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780447,\"original_url\":\"https://assets.guesty.com/image/upload/v1747853314/production/67f3e2c2c3c7926782f6fd63/vggujx6efzziovmjliif.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/3af14873-bb05-498e-ae43-54264019fd5f.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780448,\"original_url\":\"https://assets.guesty.com/image/upload/v1747853314/production/67f3e2c2c3c7926782f6fd63/bvrky9jueykta782fktx.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/b5767718-c994-4102-8572-dd4e9bf285aa.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780449,\"original_url\":\"https://assets.guesty.com/image/upload/v1766439796/production/67f3e2c2c3c7926782f6fd63/h5zzoqfmy1wmr8u2l9ew.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/65882c5b-a550-498a-ac28-055d669efcc7.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780450,\"original_url\":\"https://assets.guesty.com/image/upload/v1766439797/production/67f3e2c2c3c7926782f6fd63/xvrvoomiutx4rrrmntlh.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/4118eacf-93da-402f-b3f7-959948e7620a.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780451,\"original_url\":\"https://assets.guesty.com/image/upload/v1766676731/production/67f3e2c2c3c7926782f6fd63/mgtmqbhhe7hhb2ucfyga.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/25a5b5a0-ed1c-4791-93d1-b089f4916444.jpg\"}]",
    "reference_company_id": "0oaor5yi2gtOPMBQx5d7",
    "reference_external_property_id": "699de8da3fed1000353400aa",
    "reference_property_id": "699de8da3fed1000353400aa",
    "state": "Florida",
    "status": "inactive",
    "wifi_name": null,
    "wifi_password": null,
    "zipcode": "33131"
  },
  {
    "property_id": 1288033,
    "address1": "485 Brickell Avenue",
    "address2": null,
    "building": "Icon",
    "city": "Miami",
    "company_id": "20307",
    "country": "US",
    "display": "Icon 4102 1",
    "property_groups": "[]",
    "property_id_payload": "1288033",
    "latitude": "25.7686625",
    "longitude": "-80.188727",
    "name": "Icon 4102 1",
    "notes": "{}",
    "photos": "[{\"caption\":null,\"default\":true,\"id\":691780781,\"original_url\":\"https://assets.guesty.com/image/upload/v1765326714/production/67f3e2c2c3c7926782f6fd63/ffg1sk4kzdvsfihd7hlx.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/901f0916-fe71-44e9-8eeb-9e44fc74ef02.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780782,\"original_url\":\"https://assets.guesty.com/image/upload/v1748905575/production/67f3e2c2c3c7926782f6fd63/fuxisszoqcpwrxo5rmve.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/02abe2a3-3938-465a-938b-a99cf9f23d92.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780785,\"original_url\":\"https://assets.guesty.com/image/upload/v1748905569/production/67f3e2c2c3c7926782f6fd63/w8vfacl6soo2xawcpves.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/1cd440ab-c1e0-4db8-81d5-4b709d357413.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780788,\"original_url\":\"https://assets.guesty.com/image/upload/v1748905569/production/67f3e2c2c3c7926782f6fd63/rg8q2tbbzdhv1lhb1ud1.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/36381cc2-9cbf-4bb8-b5ed-3d90fe9f47e6.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780792,\"original_url\":\"https://assets.guesty.com/image/upload/v1748905569/production/67f3e2c2c3c7926782f6fd63/vylxubw7q78xmq8vvx4b.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/683822b2-94eb-4b0e-bf72-e3d4538fc157.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780798,\"original_url\":\"https://assets.guesty.com/image/upload/v1748905570/production/67f3e2c2c3c7926782f6fd63/dhzlk73ukw9ynfp1tdhk.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/1e40aeea-779d-4452-ab10-64cd0edc8b77.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780804,\"original_url\":\"https://assets.guesty.com/image/upload/v1748905568/production/67f3e2c2c3c7926782f6fd63/rjksuhvuuupz8ecv7gt1.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/7fa4988f-7a08-4df8-b2c8-1ffd44797da0.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780816,\"original_url\":\"https://assets.guesty.com/image/upload/v1748905569/production/67f3e2c2c3c7926782f6fd63/zgxyspnsldft5cayrk3f.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/049055bf-c5af-41d2-9dd2-2443b9d1f09a.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780817,\"original_url\":\"https://assets.guesty.com/image/upload/v1747853275/production/67f3e2c2c3c7926782f6fd63/s9lwiheuvzaimjgowa8u.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/4c28fc1d-45cb-49d5-98f8-55e9cd3eda92.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780818,\"original_url\":\"https://assets.guesty.com/image/upload/v1747853274/production/67f3e2c2c3c7926782f6fd63/l3dz1hopr6caqo4hteyy.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/ee6f75bb-fe7e-4eb0-a5ed-cf554ea3319d.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780820,\"original_url\":\"https://assets.guesty.com/image/upload/v1747853274/production/67f3e2c2c3c7926782f6fd63/uqhlhu3gqlna3lpmcv5s.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/4737360a-5b75-42ce-aa2c-379b49d75c62.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780822,\"original_url\":\"https://assets.guesty.com/image/upload/v1747853278/production/67f3e2c2c3c7926782f6fd63/c3ca7laj2ivkbigf1gfy.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/60647668-2c9e-425f-aa3f-52007145f628.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780823,\"original_url\":\"https://assets.guesty.com/image/upload/v1747853274/production/67f3e2c2c3c7926782f6fd63/gv8zay3uoct3vvhblztn.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/1694f4da-128e-4ece-a3fb-2970123bb277.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780824,\"original_url\":\"https://assets.guesty.com/image/upload/v1748905573/production/67f3e2c2c3c7926782f6fd63/zxagamasc00r50smrqzn.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/5cd966bf-3f23-4429-a6cf-8a1922d002d6.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780826,\"original_url\":\"https://assets.guesty.com/image/upload/v1748905573/production/67f3e2c2c3c7926782f6fd63/lia4sjo1fmhdczlyhy2t.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/a74225d3-3c2b-43ff-abe6-2f85cc79594c.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780827,\"original_url\":\"https://assets.guesty.com/image/upload/v1748905574/production/67f3e2c2c3c7926782f6fd63/eafp6cncwosuwfmstcwy.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/e9a37a2c-30f0-46d2-8efe-f9ab443e8b1b.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780828,\"original_url\":\"https://assets.guesty.com/image/upload/v1748905574/production/67f3e2c2c3c7926782f6fd63/jvw165frjtucr6jntq5l.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/bbf92e30-0e1a-45ff-a8ad-5b204bed969e.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780829,\"original_url\":\"https://assets.guesty.com/image/upload/v1748905577/production/67f3e2c2c3c7926782f6fd63/pptmmmclbwr4hrualgag.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/b5ab437c-33e3-4f23-8bcf-c486ab169f4a.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780832,\"original_url\":\"https://assets.guesty.com/image/upload/v1747853275/production/67f3e2c2c3c7926782f6fd63/dmycgzsgnbxda4bf1xhx.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/d8207a23-6251-463e-b843-066ec89bbfea.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780833,\"original_url\":\"https://assets.guesty.com/image/upload/v1748019918/production/67f3e2c2c3c7926782f6fd63/jnix5vbpfgyednugysqh.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/5537c9b2-81d7-4aba-a52c-886051cb3545.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780834,\"original_url\":\"https://assets.guesty.com/image/upload/v1748019917/production/67f3e2c2c3c7926782f6fd63/ep89nrwtceqruoaicsrh.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/2c6f33e4-b017-4db7-8b75-557e75637731.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780836,\"original_url\":\"https://assets.guesty.com/image/upload/v1747853277/production/67f3e2c2c3c7926782f6fd63/ikrfxvghprdzpwgg5vrd.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/e6a6fe71-dbac-4a76-94e9-f8cb0ce48b29.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780837,\"original_url\":\"https://assets.guesty.com/image/upload/v1747853278/production/67f3e2c2c3c7926782f6fd63/zz2vj6ebcju5ngygnz2z.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/a164017a-4b64-4cfc-83fd-5afceaa2c527.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780838,\"original_url\":\"https://assets.guesty.com/image/upload/v1747853278/production/67f3e2c2c3c7926782f6fd63/rtcww9prxtvw7xvxe4ib.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/489f904f-a5da-4dad-a5ee-ab6e7dc39bcc.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780839,\"original_url\":\"https://assets.guesty.com/image/upload/v1747853279/production/67f3e2c2c3c7926782f6fd63/yw6sk3e6pgsq8e0c3tzw.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/9d5ba619-28aa-467b-bb44-5dfa7e68cd03.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780841,\"original_url\":\"https://assets.guesty.com/image/upload/v1747853280/production/67f3e2c2c3c7926782f6fd63/wcquni4h7xr3siuawm4o.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/44176bdd-13a6-419d-abe9-996c6db56001.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780842,\"original_url\":\"https://assets.guesty.com/image/upload/v1766676388/production/67f3e2c2c3c7926782f6fd63/k7ukfizvndcbaybeyy9p.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/08d11070-c56b-41b4-9fcc-a9dd5f104c37.jpg\"}]",
    "reference_company_id": "0oaor5yi2gtOPMBQx5d7",
    "reference_external_property_id": "699de54baf13570024659510",
    "reference_property_id": "699de54baf13570024659510",
    "state": "Florida",
    "status": "inactive",
    "wifi_name": null,
    "wifi_password": null,
    "zipcode": "33131"
  },
  {
    "property_id": 1288027,
    "address1": "485 Brickell Avenue",
    "address2": null,
    "building": "Icon",
    "city": "Miami",
    "company_id": "20307",
    "country": "US",
    "display": "Icon 4211 1",
    "property_groups": "[]",
    "property_id_payload": "1288027",
    "latitude": "25.7686625",
    "longitude": "-80.188727",
    "name": "Icon 4211 1",
    "notes": "{}",
    "photos": "[{\"caption\":null,\"default\":true,\"id\":691780296,\"original_url\":\"https://assets.guesty.com/image/upload/v1765327492/production/67f3e2c2c3c7926782f6fd63/ipekigdoq1yciqcdm6ot.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/eb6cdd18-eebb-464c-aa45-27391f2d3ceb.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780297,\"original_url\":\"https://assets.guesty.com/image/upload/v1748999656/production/67f3e2c2c3c7926782f6fd63/jpczfomf7cofudzkla9j.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/08b18767-b698-44d5-a0d2-ad5e451f3bff.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780298,\"original_url\":\"https://assets.guesty.com/image/upload/v1748999654/production/67f3e2c2c3c7926782f6fd63/iwgbltklxfl5qisvlzdv.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/31d040c7-b0b7-456c-858a-0419e6b5bf2b.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780300,\"original_url\":\"https://assets.guesty.com/image/upload/v1748999654/production/67f3e2c2c3c7926782f6fd63/hgdw7oc2ap3pqyiuzoop.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/88d33700-1e40-4bc0-af54-2268772f0f2d.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780302,\"original_url\":\"https://assets.guesty.com/image/upload/v1748999656/production/67f3e2c2c3c7926782f6fd63/ssxpyn9tcd2nfpcppt5o.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/752224e5-618a-46c0-9c23-cdfa5804b46d.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780303,\"original_url\":\"https://assets.guesty.com/image/upload/v1747853078/production/67f3e2c2c3c7926782f6fd63/iltjqeibknp5tbnn0njx.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/0f3a851b-6bdf-4b96-a6a2-ba7c42032fa4.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780305,\"original_url\":\"https://assets.guesty.com/image/upload/v1748999656/production/67f3e2c2c3c7926782f6fd63/x7dxlmljgjcwifmvwkya.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/a04e8cea-1f1c-4385-afe3-9cae163e0f29.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780306,\"original_url\":\"https://assets.guesty.com/image/upload/v1747853083/production/67f3e2c2c3c7926782f6fd63/vuwdjonby1dctkflo4vs.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/08d54b74-9174-4bda-ad82-a0330035d069.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780307,\"original_url\":\"https://assets.guesty.com/image/upload/v1748999656/production/67f3e2c2c3c7926782f6fd63/ttvrgsl8l02z9bqtrroo.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/2b41d385-9f9c-42f3-a49e-9944ec54ba90.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780309,\"original_url\":\"https://assets.guesty.com/image/upload/v1748999654/production/67f3e2c2c3c7926782f6fd63/ntwkek9j82iij2jeujrl.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/949e2feb-f8c6-4ab9-a30d-3304ef0a5e60.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780310,\"original_url\":\"https://assets.guesty.com/image/upload/v1748999654/production/67f3e2c2c3c7926782f6fd63/jxauqqp8fwdwu8dgxb6m.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/1837dc0d-8d62-4869-a5a2-75b7309f373c.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780311,\"original_url\":\"https://assets.guesty.com/image/upload/v1748999654/production/67f3e2c2c3c7926782f6fd63/ify5uwmyl8zigkhfezsk.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/da11703c-6ccd-4b75-a720-68e9c383895e.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780312,\"original_url\":\"https://assets.guesty.com/image/upload/v1748999656/production/67f3e2c2c3c7926782f6fd63/wsznj91yk9bwdhuzdj9e.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/fb63a61a-0d9d-4299-890d-da2e072e93c0.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780314,\"original_url\":\"https://assets.guesty.com/image/upload/v1748999657/production/67f3e2c2c3c7926782f6fd63/l81kzu8hwcszkn4y0jua.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/138585ab-6495-4368-a2bb-435d9ecfd81c.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780316,\"original_url\":\"https://assets.guesty.com/image/upload/v1748999658/production/67f3e2c2c3c7926782f6fd63/tpiv88xioqqc55cbu6np.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/61f18d55-5e22-43a7-bcc3-4a528a08f90d.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780317,\"original_url\":\"https://assets.guesty.com/image/upload/v1748999658/production/67f3e2c2c3c7926782f6fd63/iqnlgdvyxdqodlt4kur3.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/afb21a28-e2d0-4199-ac49-ba5df370902b.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780318,\"original_url\":\"https://assets.guesty.com/image/upload/v1748999658/production/67f3e2c2c3c7926782f6fd63/veilontykpwjzswujpss.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/8ffaae7a-bce6-41cb-be54-752985fd3467.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780319,\"original_url\":\"https://assets.guesty.com/image/upload/v1747853079/production/67f3e2c2c3c7926782f6fd63/vfkzobgi7pxv1fnh2lap.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/6f8b640f-a493-47d6-9d22-abbed5730b1d.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780321,\"original_url\":\"https://assets.guesty.com/image/upload/v1748999658/production/67f3e2c2c3c7926782f6fd63/hnqfcmns5apzqphfwc4w.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/10376ab1-83af-4251-a387-ddffcf9f86f3.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780322,\"original_url\":\"https://assets.guesty.com/image/upload/v1748019795/production/67f3e2c2c3c7926782f6fd63/ywoxuqxgswr3j8nxvmmg.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/2e9a9df1-2b61-45f0-b82b-0e9a379bc70a.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780323,\"original_url\":\"https://assets.guesty.com/image/upload/v1748019796/production/67f3e2c2c3c7926782f6fd63/yxky30wcvjdxakvbffeq.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/afb56707-1f3a-4520-9490-f4685c95906f.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780325,\"original_url\":\"https://assets.guesty.com/image/upload/v1747853091/production/67f3e2c2c3c7926782f6fd63/i9izpdmapslwx26evswl.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/5fc36c99-cf8f-4fbf-914a-af2a4fd343b0.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780326,\"original_url\":\"https://assets.guesty.com/image/upload/v1747853092/production/67f3e2c2c3c7926782f6fd63/fhpnoanras3mfwwgt6nq.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/a97ec020-5829-4b56-b066-2ca572e7088f.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780339,\"original_url\":\"https://assets.guesty.com/image/upload/v1747853079/production/67f3e2c2c3c7926782f6fd63/bnpwb169raamrkv4ihd9.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/88d0b2c9-0cc0-4326-9a76-984a09caa17e.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780342,\"original_url\":\"https://assets.guesty.com/image/upload/v1747853086/production/67f3e2c2c3c7926782f6fd63/mtllqcg1v9i9s8rkmhj4.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/846fc8e6-1380-48a6-bc20-ecbf90f36432.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780343,\"original_url\":\"https://assets.guesty.com/image/upload/v1747853082/production/67f3e2c2c3c7926782f6fd63/ow1c3kfdrf2p8ykwjt84.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/b7963f96-76ae-406f-9a76-0b70516a9a1c.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780345,\"original_url\":\"https://assets.guesty.com/image/upload/v1747853088/production/67f3e2c2c3c7926782f6fd63/lwkfcvcesksgpids3zsu.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/3641489e-bd9d-4467-b904-db54d100ef5e.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780346,\"original_url\":\"https://assets.guesty.com/image/upload/v1747853097/production/67f3e2c2c3c7926782f6fd63/pum5ovic6ykhtilcoho5.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/7d48b753-eccf-4fba-82c5-6155598f91aa.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780347,\"original_url\":\"https://assets.guesty.com/image/upload/v1747853086/production/67f3e2c2c3c7926782f6fd63/zcljhu6nqmqvcjw0noib.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/e7db5c98-4ab8-44bc-920e-a23061762389.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780349,\"original_url\":\"https://assets.guesty.com/image/upload/v1766676591/production/67f3e2c2c3c7926782f6fd63/pdm0s8oq9nkn09qrcjar.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/b9bc6d97-2248-4685-b3d7-b2100f79d285.jpg\"}]",
    "reference_company_id": "0oaor5yi2gtOPMBQx5d7",
    "reference_external_property_id": "699de709af1357002465ad55",
    "reference_property_id": "699de709af1357002465ad55",
    "state": "Florida",
    "status": "inactive",
    "wifi_name": null,
    "wifi_password": null,
    "zipcode": "33131"
  },
  {
    "property_id": 1288032,
    "address1": "485 Brickell Avenue",
    "address2": null,
    "building": "Icon",
    "city": "Miami",
    "company_id": "20307",
    "country": "US",
    "display": "Icon 4107 1",
    "property_groups": "[]",
    "property_id_payload": "1288032",
    "latitude": "25.7686625",
    "longitude": "-80.188727",
    "name": "Icon 4107 1",
    "notes": "{}",
    "photos": "[{\"caption\":null,\"default\":true,\"id\":691781795,\"original_url\":\"https://assets.guesty.com/image/upload/v1765325801/production/67f3e2c2c3c7926782f6fd63/tqgfnthywoacin1zljld.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/b523e523-fdaf-43a3-ab55-9b87f383aff2.jpg\"},{\"caption\":null,\"default\":false,\"id\":691781800,\"original_url\":\"https://assets.guesty.com/image/upload/v1748993876/production/67f3e2c2c3c7926782f6fd63/qzoogl8gy7acpvfa9jzh.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/3d463970-9f6e-4d55-846d-73fc79b28937.jpg\"},{\"caption\":null,\"default\":false,\"id\":691781801,\"original_url\":\"https://assets.guesty.com/image/upload/v1748993878/production/67f3e2c2c3c7926782f6fd63/og1gcgzkor0b0pjwkggk.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/0c6d5915-208f-47ae-b5e7-b97271a52d53.jpg\"},{\"caption\":null,\"default\":false,\"id\":691781802,\"original_url\":\"https://assets.guesty.com/image/upload/v1748993881/production/67f3e2c2c3c7926782f6fd63/m0gvkudwyh2nmscm6bme.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/39455f94-54eb-4cf7-8aa8-c404a14e4613.jpg\"},{\"caption\":null,\"default\":false,\"id\":691781803,\"original_url\":\"https://assets.guesty.com/image/upload/v1747853059/production/67f3e2c2c3c7926782f6fd63/ovouqlfpvqlbyyof2sa2.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/9ad9e73a-41b3-44ee-82ac-31521a7a6e0c.jpg\"},{\"caption\":null,\"default\":false,\"id\":691781804,\"original_url\":\"https://assets.guesty.com/image/upload/v1748993876/production/67f3e2c2c3c7926782f6fd63/rpca250pu5bbvdyasavk.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/bf66bc2b-4d4a-490c-ae2c-a6e8270881fd.jpg\"},{\"caption\":null,\"default\":false,\"id\":691781805,\"original_url\":\"https://assets.guesty.com/image/upload/v1748993876/production/67f3e2c2c3c7926782f6fd63/myns4jweudqgdznmrdym.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/f8337af0-8bc7-49d5-ac30-c5b9f411b33f.jpg\"},{\"caption\":null,\"default\":false,\"id\":691781806,\"original_url\":\"https://assets.guesty.com/image/upload/v1748993876/production/67f3e2c2c3c7926782f6fd63/yqd0gvunltwl7yhutlvw.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/6c6e409f-57e4-46b6-8486-d5bcf4869324.jpg\"},{\"caption\":null,\"default\":false,\"id\":691781808,\"original_url\":\"https://assets.guesty.com/image/upload/v1747853064/production/67f3e2c2c3c7926782f6fd63/wdkzkgwy3zzsdvunxjpe.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/be6e4291-43b1-4b2b-ba35-4eb2fcefe9bc.jpg\"},{\"caption\":null,\"default\":false,\"id\":691781809,\"original_url\":\"https://assets.guesty.com/image/upload/v1747853071/production/67f3e2c2c3c7926782f6fd63/uluqcstwki4ruzdsbcqq.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/2a4dce38-35f4-41f2-b0fa-7ac2d298c096.jpg\"},{\"caption\":null,\"default\":false,\"id\":691781810,\"original_url\":\"https://assets.guesty.com/image/upload/v1748993882/production/67f3e2c2c3c7926782f6fd63/maqq5r8czm4ckudliquj.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/4a3188c0-6184-4e73-895a-d7e4932e52b4.jpg\"},{\"caption\":null,\"default\":false,\"id\":691781815,\"original_url\":\"https://assets.guesty.com/image/upload/v1748993876/production/67f3e2c2c3c7926782f6fd63/pb4ot7l64k2sizulyz8t.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/30ab2bb6-0016-4a39-af46-9ee7a150406f.jpg\"},{\"caption\":null,\"default\":false,\"id\":691781816,\"original_url\":\"https://assets.guesty.com/image/upload/v1748993882/production/67f3e2c2c3c7926782f6fd63/nm5aglyhbywn9bjburui.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/9a3ecccf-f6fa-40ad-8133-0eb46d2efd59.jpg\"},{\"caption\":null,\"default\":false,\"id\":691781817,\"original_url\":\"https://assets.guesty.com/image/upload/v1748993883/production/67f3e2c2c3c7926782f6fd63/zfxvsgne7ynfm5no25rw.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/c7ebde91-504d-42fe-b5f3-029bae6db7e3.jpg\"},{\"caption\":null,\"default\":false,\"id\":691781819,\"original_url\":\"https://assets.guesty.com/image/upload/v1748993882/production/67f3e2c2c3c7926782f6fd63/liupdygpeu76gscxmffo.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/90587146-0d1a-4d9f-a43a-d454c192cc5a.jpg\"},{\"caption\":null,\"default\":false,\"id\":691781820,\"original_url\":\"https://assets.guesty.com/image/upload/v1748019775/production/67f3e2c2c3c7926782f6fd63/u0iumwbef2j2kjtdbxyv.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/e84da6b7-6927-4c25-a852-c6b8d429e68b.jpg\"},{\"caption\":null,\"default\":false,\"id\":691781822,\"original_url\":\"https://assets.guesty.com/image/upload/v1748019775/production/67f3e2c2c3c7926782f6fd63/dev1pdg7qv0hgy7ceaxg.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/d16b0e9f-8b95-4511-bbc6-13645890c75a.jpg\"},{\"caption\":null,\"default\":false,\"id\":691781823,\"original_url\":\"https://assets.guesty.com/image/upload/v1747853059/production/67f3e2c2c3c7926782f6fd63/ofpk6qyjtjpaciezkah6.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/3c26ca85-bd16-4493-baa0-f43e5f99076d.jpg\"},{\"caption\":null,\"default\":false,\"id\":691781824,\"original_url\":\"https://assets.guesty.com/image/upload/v1747853059/production/67f3e2c2c3c7926782f6fd63/dbdpbvmpdwbcfw5fzw7w.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/bae72fb7-7d74-40a4-bb76-893309a2e476.jpg\"},{\"caption\":null,\"default\":false,\"id\":691781825,\"original_url\":\"https://assets.guesty.com/image/upload/v1747853059/production/67f3e2c2c3c7926782f6fd63/hyljrl6tdsexo2gqufek.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/8dc5cf7f-c3f0-4961-9b00-b2ecfb344aca.jpg\"},{\"caption\":null,\"default\":false,\"id\":691781826,\"original_url\":\"https://assets.guesty.com/image/upload/v1747853067/production/67f3e2c2c3c7926782f6fd63/qgqpjmzk676wd7aalwvf.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/0c52f0c7-d08d-4ef7-9055-7031a09d21f8.jpg\"},{\"caption\":null,\"default\":false,\"id\":691781827,\"original_url\":\"https://assets.guesty.com/image/upload/v1747853068/production/67f3e2c2c3c7926782f6fd63/bqvezz64dirc6sk7rw8k.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/0d4e2bc5-6047-455e-a267-a349dd3e348a.jpg\"},{\"caption\":null,\"default\":false,\"id\":691781828,\"original_url\":\"https://assets.guesty.com/image/upload/v1747853071/production/67f3e2c2c3c7926782f6fd63/c5zvsskyatu39dgbemxx.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/d01ebc71-4db2-4f85-b356-fd181953c20c.jpg\"},{\"caption\":null,\"default\":false,\"id\":691781829,\"original_url\":\"https://assets.guesty.com/image/upload/v1747853067/production/67f3e2c2c3c7926782f6fd63/v02mlznban9hjgaurpir.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/8adedfe4-1b45-4ae0-8598-c0a3faba62a9.jpg\"},{\"caption\":null,\"default\":false,\"id\":691781830,\"original_url\":\"https://assets.guesty.com/image/upload/v1766676458/production/67f3e2c2c3c7926782f6fd63/o9xzjyds4rgsxt1fptya.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/26dd2d4f-84cb-431c-9c28-b0b822a569a9.jpg\"}]",
    "reference_company_id": "0oaor5yi2gtOPMBQx5d7",
    "reference_external_property_id": "699de5a7af13570024659d00",
    "reference_property_id": "699de5a7af13570024659d00",
    "state": "Florida",
    "status": "inactive",
    "wifi_name": null,
    "wifi_password": null,
    "zipcode": "33131"
  },
  {
    "property_id": 1288023,
    "address1": "485 Brickell Avenue",
    "address2": null,
    "building": "Icon",
    "city": "Miami",
    "company_id": "20307",
    "country": "US",
    "display": "Icon 4310 1",
    "property_groups": "[]",
    "property_id_payload": "1288023",
    "latitude": "25.7686625",
    "longitude": "-80.188727",
    "name": "Icon 4310 1",
    "notes": "{}",
    "photos": "[{\"caption\":null,\"default\":true,\"id\":691780288,\"original_url\":\"https://assets.guesty.com/image/upload/v1765327278/production/67f3e2c2c3c7926782f6fd63/py7y1uvvfdpoalb0bi4f.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/d0fb7a80-27d1-4a13-bec4-2da70c289a3f.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780289,\"original_url\":\"https://assets.guesty.com/image/upload/v1750259281/production/67f3e2c2c3c7926782f6fd63/vgwql2mtavxdztjbt7eu.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/be239127-5dff-47d2-b934-9744c579c6ab.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780290,\"original_url\":\"https://assets.guesty.com/image/upload/v1750259284/production/67f3e2c2c3c7926782f6fd63/w0nr8eflqdrbuc17kht2.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/6ef829c0-4088-41ef-bd88-03758fd6aae5.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780294,\"original_url\":\"https://assets.guesty.com/image/upload/v1750259286/production/67f3e2c2c3c7926782f6fd63/jdyuanmypibl6fncyoc5.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/7b3029aa-d720-48bb-a0a4-33e3f33f3ee2.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780295,\"original_url\":\"https://assets.guesty.com/image/upload/v1750259300/production/67f3e2c2c3c7926782f6fd63/kl3757im7nrpuf189jjk.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/2d6a8625-0ecf-4498-99b0-f96f0b2688a3.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780299,\"original_url\":\"https://assets.guesty.com/image/upload/v1750260239/production/67f3e2c2c3c7926782f6fd63/v4judkujb00xjarpw768.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/b3cd80a9-1295-4288-b263-a53dc389cb24.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780301,\"original_url\":\"https://assets.guesty.com/image/upload/v1750260236/production/67f3e2c2c3c7926782f6fd63/aamwbemphajqxrlkke9m.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/cb105eed-fb0c-4822-b10f-b2d0a57fc72e.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780304,\"original_url\":\"https://assets.guesty.com/image/upload/v1750259273/production/67f3e2c2c3c7926782f6fd63/ysvw4bitmocr6cntisbf.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/7efb26d8-eabf-48ac-8ebc-f91c7bb9f685.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780308,\"original_url\":\"https://assets.guesty.com/image/upload/v1750259277/production/67f3e2c2c3c7926782f6fd63/fje6wkjzpy0w8xkofzjd.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/51c99d85-2d70-4899-92c3-920c34383bdb.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780313,\"original_url\":\"https://assets.guesty.com/image/upload/v1750259283/production/67f3e2c2c3c7926782f6fd63/mvjnywqnwbemfrcwxnrt.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/45ea392c-b50d-4e58-9197-fb4796b8ca6f.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780315,\"original_url\":\"https://assets.guesty.com/image/upload/v1750259283/production/67f3e2c2c3c7926782f6fd63/qocptmjg8dnx3ata712y.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/68cc5dc6-ad8e-484f-9e38-70f7f126df9c.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780320,\"original_url\":\"https://assets.guesty.com/image/upload/v1750259285/production/67f3e2c2c3c7926782f6fd63/zwrlwihmwxobtgkwhyna.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/d7c67d84-c8e4-451e-8ac9-547abbb509f0.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780324,\"original_url\":\"https://assets.guesty.com/image/upload/v1750259288/production/67f3e2c2c3c7926782f6fd63/kizowan3bziorwc2fg23.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/3cbd9d48-1e8f-445a-82b9-c6b8ca8ce295.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780327,\"original_url\":\"https://assets.guesty.com/image/upload/v1750259288/production/67f3e2c2c3c7926782f6fd63/xh5mhwoy6tgboxcijv5t.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/c59d045c-2f7f-4964-94f2-f8377b9e0256.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780328,\"original_url\":\"https://assets.guesty.com/image/upload/v1750259289/production/67f3e2c2c3c7926782f6fd63/biqqgwyzhbolxnfiackv.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/f66ed6cd-6f63-4cda-ac32-4c325f9395de.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780329,\"original_url\":\"https://assets.guesty.com/image/upload/v1750259289/production/67f3e2c2c3c7926782f6fd63/enldl2ajehqaic7va5sn.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/7c8b19b1-81eb-4c57-8be2-c5db11fb984c.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780330,\"original_url\":\"https://assets.guesty.com/image/upload/v1750259290/production/67f3e2c2c3c7926782f6fd63/zdqqb2fk8l5fbwtm7ooa.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/e8a4adb0-19a0-4779-9768-f8a278f5ddc9.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780331,\"original_url\":\"https://assets.guesty.com/image/upload/v1750259293/production/67f3e2c2c3c7926782f6fd63/uw4yqk8wztppsswr2lgr.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/56825e6c-7613-4fcf-b57b-f2c5afcaf22a.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780332,\"original_url\":\"https://assets.guesty.com/image/upload/v1750259292/production/67f3e2c2c3c7926782f6fd63/miwo6ipalozcths496pw.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/bdc7944c-51b8-4031-8e15-554953554058.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780333,\"original_url\":\"https://assets.guesty.com/image/upload/v1750259294/production/67f3e2c2c3c7926782f6fd63/folm7dxuojjrfuunz1ic.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/1f38178b-b5c8-4216-86e0-8643a3de0184.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780334,\"original_url\":\"https://assets.guesty.com/image/upload/v1750259291/production/67f3e2c2c3c7926782f6fd63/cvovggzu7z7g44gfxuub.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/5e46adf3-731e-41ae-80f7-fe479cb11ffc.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780335,\"original_url\":\"https://assets.guesty.com/image/upload/v1750259293/production/67f3e2c2c3c7926782f6fd63/fpswbaeftlcy36dkoixs.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/f5c9fa5a-50ac-4bc3-9928-42e1da8dd693.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780336,\"original_url\":\"https://assets.guesty.com/image/upload/v1750259295/production/67f3e2c2c3c7926782f6fd63/fmpyy36gjc9cc8urs9nt.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/1f5b8bfb-4b82-442b-b3fa-c072c7427979.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780337,\"original_url\":\"https://assets.guesty.com/image/upload/v1750259295/production/67f3e2c2c3c7926782f6fd63/s9p2ot87fnjpgvz3k8f8.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/416c1de8-7687-44e5-99ce-1112256c212c.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780338,\"original_url\":\"https://assets.guesty.com/image/upload/v1750259296/production/67f3e2c2c3c7926782f6fd63/tnb0tkuuifl4dudghonm.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/42417f3b-be3e-4ea7-8b65-8bd943afd30a.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780344,\"original_url\":\"https://assets.guesty.com/image/upload/v1750259295/production/67f3e2c2c3c7926782f6fd63/eqda70i0nob1jhejvqyk.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/697bdefd-71ab-49f2-8736-4771e91e34d4.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780348,\"original_url\":\"https://assets.guesty.com/image/upload/v1750259297/production/67f3e2c2c3c7926782f6fd63/bhe5fknhanow28pmthyw.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/1d4f4012-0181-48e2-8d5c-8881d8c6a2ae.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780350,\"original_url\":\"https://assets.guesty.com/image/upload/v1750259302/production/67f3e2c2c3c7926782f6fd63/qxsyraozhpfwukslvqp5.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/9b12132e-e90c-4985-b779-b7f3293408f1.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780352,\"original_url\":\"https://assets.guesty.com/image/upload/v1750260228/production/67f3e2c2c3c7926782f6fd63/is8wjhgjejaqudadvrt1.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/bcd3ac1e-617b-48f6-a842-ca0fe8432306.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780355,\"original_url\":\"https://assets.guesty.com/image/upload/v1750260231/production/67f3e2c2c3c7926782f6fd63/zvqtzp3s0sknwrbtkmlv.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/e89f6b7c-b3aa-4675-b533-fc0cb68aecea.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780356,\"original_url\":\"https://assets.guesty.com/image/upload/v1750260241/production/67f3e2c2c3c7926782f6fd63/ocrqwi24lx2qc7nu9a3i.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/5f3ccde7-a8d5-4aa6-beee-a42ecca79216.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780357,\"original_url\":\"https://assets.guesty.com/image/upload/v1750260230/production/67f3e2c2c3c7926782f6fd63/ltque37xizjvursm8uq7.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/294ff018-1dca-448b-9201-b88dfe08c6d8.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780358,\"original_url\":\"https://assets.guesty.com/image/upload/v1750260238/production/67f3e2c2c3c7926782f6fd63/z6neijh9onu38r7vq0fy.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/d18e9f5f-d2c5-4481-b4c4-2609f4fe0db9.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780359,\"original_url\":\"https://assets.guesty.com/image/upload/v1750260232/production/67f3e2c2c3c7926782f6fd63/drtnkff9hvgf6znqxlot.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/476eabe9-5f84-4ee5-b4ea-f273d3117b5e.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780360,\"original_url\":\"https://assets.guesty.com/image/upload/v1750260233/production/67f3e2c2c3c7926782f6fd63/xvzeocx5kexuur7zy79w.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/b52dd0fc-08d8-4ce4-b334-d32a16453a3b.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780361,\"original_url\":\"https://assets.guesty.com/image/upload/v1750260237/production/67f3e2c2c3c7926782f6fd63/vkg64b7xa4m3k2tswhfr.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/ce98a469-10a8-4d90-8eb5-a6d4eae9c3c1.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780362,\"original_url\":\"https://assets.guesty.com/image/upload/v1750260237/production/67f3e2c2c3c7926782f6fd63/vkli0fdaddek3evnwk8f.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/0d8ce32e-d900-4f4b-bf64-42eace7b3f47.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780363,\"original_url\":\"https://assets.guesty.com/image/upload/v1750260231/production/67f3e2c2c3c7926782f6fd63/l3pnohr0xomjanhpmv2y.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/1032c464-c65a-49fc-85cb-0b21fac29eaf.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780364,\"original_url\":\"https://assets.guesty.com/image/upload/v1750260237/production/67f3e2c2c3c7926782f6fd63/bvmzv5lzgr5xn7cgov6h.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/97c7e1b0-74b4-4bbe-b637-75fa0b6e0d06.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780365,\"original_url\":\"https://assets.guesty.com/image/upload/v1766676654/production/67f3e2c2c3c7926782f6fd63/q1fzd81dtsanumkifkwu.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/e0e80a41-486e-4ce8-9f12-3f9778ed4ea4.jpg\"}]",
    "reference_company_id": "0oaor5yi2gtOPMBQx5d7",
    "reference_external_property_id": "699de84223b533002da476ed",
    "reference_property_id": "699de84223b533002da476ed",
    "state": "Florida",
    "status": "inactive",
    "wifi_name": null,
    "wifi_password": null,
    "zipcode": "33131"
  },
  {
    "property_id": 1288025,
    "address1": "485 Brickell Avenue",
    "address2": null,
    "building": "Icon",
    "city": "Miami",
    "company_id": "20307",
    "country": "US",
    "display": "Icon 4307 1",
    "property_groups": "[]",
    "property_id_payload": "1288025",
    "latitude": "25.7686625",
    "longitude": "-80.188727",
    "name": "Icon 4307 1",
    "notes": "{}",
    "photos": "[{\"caption\":null,\"default\":true,\"id\":691780577,\"original_url\":\"https://assets.guesty.com/image/upload/v1765325933/production/67f3e2c2c3c7926782f6fd63/rqquygchj5yr9sc3cjaj.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/ba5bdc45-3403-466a-91d9-5d11587cb8fb.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780578,\"original_url\":\"https://assets.guesty.com/image/upload/v1754933111/production/67f3e2c2c3c7926782f6fd63/n7wnar4lhwyaz3nd8pfm.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/f8e701b2-d068-4186-bacb-a6c04b5aaa68.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780579,\"original_url\":\"https://assets.guesty.com/image/upload/v1748994444/production/67f3e2c2c3c7926782f6fd63/kebpdmgs37mlm9ysemq2.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/d25180e0-1161-4d54-a5a1-9e290484b305.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780580,\"original_url\":\"https://assets.guesty.com/image/upload/v1754933193/production/67f3e2c2c3c7926782f6fd63/zumfvy9ndwluuyxmeygg.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/f8f4c9db-4f69-40b6-a7de-a34006ad12c8.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780581,\"original_url\":\"https://assets.guesty.com/image/upload/v1748994445/production/67f3e2c2c3c7926782f6fd63/cjlxk41kp30f2t2yidbk.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/ab169150-3a57-44b9-bae0-56b65544f5d5.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780582,\"original_url\":\"https://assets.guesty.com/image/upload/v1748994438/production/67f3e2c2c3c7926782f6fd63/k2mgo7gwp6xn4fa6nxjd.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/a217f3fa-0f95-4a96-9eef-9c16bc6f6cb4.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780583,\"original_url\":\"https://assets.guesty.com/image/upload/v1748994439/production/67f3e2c2c3c7926782f6fd63/vhmogfz5r5fyjp9radhl.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/5b7d4388-eda4-4338-a111-3539ae373ecb.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780584,\"original_url\":\"https://assets.guesty.com/image/upload/v1748994443/production/67f3e2c2c3c7926782f6fd63/oukeaf5hd2kbitrsg7be.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/e39d7550-677a-44fb-b8d4-46bdb6c3a879.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780585,\"original_url\":\"https://assets.guesty.com/image/upload/v1748994445/production/67f3e2c2c3c7926782f6fd63/jzek1uxargnni7ocs9g0.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/9ede8bf1-6989-4004-893b-aec5b6473651.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780586,\"original_url\":\"https://assets.guesty.com/image/upload/v1747853059/production/67f3e2c2c3c7926782f6fd63/ovouqlfpvqlbyyof2sa2.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/69b089a0-9582-44f0-a38c-5be7c6e9969f.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780587,\"original_url\":\"https://assets.guesty.com/image/upload/v1747853064/production/67f3e2c2c3c7926782f6fd63/wdkzkgwy3zzsdvunxjpe.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/4e29a6e6-5f41-4cbf-a219-7fe90d2e37ab.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780588,\"original_url\":\"https://assets.guesty.com/image/upload/v1748994438/production/67f3e2c2c3c7926782f6fd63/lafvow3psoetxzrmdm87.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/a2a719d9-0552-479f-b49d-ebede4a3e709.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780590,\"original_url\":\"https://assets.guesty.com/image/upload/v1754933110/production/67f3e2c2c3c7926782f6fd63/kzitij19sjivhq4ivsoa.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/6e2f1c9a-6c99-4382-acc8-35048c6ef09c.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780592,\"original_url\":\"https://assets.guesty.com/image/upload/v1748994440/production/67f3e2c2c3c7926782f6fd63/b3jtul4jszx9mghx3vjh.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/3e6abb83-630a-4b4d-a572-c6c4d0bfe249.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780593,\"original_url\":\"https://assets.guesty.com/image/upload/v1748994438/production/67f3e2c2c3c7926782f6fd63/naourbmeeistjbb1lcxr.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/093f3287-79de-4a41-851d-b025290cf185.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780595,\"original_url\":\"https://assets.guesty.com/image/upload/v1748994438/production/67f3e2c2c3c7926782f6fd63/lqfld4gyrbqsvmzjet5d.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/96180b32-3a17-45c0-b1b3-0dc502644934.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780596,\"original_url\":\"https://assets.guesty.com/image/upload/v1747853071/production/67f3e2c2c3c7926782f6fd63/uluqcstwki4ruzdsbcqq.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/d247f9b8-4354-40a9-92e4-3fd73e280c45.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780597,\"original_url\":\"https://assets.guesty.com/image/upload/v1748019775/production/67f3e2c2c3c7926782f6fd63/u0iumwbef2j2kjtdbxyv.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/22332741-1222-47b4-a228-7d84518920f0.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780598,\"original_url\":\"https://assets.guesty.com/image/upload/v1747853059/production/67f3e2c2c3c7926782f6fd63/ofpk6qyjtjpaciezkah6.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/3f2a3a36-641d-4a4a-abb5-2ee76759362f.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780599,\"original_url\":\"https://assets.guesty.com/image/upload/v1748019775/production/67f3e2c2c3c7926782f6fd63/dev1pdg7qv0hgy7ceaxg.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/a9ba8b63-8d9f-408f-80eb-1d290d440ee4.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780600,\"original_url\":\"https://assets.guesty.com/image/upload/v1747853059/production/67f3e2c2c3c7926782f6fd63/hyljrl6tdsexo2gqufek.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/184954bf-fcaa-4e71-8180-c189c2cd8c8b.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780601,\"original_url\":\"https://assets.guesty.com/image/upload/v1747853059/production/67f3e2c2c3c7926782f6fd63/dbdpbvmpdwbcfw5fzw7w.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/c2e44dfd-a346-4d14-aa8b-b7d1944fc1a3.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780602,\"original_url\":\"https://assets.guesty.com/image/upload/v1747853067/production/67f3e2c2c3c7926782f6fd63/v02mlznban9hjgaurpir.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/b3d77f16-500a-483e-9eec-bde62e7be21e.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780603,\"original_url\":\"https://assets.guesty.com/image/upload/v1747853067/production/67f3e2c2c3c7926782f6fd63/qgqpjmzk676wd7aalwvf.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/27f11a2c-a6bf-4207-99bf-891b31dfaadd.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780604,\"original_url\":\"https://assets.guesty.com/image/upload/v1747853068/production/67f3e2c2c3c7926782f6fd63/bqvezz64dirc6sk7rw8k.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/8422cdab-8132-4156-90ed-d14038fe7ace.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780605,\"original_url\":\"https://assets.guesty.com/image/upload/v1747853071/production/67f3e2c2c3c7926782f6fd63/c5zvsskyatu39dgbemxx.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/b462d224-b81f-4053-8aca-117aea3fd1c0.jpg\"},{\"caption\":null,\"default\":false,\"id\":691780606,\"original_url\":\"https://assets.guesty.com/image/upload/v1766676620/production/67f3e2c2c3c7926782f6fd63/gpsq8rkyjx7choeg502j.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/760eb840-7901-4cf6-918d-0d36b1ab9d9c.jpg\"}]",
    "reference_company_id": "0oaor5yi2gtOPMBQx5d7",
    "reference_external_property_id": "699de7f222a2e8003209b9bf",
    "reference_property_id": "699de7f222a2e8003209b9bf",
    "state": "Florida",
    "status": "inactive",
    "wifi_name": null,
    "wifi_password": null,
    "zipcode": "33131"
  },
  {
    "property_id": 1009440,
    "address1": "485 Brickell Avenue",
    "address2": null,
    "building": null,
    "city": "Miami",
    "company_id": "20307",
    "country": "US",
    "display": "#N/A",
    "property_groups": "[]",
    "property_id_payload": "1009440",
    "latitude": "25.7686625",
    "longitude": "-80.188727",
    "name": "#N/A",
    "notes": "{}",
    "photos": "[{\"caption\":null,\"default\":true,\"id\":439669423,\"original_url\":\"https://assets.guesty.com/image/upload/listing_images_s3/production/property-photos/37f4da83043b83939b4521da05e532826ad2c6d607c3dec7/6806b1c80799d400120bd8ad/ea7f618f-f3dc-43-xuvoC\",\"url\":\"https://s3.amazonaws.com/brzw-photos/b9eb70f2-4fe1-41b3-ba7a-a71d5fac4e41.jpg\"},{\"caption\":null,\"default\":false,\"id\":439669424,\"original_url\":\"https://assets.guesty.com/image/upload/listing_images_s3/production/property-photos/37f4da83043b83939b4521da05e532826ad2c6d607c3dec7/6806b1c80799d400120bd8ad/55b7eebf-1c61-4f-9_CTf\",\"url\":\"https://s3.amazonaws.com/brzw-photos/482a8ff0-a742-47ce-8e84-3ff6723e90b3.jpg\"},{\"caption\":null,\"default\":false,\"id\":439669425,\"original_url\":\"https://assets.guesty.com/image/upload/listing_images_s3/production/property-photos/37f4da83043b83939b4521da05e532826ad2c6d607c3dec7/6806b1c80799d400120bd8ad/b6247099-691c-4d-SgQgO\",\"url\":\"https://s3.amazonaws.com/brzw-photos/22c34a21-4fe2-45b5-9916-aa0c7f2f27fc.jpg\"},{\"caption\":null,\"default\":false,\"id\":439669426,\"original_url\":\"https://assets.guesty.com/image/upload/listing_images_s3/production/property-photos/37f4da83043b83939b4521da05e532826ad2c6d607c3dec7/6806b1c80799d400120bd8ad/5e14cf66-3063-4a-rXAvy\",\"url\":\"https://s3.amazonaws.com/brzw-photos/30dfe1dd-e45e-4fd6-a9ca-77bce67212bd.jpg\"},{\"caption\":null,\"default\":false,\"id\":439669427,\"original_url\":\"https://assets.guesty.com/image/upload/listing_images_s3/production/property-photos/37f4da83043b83939b4521da05e532826ad2c6d607c3dec7/6806b1c80799d400120bd8ad/25a11941-bf46-47-esECc\",\"url\":\"https://s3.amazonaws.com/brzw-photos/ba399b5d-7f10-4722-9629-2a456aa6c6d5.jpg\"},{\"caption\":null,\"default\":false,\"id\":439669428,\"original_url\":\"https://assets.guesty.com/image/upload/listing_images_s3/production/property-photos/37f4da83043b83939b4521da05e532826ad2c6d607c3dec7/6806b1c80799d400120bd8ad/24fb7b28-bd68-47-fq9cS\",\"url\":\"https://s3.amazonaws.com/brzw-photos/b574a733-d406-416c-afae-00c6f36f79c2.jpg\"},{\"caption\":null,\"default\":false,\"id\":439669430,\"original_url\":\"https://assets.guesty.com/image/upload/listing_images_s3/production/property-photos/37f4da83043b83939b4521da05e532826ad2c6d607c3dec7/6806b1c80799d400120bd8ad/b7feb312-f125-46-2OUWi\",\"url\":\"https://s3.amazonaws.com/brzw-photos/23413ab9-bba2-4e4e-8a3a-62203d9b6e6f.jpg\"},{\"caption\":null,\"default\":false,\"id\":439669431,\"original_url\":\"https://assets.guesty.com/image/upload/listing_images_s3/production/property-photos/37f4da83043b83939b4521da05e532826ad2c6d607c3dec7/6806b1c80799d400120bd8ad/94fb8275-2352-4f-q8Nhu\",\"url\":\"https://s3.amazonaws.com/brzw-photos/e55b5647-16b2-49e7-b135-9cc0b5b021cb.jpg\"},{\"caption\":null,\"default\":false,\"id\":439669432,\"original_url\":\"https://assets.guesty.com/image/upload/listing_images_s3/production/property-photos/37f4da83043b83939b4521da05e532826ad2c6d607c3dec7/6806b1c80799d400120bd8ad/7350ed49-56b6-44-1-6nr\",\"url\":\"https://s3.amazonaws.com/brzw-photos/9d121151-4a63-4017-8f91-fd7bb5910fde.jpg\"},{\"caption\":null,\"default\":false,\"id\":439669433,\"original_url\":\"https://assets.guesty.com/image/upload/listing_images_s3/production/property-photos/37f4da83043b83939b4521da05e532826ad2c6d607c3dec7/6806b1c80799d400120bd8ad/9cc48991-566a-40-K9kvX\",\"url\":\"https://s3.amazonaws.com/brzw-photos/ffd5121e-ab5c-46ed-b618-9886c1ef7994.jpg\"},{\"caption\":null,\"default\":false,\"id\":439669434,\"original_url\":\"https://assets.guesty.com/image/upload/listing_images_s3/production/property-photos/37f4da83043b83939b4521da05e532826ad2c6d607c3dec7/6806b1c80799d400120bd8ad/03212465-623d-45-xM3R-\",\"url\":\"https://s3.amazonaws.com/brzw-photos/181af255-db12-48f6-98a2-02918ad8163c.jpg\"},{\"caption\":null,\"default\":false,\"id\":439669435,\"original_url\":\"https://assets.guesty.com/image/upload/listing_images_s3/production/property-photos/37f4da83043b83939b4521da05e532826ad2c6d607c3dec7/6806b1c80799d400120bd8ad/60a277c7-8d06-4e-5Q9pN\",\"url\":\"https://s3.amazonaws.com/brzw-photos/e6980bec-07b8-4065-a8ee-4eac4c91531f.jpg\"},{\"caption\":null,\"default\":false,\"id\":439669436,\"original_url\":\"https://assets.guesty.com/image/upload/listing_images_s3/production/property-photos/37f4da83043b83939b4521da05e532826ad2c6d607c3dec7/6806b1c80799d400120bd8ad/6f51534c-9fce-41-IxYNG\",\"url\":\"https://s3.amazonaws.com/brzw-photos/ec00ac6a-1b58-496d-8aeb-8bd507dcd3fb.jpg\"},{\"caption\":null,\"default\":false,\"id\":439669437,\"original_url\":\"https://assets.guesty.com/image/upload/listing_images_s3/production/property-photos/37f4da83043b83939b4521da05e532826ad2c6d607c3dec7/6806b1c80799d400120bd8ad/9a820c8c-9bfb-4c-Avud-\",\"url\":\"https://s3.amazonaws.com/brzw-photos/82f5fc03-0553-4c27-8519-b2c7bb90ce44.jpg\"},{\"caption\":null,\"default\":false,\"id\":439669438,\"original_url\":\"https://assets.guesty.com/image/upload/listing_images_s3/production/property-photos/37f4da83043b83939b4521da05e532826ad2c6d607c3dec7/6806b1c80799d400120bd8ad/011eb2a4-4035-45-Dg-Qn\",\"url\":\"https://s3.amazonaws.com/brzw-photos/176379a6-512e-4334-8bc9-ad010baff84d.jpg\"},{\"caption\":null,\"default\":false,\"id\":439669439,\"original_url\":\"https://assets.guesty.com/image/upload/listing_images_s3/production/property-photos/37f4da83043b83939b4521da05e532826ad2c6d607c3dec7/6806b1c80799d400120bd8ad/e1839511-74bb-48-t3rJQ\",\"url\":\"https://s3.amazonaws.com/brzw-photos/99ca51a1-6dd1-4700-b283-1f82a328606c.jpg\"},{\"caption\":null,\"default\":false,\"id\":439669442,\"original_url\":\"https://assets.guesty.com/image/upload/listing_images_s3/production/property-photos/37f4da83043b83939b4521da05e532826ad2c6d607c3dec7/6806b1c80799d400120bd8ad/c2b0ec71-dea8-4e-XdwEB\",\"url\":\"https://s3.amazonaws.com/brzw-photos/78e712a6-dc97-4a04-876b-75a8edf7be8a.jpg\"},{\"caption\":null,\"default\":false,\"id\":439669444,\"original_url\":\"https://assets.guesty.com/image/upload/listing_images_s3/production/property-photos/37f4da83043b83939b4521da05e532826ad2c6d607c3dec7/6806b1c80799d400120bd8ad/cb47b5e5-12e4-4c-Y89__\",\"url\":\"https://s3.amazonaws.com/brzw-photos/abf3cf43-ab64-4d24-81af-f178f7de7a92.jpg\"},{\"caption\":null,\"default\":false,\"id\":439669446,\"original_url\":\"https://assets.guesty.com/image/upload/listing_images_s3/production/property-photos/37f4da83043b83939b4521da05e532826ad2c6d607c3dec7/6806b1c80799d400120bd8ad/ddd8c9e7-81b5-40-l_Zuc\",\"url\":\"https://s3.amazonaws.com/brzw-photos/a4347da4-d620-4f63-b1df-b33f190cffbe.jpg\"}]",
    "reference_company_id": "0oaor5yi2gtOPMBQx5d7",
    "reference_external_property_id": "6806b1c80799d400120bd8ad",
    "reference_property_id": "6806b1c80799d400120bd8ad",
    "state": "Florida",
    "status": "inactive",
    "wifi_name": null,
    "wifi_password": null,
    "zipcode": "33131"
  },
  {
    "property_id": 1236089,
    "address1": "485 Brickell Avenue",
    "address2": null,
    "building": null,
    "city": "Miami",
    "company_id": "20307",
    "country": "US",
    "display": "Icon Test (RU)",
    "property_groups": "[]",
    "property_id_payload": "1236089",
    "latitude": "25.7686625",
    "longitude": "-80.188727",
    "name": "Icon Test (RU)",
    "notes": "{}",
    "photos": "[{\"caption\":null,\"default\":true,\"id\":645907822,\"original_url\":\"https://assets.guesty.com/image/upload/v1765327134/production/67f3e2c2c3c7926782f6fd63/swvwbc8wf6clrh2sumfq.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/88551ce5-26db-4463-9972-a256f2c415bc.jpg\"},{\"caption\":null,\"default\":false,\"id\":645907826,\"original_url\":\"https://assets.guesty.com/image/upload/v1749052380/production/67f3e2c2c3c7926782f6fd63/uauk8yahapc4bjdocqb8.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/3bb8abcc-8b9c-43bb-bb95-cc40cd00d7d1.jpg\"},{\"caption\":null,\"default\":false,\"id\":645907827,\"original_url\":\"https://assets.guesty.com/image/upload/v1749052380/production/67f3e2c2c3c7926782f6fd63/qitgycgjy6xchru61fy0.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/3e8481a4-4f27-4457-8f00-7a0b0fa92fd8.jpg\"},{\"caption\":null,\"default\":false,\"id\":645907830,\"original_url\":\"https://assets.guesty.com/image/upload/v1749052386/production/67f3e2c2c3c7926782f6fd63/avoyx16vnjszi0go3mf2.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/cd473fdf-ace7-4dc0-ba12-c1992f37ead4.jpg\"},{\"caption\":null,\"default\":false,\"id\":645907833,\"original_url\":\"https://assets.guesty.com/image/upload/v1749052381/production/67f3e2c2c3c7926782f6fd63/xuumuafgi9xj1uso7d2j.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/ac325cf3-023e-4458-9a64-766b43b1c062.jpg\"},{\"caption\":null,\"default\":false,\"id\":645907835,\"original_url\":\"https://assets.guesty.com/image/upload/v1748019814/production/67f3e2c2c3c7926782f6fd63/ktnuhdqz6p5c8ixumoiw.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/73041cf6-0a23-4a85-9c74-d13ec5827d4e.jpg\"},{\"caption\":null,\"default\":false,\"id\":645907836,\"original_url\":\"https://assets.guesty.com/image/upload/v1747853154/production/67f3e2c2c3c7926782f6fd63/i7aw3vphsv4d6pqj5ao4.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/7f6f6d83-ca60-4d5f-8bb8-8c8fc3dca289.jpg\"},{\"caption\":null,\"default\":false,\"id\":645907837,\"original_url\":\"https://assets.guesty.com/image/upload/v1748019814/production/67f3e2c2c3c7926782f6fd63/di7psqc4agv9oevfjlbn.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/ed59526b-5751-4fab-8cb2-773d4b59bf17.jpg\"},{\"caption\":null,\"default\":false,\"id\":645907838,\"original_url\":\"https://assets.guesty.com/image/upload/v1747853154/production/67f3e2c2c3c7926782f6fd63/uma13dqiqvs6hvflj2n2.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/ab90bff7-7f93-4378-aa73-0fc90576a655.jpg\"},{\"caption\":null,\"default\":false,\"id\":645907839,\"original_url\":\"https://assets.guesty.com/image/upload/v1747853157/production/67f3e2c2c3c7926782f6fd63/bcka5odx7vqffenscq3r.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/546c3020-dd1c-4b25-bd02-1aa08132e34e.jpg\"},{\"caption\":null,\"default\":false,\"id\":645907840,\"original_url\":\"https://assets.guesty.com/image/upload/v1747853158/production/67f3e2c2c3c7926782f6fd63/udbygy2wnac6zqzmstfr.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/be5b6ceb-2f00-44d2-af78-5b48da7abe4a.jpg\"},{\"caption\":null,\"default\":false,\"id\":645907841,\"original_url\":\"https://assets.guesty.com/image/upload/v1747853154/production/67f3e2c2c3c7926782f6fd63/lecybwykqg0bhvd3abjj.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/dbaa6730-d629-451b-9184-f867fbea2efe.jpg\"},{\"caption\":null,\"default\":false,\"id\":645907842,\"original_url\":\"https://assets.guesty.com/image/upload/v1749052380/production/67f3e2c2c3c7926782f6fd63/fv4qhinxqredcosw2gqc.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/ce114aac-25aa-436f-b7fa-311b8eda30dc.jpg\"},{\"caption\":null,\"default\":false,\"id\":645907844,\"original_url\":\"https://assets.guesty.com/image/upload/v1749052380/production/67f3e2c2c3c7926782f6fd63/lbafsvgpw5gfzd8luehb.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/d9afe0f3-1145-4a84-be66-84cd85e53eae.jpg\"},{\"caption\":null,\"default\":false,\"id\":645907845,\"original_url\":\"https://assets.guesty.com/image/upload/v1749052380/production/67f3e2c2c3c7926782f6fd63/y0oyjvg4w45r19e0fymb.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/6c6224a8-c89e-418c-8903-adf36b63f1df.jpg\"},{\"caption\":null,\"default\":false,\"id\":645907847,\"original_url\":\"https://assets.guesty.com/image/upload/v1747853154/production/67f3e2c2c3c7926782f6fd63/ohjmwwikgmb0kx40pebm.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/56a815d6-52d1-4e50-9aed-95e9f4435e07.jpg\"},{\"caption\":null,\"default\":false,\"id\":645907849,\"original_url\":\"https://assets.guesty.com/image/upload/v1747853158/production/67f3e2c2c3c7926782f6fd63/vglnt3sxm1rzwepvxznp.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/b92b6e4a-e037-4fa4-8fef-4a3a5cb45361.jpg\"},{\"caption\":null,\"default\":false,\"id\":645907850,\"original_url\":\"https://assets.guesty.com/image/upload/v1749052387/production/67f3e2c2c3c7926782f6fd63/vm1luw1f1lvedle6hriw.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/d535f551-12ae-4103-aae5-db1a3f54e545.jpg\"},{\"caption\":null,\"default\":false,\"id\":645907851,\"original_url\":\"https://assets.guesty.com/image/upload/v1749052386/production/67f3e2c2c3c7926782f6fd63/jgnm0gtk5pwat1qwydon.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/50aec539-3d37-4d06-b197-87429e0d7c8a.jpg\"},{\"caption\":null,\"default\":false,\"id\":645907852,\"original_url\":\"https://assets.guesty.com/image/upload/v1749052387/production/67f3e2c2c3c7926782f6fd63/zy98q3ccjpkh8kjaw0z1.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/66269a5a-bad4-4a63-a7e7-9cc1ec0b4970.jpg\"},{\"caption\":null,\"default\":false,\"id\":645907853,\"original_url\":\"https://assets.guesty.com/image/upload/v1749052388/production/67f3e2c2c3c7926782f6fd63/ww8nq5rixchirxq0hy3d.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/1d395b9a-5ba0-4457-a11c-cf705b4f8380.jpg\"},{\"caption\":null,\"default\":false,\"id\":645907854,\"original_url\":\"https://assets.guesty.com/image/upload/v1749052387/production/67f3e2c2c3c7926782f6fd63/vm6wtlnp8ntxn9jb1seg.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/4c704cd1-6724-432f-b253-c8396ad706ec.jpg\"},{\"caption\":null,\"default\":false,\"id\":645907855,\"original_url\":\"https://assets.guesty.com/image/upload/v1749052391/production/67f3e2c2c3c7926782f6fd63/qtnsgd5tosttm2vasttx.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/7be9ec97-4c02-4511-a24b-fc491a1553af.jpg\"},{\"caption\":null,\"default\":false,\"id\":645907856,\"original_url\":\"https://assets.guesty.com/image/upload/v1747853154/production/67f3e2c2c3c7926782f6fd63/sum14lj2kda93qyv1tcq.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/94220f4d-ad64-46fd-b6b2-411a6dbae6ca.jpg\"},{\"caption\":null,\"default\":false,\"id\":645907858,\"original_url\":\"https://assets.guesty.com/image/upload/v1749052392/production/67f3e2c2c3c7926782f6fd63/x1yn7ysyoyhk5djotrfg.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/c7cd4459-0d7a-4ca9-bf93-a7a5f8a45358.jpg\"},{\"caption\":null,\"default\":false,\"id\":645907859,\"original_url\":\"https://assets.guesty.com/image/upload/v1747853159/production/67f3e2c2c3c7926782f6fd63/vdbgjdvhemxout1huuso.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/c7fce816-c23a-44ae-8ebc-d2627cd09254.jpg\"},{\"caption\":null,\"default\":false,\"id\":645907860,\"original_url\":\"https://assets.guesty.com/image/upload/v1747853159/production/67f3e2c2c3c7926782f6fd63/vdsbstcd1nhe1zaftx8y.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/c5721ad9-b909-4a13-8228-31fc3c5f3b15.jpg\"},{\"caption\":null,\"default\":false,\"id\":645907862,\"original_url\":\"https://assets.guesty.com/image/upload/v1766676561/production/67f3e2c2c3c7926782f6fd63/u96owracljyey5cim3kh.jpg\",\"url\":\"https://s3.amazonaws.com/brzw-photos/2f853ff7-4499-486f-b637-7cea9f4854ae.jpg\"}]",
    "reference_company_id": "0oaor5yi2gtOPMBQx5d7",
    "reference_external_property_id": "69828a46a54a0c001d80cab7",
    "reference_property_id": "69828a46a54a0c001d80cab7",
    "state": "Florida",
    "status": "inactive",
    "wifi_name": null,
    "wifi_password": null,
    "zipcode": "33131"
  }
]
```

## Decisions (fill in after inspecting above)

- **Material vs labor split**: ☐ explicit columns ☐ join via `parsed_breezeway_supplies` ☐ heuristic (rate_paid = labor, rest = material, fallback 60/40)
- **Task type classification**: ☐ explicit `task_type` ☐ subdepartment-based ☐ tag-based (`parsed_breezeway_task_tags`) ☐ title heuristic
- **Preventive cronograma source**: ☐ scheduled_date on tasks ☐ due_date ☐ separate table ☐ derived from tags + recurrence
- **Property join key (BQ ↔ Postgres `Unit`)**: ☐ name prefix ☐ external_id field ☐ requires explicit mapping table
- **Freshness signal for UI badge**: ☐ etl_loaded_at column ☐ MAX(updated_at) ☐ none, document SLA verbally
- **Recharge owner column on tasks** (e.g. `bill_to`): ☐ confirmed name = ___ ☐ requires lookup join
