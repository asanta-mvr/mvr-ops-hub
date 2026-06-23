# Guesty Listing — API Field & Endpoint Map

Generated:        2026-06-17T19:30:30.481Z
Listings in DB:   414

## Part A — Base `GET /v1/listings/{id}` object (from real synced data)

Flattened from 414 listings stored in `GuestyListing.raw`. "Present" = % of
listings with a non-empty value at that path. Array paths are marked `[]`.

| # | path | type(s) | present | sample |
|---|---|---|---:|---|
| 1 | `__v` | number | 100% | `44` |
| 2 | `_id` | string | 100% | `699dd006e10063002cb5b207` |
| 3 | `accommodates` | number | 100% | `4` |
| 4 | `accountId` | string | 100% | `67f3e2c2c3c7926782f6fd63` |
| 5 | `accountTaxes` | array (len 2–2) | 98% |  |
| 6 | `accountTaxes[]` | object | 98% |  |
| 7 | `accountTaxes[]._id` | string | 98% | `68192ab223aba45c131e41f2` |
| 8 | `accountTaxes[].amount` | number | 98% | `7` |
| 9 | `accountTaxes[].appliedByDefaultOnChannels` | array (len 0–0) | 98% |  |
| 10 | `accountTaxes[].appliedOnFees` | array (len 70–70) | 98% |  |
| 11 | `accountTaxes[].appliedOnFees[]` | string | 98% | `AF` |
| 12 | `accountTaxes[].appliedToAllFees` | boolean | 98% | `true` |
| 13 | `accountTaxes[].isAppliedByDefault` | boolean | 98% | `false` |
| 14 | `accountTaxes[].name` | string | 98% | `Sales Tax` |
| 15 | `accountTaxes[].quantifier` | string | 98% | `PER_STAY` |
| 16 | `accountTaxes[].type` | string | 98% | `VAT` |
| 17 | `accountTaxes[].units` | string | 98% | `PERCENTAGE` |
| 18 | `active` | boolean | 100% | `false` |
| 19 | `address` | object | 100% |  |
| 20 | `address.apartment` | string | 15% | `3805` |
| 21 | `address.apt` | string | 86% | `Unit 3106` |
| 22 | `address.buildingName` | string | 76% | `Icon` |
| 23 | `address.city` | string | 100% | `Miami` |
| 24 | `address.country` | string | 100% | `United States` |
| 25 | `address.full` | string | 100% | `485 Brickell Avenue, Miami, Florida 33131, United States` |
| 26 | `address.lat` | number | 100% | `25.7686625` |
| 27 | `address.lng` | number | 100% | `-80.188727` |
| 28 | `address.neighborhood` | string | 0% | `testt` |
| 29 | `address.state` | string | 100% | `Florida` |
| 30 | `address.street` | string | 100% | `485 Brickell Avenue` |
| 31 | `address.unit` | string | 78% | `3106` |
| 32 | `address.zipcode` | string | 100% | `33131` |
| 33 | `amenities` | array (len 2–244) | 100% |  |
| 34 | `amenities[]` | string | 100% | `Accessible-height bed` |
| 35 | `amenitiesNotIncluded` | array (len 0–1) | 100% |  |
| 36 | `amenitiesNotIncluded[]` | string | 1% | `Patio or balcony` |
| 37 | `areaSquareFeet` | number | 88% | `842` |
| 38 | `bathrooms` | number | 99% | `1` |
| 39 | `bedrooms` | number | 99% | `1` |
| 40 | `beds` | number | 99% | `2` |
| 41 | `businessModel` | object | 60% |  |
| 42 | `businessModel.activationDate` | string | 60% | `2025-06-01T19:00:00.000Z` |
| 43 | `businessModel.id` | string | 60% | `692366de08f8df359f5a83ba` |
| 44 | `businessModel.name` | string | 60% | `22% + 1%` |
| 45 | `businessModel.version` | number | 60% | `17` |
| 46 | `calendarRules` | object | 100% |  |
| 47 | `calendarRules.advanceNotice` | object | 100% |  |
| 48 | `calendarRules.advanceNotice.airbnb2` | object | 100% |  |
| 49 | `calendarRules.advanceNotice.airbnb2.isCutOffHoursEnabled` | boolean | 100% | `true` |
| 50 | `calendarRules.advanceNotice.bookingCom` | object | 100% |  |
| 51 | `calendarRules.advanceNotice.bookingCom.hours` | number | 99% | `5` |
| 52 | `calendarRules.advanceNotice.bookingCom.isCutOffHoursEnabled` | boolean | 100% | `true` |
| 53 | `calendarRules.advanceNotice.defaultSettings` | object | 99% |  |
| 54 | `calendarRules.advanceNotice.defaultSettings.allowRequestToBook` | boolean | 99% | `false` |
| 55 | `calendarRules.advanceNotice.defaultSettings.hours` | number | 99% | `5` |
| 56 | `calendarRules.advanceNotice.directBookings` | object | 100% |  |
| 57 | `calendarRules.advanceNotice.directBookings.isCutOffHoursEnabled` | boolean | 100% | `true` |
| 58 | `calendarRules.advanceNotice.expedia` | object | 100% |  |
| 59 | `calendarRules.advanceNotice.expedia.isCutOffHoursEnabled` | boolean | 100% | `true` |
| 60 | `calendarRules.advanceNotice.updatedAt` | string | 100% | `2025-11-12T01:05:54.062Z` |
| 61 | `calendarRules.advanceNotice.updatedBy` | string | 99% | `Jobelle Sydell Castellano via Ana Saenz` |
| 62 | `calendarRules.bookingWindow` | object | 100% |  |
| 63 | `calendarRules.bookingWindow.defaultSettings` | object | 94% |  |
| 64 | `calendarRules.bookingWindow.defaultSettings.customDays` | number | 32% | `-1` |
| 65 | `calendarRules.bookingWindow.defaultSettings.days` | number | 94% | `365` |
| 66 | `calendarRules.bookingWindow.updatedAt` | string | 100% | `2025-04-21T21:00:19.015Z` |
| 67 | `calendarRules.bookingWindow.updatedBy` | string | 94% | `AuthService` |
| 68 | `calendarRules.defaultAvailability` | string | 100% | `AVAILABLE` |
| 69 | `calendarRules.defaultAvailabilityUpdatedAt` | string | 100% | `2025-11-12T01:05:54.062Z` |
| 70 | `calendarRules.defaultAvailabilityUpdatedBy` | string | 93% | `Jobelle Sydell Castellano via Ana Saenz` |
| 71 | `calendarRules.dynamicCheckin` | object | 100% |  |
| 72 | `calendarRules.dynamicCheckin.updatedAt` | string | 100% | `2025-04-21T21:00:19.016Z` |
| 73 | `calendarRules.nightsLimit` | object | 9% |  |
| 74 | `calendarRules.nightsLimit.2025` | object | 9% |  |
| 75 | `calendarRules.nightsLimit.2025.limit` | number | 9% | `1` |
| 76 | `calendarRules.nightsLimit.2026` | object | 9% |  |
| 77 | `calendarRules.nightsLimit.2026.abn` | number | 0% | `0` |
| 78 | `calendarRules.nightsLimit.2026.limit` | number | 9% | `1` |
| 79 | `calendarRules.nightsLimit.2026.ratio` | number | 0% | `0` |
| 80 | `calendarRules.nightsLimit.2027` | object | 1% |  |
| 81 | `calendarRules.nightsLimit.2027.limit` | number | 1% | `1` |
| 82 | `calendarRules.nightsLimit.active` | boolean | 9% | `false` |
| 83 | `calendarRules.nightsLimit.defaultNightsLimit` | number | 9% | `1` |
| 84 | `calendarRules.nightsLimit.updatedAt` | string | 9% | `2025-12-05T23:34:42.390Z` |
| 85 | `calendarRules.nightsLimit.updatedBy` | string | 9% | `ana@miamivacationrentals.com` |
| 86 | `calendarRules.preparationTime` | object | 100% |  |
| 87 | `calendarRules.preparationTime.defaultSettings` | object | 94% |  |
| 88 | `calendarRules.preparationTime.defaultSettings.days` | number | 94% | `0` |
| 89 | `calendarRules.preparationTime.updatedAt` | string | 100% | `2025-04-21T21:00:19.015Z` |
| 90 | `calendarRules.preparationTime.updatedBy` | string | 94% | `AuthService` |
| 91 | `calendarRules.rentalPeriods` | array (len 0–0) | 100% |  |
| 92 | `checkInInstructions` | object | 83% |  |
| 93 | `checkInInstructions.alternativeCheckIn` | null | 0% |  |
| 94 | `checkInInstructions.notes` | string | 8% | `CHECK-IN: starts at 4:00 pm call/text (786) 705 3697 or w…` |
| 95 | `checkInInstructions.primaryCheckIn` | string | 82% | `MEET` |
| 96 | `checkOutInstructions` | string | 0% |  |
| 97 | `cleaning` | object | 0% |  |
| 98 | `cleaning.defaultCleaningTime` | string | 0% | `151.5` |
| 99 | `cleaningStatus` | object | 100% |  |
| 100 | `cleaningStatus.updatedAt` | string | 93% | `2026-02-11T20:46:41.568Z` |
| 101 | `cleaningStatus.updatedBy` | string | 93% | `Guesty automation` |
| 102 | `cleaningStatus.value` | string | 93% | `dirty` |
| 103 | `commissionFormula` | string | 100% | `net_income` |
| 104 | `complexId` | string | 51% | `6841b8a8c92332d1c9a4d0a3` |
| 105 | `contactPhone` | string | 85% | `+13057988811` |
| 106 | `createdAt` | string | 100% | `2026-02-24T16:21:26.249Z` |
| 107 | `customFields` | array (len 1–10) | 100% |  |
| 108 | `customFields[]` | object | 100% |  |
| 109 | `customFields[]._id` | string | 100% | `68ad1ed1bafc1e6e17e4a6f6` |
| 110 | `customFields[].fieldId` | string | 100% | `68acd7d00878cc00515b396d` |
| 111 | `customFields[].value` | string | 100% | `https://guide.breezeway.io/oD7enwxaOO4` |
| 112 | `defaultCheckInEndTime` | string | 6% | `21:00` |
| 113 | `defaultCheckInTime` | string | 100% | `15:00` |
| 114 | `defaultCheckOutTime` | string | 100% | `11:00` |
| 115 | `doorCode` | string | 0% |  |
| 116 | `earlyCheckIn` | object | 2% |  |
| 117 | `earlyCheckIn.blockNight` | object | 2% |  |
| 118 | `earlyCheckIn.blockNight.active` | boolean | 2% | `false` |
| 119 | `earlyCheckIn.blockNight.start` | string | 2% | `16:00` |
| 120 | `financials` | object | 100% |  |
| 121 | `financials.channelCommission` | object | 100% |  |
| 122 | `financials.channelCommission.__v` | number | 2% | `0` |
| 123 | `financials.channelCommission._id` | string | 2% | `69287e7e1f71e67d3288a396` |
| 124 | `financials.channelCommission.accountId` | string | 100% | `67f3e2c2c3c7926782f6fd63` |
| 125 | `financials.channelCommission.createdAt` | string | 2% | `2025-11-27T16:38:22.429Z` |
| 126 | `financials.channelCommission.manual` | array (len 0–0) | 100% |  |
| 127 | `financials.channelCommission.unitTypeId` | string | 100% | `699dd006e10063002cb5b207` |
| 128 | `financials.channelCommission.updatedAt` | string | 2% | `2025-11-27T16:38:22.429Z` |
| 129 | `financials.channelCommission.useAccountSettings` | boolean | 100% | `true` |
| 130 | `financials.cleaningFee` | object | 19% |  |
| 131 | `financials.cleaningFee.lastUpdated` | string | 0% | `2026-05-22T15:11:14.392Z` |
| 132 | `financials.cleaningFee.value` | object | 0% |  |
| 133 | `financials.cleaningFee.value._id` | string | 0% | `6a10721260fb920015ad2683` |
| 134 | `financials.cleaningFee.value.formula` | number | 0% | `80` |
| 135 | `financials.cleaningFee.value.multiplier` | string | 0% | `PER_STAY` |
| 136 | `financials.cleaningFee.value.valueType` | string | 0% | `FIXED` |
| 137 | `hostName` | string | 0% |  |
| 138 | `houseManual` | string | 0% |  |
| 139 | `importedAt` | string | 100% | `2025-04-21T20:59:10.830Z` |
| 140 | `integrations` | array (len 0–11) | 100% |  |
| 141 | `integrations[]` | object | 99% |  |
| 142 | `integrations[]._id` | string | 99% | `69f4cf30fd2cc482cfbdfea3` |
| 143 | `integrations[].airbnb2` | object | 47% |  |
| 144 | `integrations[].airbnb2.approvalStatus` | object | 46% |  |
| 145 | `integrations[].airbnb2.approvalStatus.status` | string | 46% | `approved` |
| 146 | `integrations[].airbnb2.bookingLeadTime` | object | 38% |  |
| 147 | `integrations[].airbnb2.bookingLeadTime.allowRequestToBook` | boolean | 38% | `true` |
| 148 | `integrations[].airbnb2.bookingLeadTime.hours` | number | 38% | `5` |
| 149 | `integrations[].airbnb2.cancellationPenalty` | number | 45% | `5` |
| 150 | `integrations[].airbnb2.cancellationPenaltyEnabled` | boolean | 46% | `true` |
| 151 | `integrations[].airbnb2.cancellationPolicy` | string | 47% | `moderate` |
| 152 | `integrations[].airbnb2.daysOfWeekMinimumNights` | array (len 0–0) | 47% |  |
| 153 | `integrations[].airbnb2.financials` | object | 47% |  |
| 154 | `integrations[].airbnb2.financials._id` | string | 47% | `6836570e194f220013fe96cf` |
| 155 | `integrations[].airbnb2.financials.basePrice` | object | 44% |  |
| 156 | `integrations[].airbnb2.financials.basePrice.channelSyncStatus` | string | 44% | `IN_PROGRESS` |
| 157 | `integrations[].airbnb2.financials.cleaningFee` | object | 47% |  |
| 158 | `integrations[].airbnb2.financials.cleaningFee.channelSyncStatus` | string | 47% | `IN_PROGRESS` |
| 159 | `integrations[].airbnb2.financials.cleaningFee.status` | string | 47% | `MANUALLY_ALTERED` |
| 160 | `integrations[].airbnb2.financials.cleaningFee.value` | object | 47% |  |
| 161 | `integrations[].airbnb2.financials.cleaningFee.value._id` | string | 47% | `69fa7bcb0aec60001485415f` |
| 162 | `integrations[].airbnb2.financials.cleaningFee.value.formula` | number | 47% | `151.2` |
| 163 | `integrations[].airbnb2.financials.cleaningFee.value.multiplier` | string | 47% | `PER_STAY` |
| 164 | `integrations[].airbnb2.financials.cleaningFee.value.valueType` | string | 47% | `FIXED` |
| 165 | `integrations[].airbnb2.hostRole` | string | 1% | `OWNER` |
| 166 | `integrations[].airbnb2.id` | string | 47% | `12104214` |
| 167 | `integrations[].airbnb2.instantBookingAllowedCategory` | string | 47% | `everyone` |
| 168 | `integrations[].airbnb2.maxDaysNotice` | object | 38% |  |
| 169 | `integrations[].airbnb2.maxDaysNotice.allowRequestToBook` | boolean | 38% | `true` |
| 170 | `integrations[].airbnb2.maxDaysNotice.days` | number | 38% | `365` |
| 171 | `integrations[].airbnb2.permits` | object | 47% |  |
| 172 | `integrations[].airbnb2.permits.lastUpdatedOn` | string | 47% | `2025-06-05T13:08:51.031Z` |
| 173 | `integrations[].airbnb2.permits.regulations` | array (len 0–0) | 47% |  |
| 174 | `integrations[].airbnb2.promotions` | array (len 0–0) | 47% |  |
| 175 | `integrations[].airbnb2.status` | string | 47% | `COMPLETED` |
| 176 | `integrations[].airbnb2.syncCategory` | string | 47% | `sync_all` |
| 177 | `integrations[].airbnb2.syncCategoryUpdatedAt` | string | 47% | `2025-04-21T20:55:20.074Z` |
| 178 | `integrations[].airbnb2.tier` | string | 38% | `marketplace` |
| 179 | `integrations[].airbnb2.turnoverDays` | number | 38% | `0` |
| 180 | `integrations[].bluegroundNestpick` | object | 1% |  |
| 181 | `integrations[].bluegroundNestpick.cancellationPenalty` | number | 1% | `100` |
| 182 | `integrations[].bluegroundNestpick.cancellationPolicy` | string | 1% | `moderate` |
| 183 | `integrations[].bluegroundNestpick.createdAt` | string | 1% | `2025-11-07T14:56:04.960Z` |
| 184 | `integrations[].bluegroundNestpick.currency` | string | 1% | `USD` |
| 185 | `integrations[].bluegroundNestpick.financials` | object | 1% |  |
| 186 | `integrations[].bluegroundNestpick.financials._id` | string | 1% | `691772597e280d00133aeac4` |
| 187 | `integrations[].bluegroundNestpick.financials.basePrice` | object | 0% |  |
| 188 | `integrations[].bluegroundNestpick.financials.basePrice.channelSyncStatus` | string | 0% | `IN_PROGRESS` |
| 189 | `integrations[].bluegroundNestpick.financials.cleaningFee` | object | 1% |  |
| 190 | `integrations[].bluegroundNestpick.financials.cleaningFee.channelSyncStatus` | string | 1% | `IN_PROGRESS` |
| 191 | `integrations[].bluegroundNestpick.financials.cleaningFee.status` | string | 1% | `MANUALLY_ALTERED` |
| 192 | `integrations[].bluegroundNestpick.financials.cleaningFee.value` | object | 1% |  |
| 193 | `integrations[].bluegroundNestpick.financials.cleaningFee.value._id` | string | 1% | `69fa7db82d2df600111e7058` |
| 194 | `integrations[].bluegroundNestpick.financials.cleaningFee.value.formula` | number | 1% | `129.6` |
| 195 | `integrations[].bluegroundNestpick.financials.cleaningFee.value.multiplier` | string | 1% | `PER_STAY` |
| 196 | `integrations[].bluegroundNestpick.financials.cleaningFee.value.valueType` | string | 1% | `FIXED` |
| 197 | `integrations[].bluegroundNestpick.status` | string | 1% | `DISCONNECTED` |
| 198 | `integrations[].bookingCom` | object | 13% |  |
| 199 | `integrations[].bookingCom.acceptedCreditCards` | array (len 0–0) | 13% |  |
| 200 | `integrations[].bookingCom.acceptedPaymentMethod` | string | 4% | `CASH` |
| 201 | `integrations[].bookingCom.childrenOccupancy` | object | 4% |  |
| 202 | `integrations[].bookingCom.childrenOccupancy.chargeAmount` | number | 4% | `0` |
| 203 | `integrations[].bookingCom.childrenOccupancy.maxAge` | number | 4% | `17` |
| 204 | `integrations[].bookingCom.childrenOccupancy.minAge` | number | 4% | `0` |
| 205 | `integrations[].bookingCom.childrenOccupancy.quantity` | number | 4% | `1` |
| 206 | `integrations[].bookingCom.collectCvcDetails` | boolean | 4% | `true` |
| 207 | `integrations[].bookingCom.contactPhone` | string | 4% | `+13057988811` |
| 208 | `integrations[].bookingCom.currency` | string | 13% | `USD` |
| 209 | `integrations[].bookingCom.financials` | object | 13% |  |
| 210 | `integrations[].bookingCom.financials._id` | string | 13% | `693c918a166bf500132c2587` |
| 211 | `integrations[].bookingCom.financials.basePrice` | object | 9% |  |
| 212 | `integrations[].bookingCom.financials.basePrice.channelSyncStatus` | string | 9% | `SUCCESS` |
| 213 | `integrations[].bookingCom.financials.cleaningFee` | object | 13% |  |
| 214 | `integrations[].bookingCom.financials.cleaningFee.channelSyncStatus` | string | 13% | `SUCCESS` |
| 215 | `integrations[].bookingCom.financials.cleaningFee.status` | string | 13% | `MANUALLY_ALTERED` |
| 216 | `integrations[].bookingCom.financials.cleaningFee.value` | object | 13% |  |
| 217 | `integrations[].bookingCom.financials.cleaningFee.value._id` | string | 13% | `69fa7f0d9db2e9001375e33b` |
| 218 | `integrations[].bookingCom.financials.cleaningFee.value.formula` | number | 13% | `182` |
| 219 | `integrations[].bookingCom.financials.cleaningFee.value.multiplier` | string | 13% | `PER_STAY` |
| 220 | `integrations[].bookingCom.financials.cleaningFee.value.valueType` | string | 13% | `FIXED` |
| 221 | `integrations[].bookingCom.hotelId` | number | 13% | `11832933` |
| 222 | `integrations[].bookingCom.id` | number | 13% | `1183293303` |
| 223 | `integrations[].bookingCom.initialComplexListing` | boolean | 13% | `false` |
| 224 | `integrations[].bookingCom.isComplex` | boolean | 8% | `true` |
| 225 | `integrations[].bookingCom.isLiteLink` | boolean | 8% | `false` |
| 226 | `integrations[].bookingCom.isPublishedByGuesty` | boolean | 13% | `false` |
| 227 | `integrations[].bookingCom.isPublishedCompanyInfo` | boolean | 13% | `false` |
| 228 | `integrations[].bookingCom.isPublishedCompanyLogo` | boolean | 13% | `false` |
| 229 | `integrations[].bookingCom.pricingModel` | string | 7% | `nightly_rate` |
| 230 | `integrations[].bookingCom.promotions` | array (len 1–3) | 13% |  |
| 231 | `integrations[].bookingCom.promotions[]` | object | 13% |  |
| 232 | `integrations[].bookingCom.promotions[].externalPromotionId` | string | 13% | `MR` |
| 233 | `integrations[].bookingCom.promotions[].internalPromotionId` | string | 13% | `68434dbd5695558ae80eb09f` |
| 234 | `integrations[].bookingCom.promotions[].status` | string | 13% | `ACTIVE` |
| 235 | `integrations[].bookingCom.publishCompanyInfo` | boolean | 13% | `false` |
| 236 | `integrations[].bookingCom.publishCompanyLogo` | boolean | 13% | `false` |
| 237 | `integrations[].bookingCom.rateId` | null | 0% |  |
| 238 | `integrations[].bookingCom.rateName` | string | 8% | `Standard Rate` |
| 239 | `integrations[].bookingCom.rates` | array (len 2–2) | 13% |  |
| 240 | `integrations[].bookingCom.rates[]` | object | 13% |  |
| 241 | `integrations[].bookingCom.rates[].externalRatePlanId` | string | 13% | `60132871` |
| 242 | `integrations[].bookingCom.rates[].internalRatePlanId` | string | 13% | `68378061840db3b30d99c6a9` |
| 243 | `integrations[].bookingCom.rates[].status` | string | 13% | `ACTIVE` |
| 244 | `integrations[].bookingCom.status` | string | 13% | `COMPLETED` |
| 245 | `integrations[].bookingCom.syncType` | string | 13% | `ARI` |
| 246 | `integrations[].bookingCom.taxInfo` | array (len 0–0) | 13% |  |
| 247 | `integrations[].bookingCom.useRMCancellationPolicy` | boolean | 13% | `true` |
| 248 | `integrations[].connectionType` | string | 41% | `FullConnected` |
| 249 | `integrations[].expedia` | object | 0% |  |
| 250 | `integrations[].expedia.cancellationPenalty` | null | 0% |  |
| 251 | `integrations[].expedia.cancellationPolicy` | null | 0% |  |
| 252 | `integrations[].expedia.createdAt` | string | 0% | `2026-04-24T19:52:02.954Z` |
| 253 | `integrations[].expedia.useRMCancellationPolicy` | boolean | 0% | `true` |
| 254 | `integrations[].externalUrl` | string | 74% | `https://www.vrbo.com/1117010` |
| 255 | `integrations[].homeaway2` | object | 14% |  |
| 256 | `integrations[].homeaway2.acceptedPaymentForms` | object | 0% |  |
| 257 | `integrations[].homeaway2.acceptedPaymentForms.active` | boolean | 0% | `true` |
| 258 | `integrations[].homeaway2.acceptedPaymentForms.methods` | array (len 2–2) | 0% |  |
| 259 | `integrations[].homeaway2.acceptedPaymentForms.methods[]` | string | 0% | `CREDIT` |
| 260 | `integrations[].homeaway2.acceptedPaymentForms.note` | string | 0% | `Accepted forms of payment: Check, Cash, Debit Card, Credi…` |
| 261 | `integrations[].homeaway2.advertiserId` | string | 14% | `q9N7ue` |
| 262 | `integrations[].homeaway2.bookingLeadTime` | object | 1% |  |
| 263 | `integrations[].homeaway2.bookingPolicy` | string | 14% | `INSTANT` |
| 264 | `integrations[].homeaway2.cancellationPolicy` | string | 14% | `RELAXED` |
| 265 | `integrations[].homeaway2.cancellationPolicyCustomRules` | null | 0% |  |
| 266 | `integrations[].homeaway2.currency` | string | 14% | `USD` |
| 267 | `integrations[].homeaway2.financials` | object | 14% |  |
| 268 | `integrations[].homeaway2.financials._id` | string | 14% | `684b165aad1e4b00128823e3` |
| 269 | `integrations[].homeaway2.financials.basePrice` | object | 13% |  |
| 270 | `integrations[].homeaway2.financials.basePrice.channelSyncStatus` | string | 13% | `IN_PROGRESS` |
| 271 | `integrations[].homeaway2.financials.cleaningFee` | object | 14% |  |
| 272 | `integrations[].homeaway2.financials.cleaningFee.channelSyncStatus` | string | 14% | `IN_PROGRESS` |
| 273 | `integrations[].homeaway2.financials.cleaningFee.status` | string | 14% | `MANUALLY_ALTERED` |
| 274 | `integrations[].homeaway2.financials.cleaningFee.value` | object | 14% |  |
| 275 | `integrations[].homeaway2.financials.cleaningFee.value._id` | string | 14% | `69fa7b25b477050011b3d875` |
| 276 | `integrations[].homeaway2.financials.cleaningFee.value.formula` | number | 14% | `199.99` |
| 277 | `integrations[].homeaway2.financials.cleaningFee.value.multiplier` | string | 14% | `PER_STAY` |
| 278 | `integrations[].homeaway2.financials.cleaningFee.value.valueType` | string | 14% | `FIXED` |
| 279 | `integrations[].homeaway2.merchantName` | string | 11% | `Miami Vacation Rentals` |
| 280 | `integrations[].homeaway2.pricingPolicy` | string | 14% | `GUARANTEED` |
| 281 | `integrations[].homeaway2.status` | string | 14% | `FAILED` |
| 282 | `integrations[].homeToGo` | object | 1% |  |
| 283 | `integrations[].homeToGo.cancellationPenalty` | number | 1% | `100` |
| 284 | `integrations[].homeToGo.cancellationPolicy` | string | 1% | `moderate` |
| 285 | `integrations[].homeToGo.createdAt` | string | 1% | `2025-12-01T16:44:38.237Z` |
| 286 | `integrations[].homeToGo.currency` | string | 1% | `USD` |
| 287 | `integrations[].homeToGo.status` | string | 1% | `DISCONNECTED` |
| 288 | `integrations[].platform` | string | 99% | `whimstay` |
| 289 | `integrations[].rentalsUnited` | object | 3% |  |
| 290 | `integrations[].rentalsUnited.currency` | string | 2% | `USD` |
| 291 | `integrations[].rentalsUnited.financials` | object | 0% |  |
| 292 | `integrations[].rentalsUnited.financials._id` | string | 0% | `69a9885c11c1ab0013288101` |
| 293 | `integrations[].rentalsUnited.financials.cleaningFee` | object | 0% |  |
| 294 | `integrations[].rentalsUnited.financials.cleaningFee.channelSyncStatus` | string | 0% | `SUCCESS` |
| 295 | `integrations[].rentalsUnited.financials.cleaningFee.expedia` | object | 0% |  |
| 296 | `integrations[].rentalsUnited.financials.cleaningFee.expedia.value` | object | 0% |  |
| 297 | `integrations[].rentalsUnited.financials.cleaningFee.expedia.value._id` | string | 0% | `69aaa9c1b1443c0019209cd6` |
| 298 | `integrations[].rentalsUnited.financials.cleaningFee.expedia.value.formula` | number | 0% | `264.1` |
| 299 | `integrations[].rentalsUnited.financials.cleaningFee.expedia.value.multiplier` | string | 0% | `PER_STAY` |
| 300 | `integrations[].rentalsUnited.financials.cleaningFee.expedia.value.valueType` | string | 0% | `FIXED` |
| 301 | `integrations[].rentalsUnited.financials.cleaningFee.status` | string | 0% | `MANUALLY_ALTERED` |
| 302 | `integrations[].rentalsUnited.financials.cleaningFee.value` | object | 0% |  |
| 303 | `integrations[].rentalsUnited.financials.cleaningFee.value._id` | string | 0% | `69aaa9c1b1443c0019209cd7` |
| 304 | `integrations[].rentalsUnited.financials.cleaningFee.value.formula` | number | 0% | `303.6` |
| 305 | `integrations[].rentalsUnited.financials.cleaningFee.value.multiplier` | string | 0% | `PER_STAY` |
| 306 | `integrations[].rentalsUnited.financials.cleaningFee.value.valueType` | string | 0% | `FIXED` |
| 307 | `integrations[].rentalsUnited.id` | number | 2% | `4902764` |
| 308 | `integrations[].rentalsUnited.locationId` | string | 2% | `5376` |
| 309 | `integrations[].vacayHome` | object | 5% |  |
| 310 | `integrations[].vacayHome.cancellationPenalty` | number | 5% | `100` |
| 311 | `integrations[].vacayHome.cancellationPolicy` | string | 5% | `semi_moderate` |
| 312 | `integrations[].vacayHome.createdAt` | string | 5% | `2025-12-19T13:11:38.927Z` |
| 313 | `integrations[].vacayHome.currency` | string | 5% | `USD` |
| 314 | `integrations[].vacayHome.financials` | object | 3% |  |
| 315 | `integrations[].vacayHome.financials._id` | string | 3% | `69fa7d817db0ba0014948abf` |
| 316 | `integrations[].vacayHome.financials.cleaningFee` | object | 3% |  |
| 317 | `integrations[].vacayHome.financials.cleaningFee.channelSyncStatus` | string | 3% | `IN_PROGRESS` |
| 318 | `integrations[].vacayHome.financials.cleaningFee.status` | string | 3% | `MANUALLY_ALTERED` |
| 319 | `integrations[].vacayHome.financials.cleaningFee.value` | object | 3% |  |
| 320 | `integrations[].vacayHome.financials.cleaningFee.value._id` | string | 3% | `69fa7d817db0ba0014948ac0` |
| 321 | `integrations[].vacayHome.financials.cleaningFee.value.formula` | number | 3% | `233.1` |
| 322 | `integrations[].vacayHome.financials.cleaningFee.value.multiplier` | string | 3% | `PER_STAY` |
| 323 | `integrations[].vacayHome.financials.cleaningFee.value.valueType` | string | 3% | `FIXED` |
| 324 | `integrations[].vacayHome.status` | string | 5% | `DISCONNECTED` |
| 325 | `integrations[].whimstay` | object | 15% |  |
| 326 | `integrations[].whimstay.cancellationPenalty` | number | 15% | `100` |
| 327 | `integrations[].whimstay.cancellationPolicy` | string | 15% | `semi_moderate` |
| 328 | `integrations[].whimstay.createdAt` | string | 15% | `2026-05-21T13:00:34.993Z` |
| 329 | `integrations[].whimstay.currency` | string | 1% | `USD` |
| 330 | `integrations[].whimstay.financials` | object | 12% |  |
| 331 | `integrations[].whimstay.financials._id` | string | 12% | `69fa7f018f95c1000fa3fe88` |
| 332 | `integrations[].whimstay.financials.cleaningFee` | object | 12% |  |
| 333 | `integrations[].whimstay.financials.cleaningFee.channelSyncStatus` | string | 12% | `IN_PROGRESS` |
| 334 | `integrations[].whimstay.financials.cleaningFee.status` | string | 12% | `MANUALLY_ALTERED` |
| 335 | `integrations[].whimstay.financials.cleaningFee.value` | object | 12% |  |
| 336 | `integrations[].whimstay.financials.cleaningFee.value._id` | string | 12% | `69fa7f018f95c1000fa3fe89` |
| 337 | `integrations[].whimstay.financials.cleaningFee.value.formula` | number | 12% | `201.4` |
| 338 | `integrations[].whimstay.financials.cleaningFee.value.multiplier` | string | 12% | `PER_STAY` |
| 339 | `integrations[].whimstay.financials.cleaningFee.value.valueType` | string | 12% | `FIXED` |
| 340 | `integrations[].whimstay.status` | string | 15% | `DISCONNECTED` |
| 341 | `isListed` | boolean | 100% | `false` |
| 342 | `isTest` | boolean | 100% | `false` |
| 343 | `lastActivityAt` | string | 35% | `2026-06-12T11:34:42.704Z` |
| 344 | `lastUpdatedAt` | string | 100% | `2026-05-27T19:20:37.468Z` |
| 345 | `lateCheckOut` | object | 2% |  |
| 346 | `lateCheckOut.blockNight` | object | 2% |  |
| 347 | `lateCheckOut.blockNight.active` | boolean | 2% | `false` |
| 348 | `lateCheckOut.blockNight.start` | string | 2% | `10:00` |
| 349 | `listingRooms` | array (len 0–29) | 100% |  |
| 350 | `listingRooms[]` | object | 95% |  |
| 351 | `listingRooms[]._id` | string | 95% | `699dd00626f56be2abb709db` |
| 352 | `listingRooms[].beds` | array (len 0–2) | 95% |  |
| 353 | `listingRooms[].beds[]` | object | 22% |  |
| 354 | `listingRooms[].beds[]._id` | string | 22% | `69336c55c9921a0013b23d20` |
| 355 | `listingRooms[].beds[].quantity` | number | 22% | `1` |
| 356 | `listingRooms[].beds[].type` | string | 22% | `KING_BED` |
| 357 | `listingRooms[].roomNumber` | number | 95% | `0` |
| 358 | `lockCode` | string | 0% |  |
| 359 | `luggageStorage` | string | 0% |  |
| 360 | `manageSubunitPictures` | boolean | 4% | `true` |
| 361 | `markups` | object | 100% |  |
| 362 | `markups.airbnb2` | object | 100% |  |
| 363 | `markups.airbnb2.amount` | number | 100% | `26` |
| 364 | `markups.airbnb2.units` | string | 100% | `PERCENTAGE` |
| 365 | `markups.bluegroundNestpick` | object | 100% |  |
| 366 | `markups.bluegroundNestpick.amount` | number | 100% | `8` |
| 367 | `markups.bluegroundNestpick.units` | string | 100% | `PERCENTAGE` |
| 368 | `markups.bookingCom` | object | 100% |  |
| 369 | `markups.bookingCom.amount` | number | 100% | `56` |
| 370 | `markups.bookingCom.units` | string | 100% | `PERCENTAGE` |
| 371 | `markups.expedia` | object | 100% |  |
| 372 | `markups.expedia.amount` | number | 100% | `62` |
| 373 | `markups.expedia.units` | string | 100% | `PERCENTAGE` |
| 374 | `markups.homeaway2` | object | 100% |  |
| 375 | `markups.homeaway2.amount` | number | 100% | `17` |
| 376 | `markups.homeaway2.units` | string | 100% | `PERCENTAGE` |
| 377 | `markups.homeToGo` | object | 0% |  |
| 378 | `markups.homeToGo.amount` | number | 0% | `0` |
| 379 | `markups.homeToGo.units` | string | 0% | `PERCENTAGE` |
| 380 | `markups.manual` | object | 97% |  |
| 381 | `markups.manual.amount` | number | 97% | `0` |
| 382 | `markups.manual.units` | string | 97% | `PERCENTAGE` |
| 383 | `markups.vacasa` | object | 70% |  |
| 384 | `markups.vacasa.amount` | number | 70% | `11` |
| 385 | `markups.vacasa.units` | string | 70% | `PERCENTAGE` |
| 386 | `markups.vacayHome` | object | 100% |  |
| 387 | `markups.vacayHome.amount` | number | 100% | `11.11` |
| 388 | `markups.vacayHome.units` | string | 100% | `PERCENTAGE` |
| 389 | `markups.whimstay` | object | 72% |  |
| 390 | `markups.whimstay.amount` | number | 72% | `12` |
| 391 | `markups.whimstay.units` | string | 72% | `PERCENTAGE` |
| 392 | `minimumAge` | number | 73% | `21` |
| 393 | `mtl` | object | 73% |  |
| 394 | `mtl._id` | string | 12% | `6931eb531c5f8a001558d99c` |
| 395 | `mtl.aao` | string | 4% | `fu` |
| 396 | `mtl.aas` | string | 4% | `oc` |
| 397 | `mtl.bc` | number | 4% | `14` |
| 398 | `mtl.c` | array (len 0–39) | 12% |  |
| 399 | `mtl.c[]` | string | 4% | `6806b2a37bd7ef001101e1f9` |
| 400 | `mtl.hdb4` | number | 12% | `14` |
| 401 | `mtl.lmcn` | boolean | 12% | `true` |
| 402 | `mtl.p` | string | 26% | `6931eb9394f091003ab7d8cd` |
| 403 | `netIncomeFormula` | string | 100% | `host_payout` |
| 404 | `nickname` | string | 100% | `Icon 3106 1` |
| 405 | `occupancyStats` | array (len 0–0) | 100% |  |
| 406 | `offeredServices` | array (len 0–0) | 100% |  |
| 407 | `otaRoomType` | string | 92% | `Apartment` |
| 408 | `ownerRevenueFormula` | string | 100% | `net_income - pm_commission` |
| 409 | `owners` | array (len 0–4) | 100% |  |
| 410 | `owners[]` | string | 74% | `68378b443fbb6747fc9ae22d` |
| 411 | `parkingInstructions` | string | 0% |  |
| 412 | `paymentProviderId` | string | 74% | `6a13ecc86e470d0013516f07` |
| 413 | `pendingTasks` | array (len 0–32) | 100% |  |
| 414 | `pendingTasks[]` | object | 22% |  |
| 415 | `pendingTasks[]._id` | string | 22% | `6a0e2bb52292b4001255a1bf` |
| 416 | `pendingTasks[].createdAt` | string | 22% | `2026-05-20T21:46:29.779Z` |
| 417 | `pendingTasks[].description` | string | 22% | `Push listing` |
| 418 | `pendingTasks[].error` | string | 12% | `Wrong composition room id:0` |
| 419 | `pendingTasks[].mqId` | string | 22% | `5ff7a573-be3a-4c08-b843-d97fe7a0aa36` |
| 420 | `pendingTasks[].platform` | string | 22% | `rentalsUnited` |
| 421 | `picture` | object | 100% |  |
| 422 | `picture.caption` | string | 0% |  |
| 423 | `picture.large` | string | 96% | `https://assets.guesty.com/image/upload/v1765325142/produc…` |
| 424 | `picture.regular` | string | 96% | `https://assets.guesty.com/image/upload/v1765325142/produc…` |
| 425 | `picture.thumbnail` | string | 100% | `https://assets.guesty.com/image/upload/t_default_thumb/v1…` |
| 426 | `pictures` | array (len 1–63) | 100% |  |
| 427 | `pictures[]` | object | 100% |  |
| 428 | `pictures[]._id` | string | 100% | `6938b9d6952cbb001da5d124` |
| 429 | `pictures[].caption` | string | 0% |  |
| 430 | `pictures[].height` | number | 3% | `2250` |
| 431 | `pictures[].original` | string | 100% | `https://assets.guesty.com/image/upload/v1765325142/produc…` |
| 432 | `pictures[].size` | number | 3% | `921471` |
| 433 | `pictures[].thumbnail` | string | 100% | `https://assets.guesty.com/image/upload/t_default_thumb/v1…` |
| 434 | `pictures[].width` | number | 3% | `3000` |
| 435 | `picturesManagedFromParent` | boolean | 26% | `true` |
| 436 | `pms` | object | 100% |  |
| 437 | `pms.active` | boolean | 100% | `false` |
| 438 | `pms.automation` | object | 100% |  |
| 439 | `pms.automation.answeringMachine` | object | 100% |  |
| 440 | `pms.automation.answeringMachine.active` | boolean | 45% | `false` |
| 441 | `pms.automation.answeringMachine.confirmedAfterCheckOut` | object | 100% |  |
| 442 | `pms.automation.answeringMachine.confirmedAfterCheckOut.delayInMinutes` | number | 100% | `45` |
| 443 | `pms.automation.answeringMachine.confirmedBeforeCheckIn` | object | 100% |  |
| 444 | `pms.automation.answeringMachine.confirmedBeforeCheckIn.delayInMinutes` | number | 100% | `45` |
| 445 | `pms.automation.answeringMachine.confirmedDayOfCheckIn` | object | 100% |  |
| 446 | `pms.automation.answeringMachine.confirmedDayOfCheckIn.delayInMinutes` | number | 100% | `45` |
| 447 | `pms.automation.answeringMachine.confirmedDayOfCheckOut` | object | 100% |  |
| 448 | `pms.automation.answeringMachine.confirmedDayOfCheckOut.delayInMinutes` | number | 100% | `45` |
| 449 | `pms.automation.answeringMachine.confirmedDuringStay` | object | 100% |  |
| 450 | `pms.automation.answeringMachine.confirmedDuringStay.delayInMinutes` | number | 100% | `45` |
| 451 | `pms.automation.answeringMachine.unconfirmedFirstMessage` | object | 100% |  |
| 452 | `pms.automation.answeringMachine.unconfirmedFirstMessage.delayInMinutes` | number | 100% | `55` |
| 453 | `pms.automation.answeringMachine.unconfirmedSubsequentMessage` | object | 100% |  |
| 454 | `pms.automation.answeringMachine.unconfirmedSubsequentMessage.delayInMinutes` | number | 100% | `45` |
| 455 | `pms.automation.autoList` | object | 50% |  |
| 456 | `pms.automation.autoList.active` | boolean | 50% | `false` |
| 457 | `pms.automation.autoPricing` | object | 100% |  |
| 458 | `pms.automation.autoPricing.active` | boolean | 45% | `false` |
| 459 | `pms.automation.autoPricing.rules` | array (len 0–0) | 100% |  |
| 460 | `pms.automation.autoReviews` | object | 100% |  |
| 461 | `pms.automation.autoReviews.active` | boolean | 100% | `false` |
| 462 | `pms.automation.autoReviews.daysBeforeSending` | number | 96% | `3` |
| 463 | `pms.automation.autoReviews.starRating` | number | 96% | `5` |
| 464 | `pms.automation.autoReviews.templates` | array (len 0–3) | 100% |  |
| 465 | `pms.automation.autoReviews.templates[]` | string | 96% | `It was a pleasure hosting {{guest_first}}. Communication …` |
| 466 | `pms.automation.calendarSmartRules` | object | 100% |  |
| 467 | `pms.automation.calendarSmartRules.active` | boolean | 50% | `false` |
| 468 | `pms.automation.calendarSmartRules.blockListings` | array (len 0–0) | 100% |  |
| 469 | `pms.automation.homeAutomation` | object | 50% |  |
| 470 | `pms.automation.homeAutomation.buzzer` | object | 50% |  |
| 471 | `pms.automation.homeAutomation.buzzer.active` | boolean | 50% | `false` |
| 472 | `pms.automation.hooks` | object | 100% |  |
| 473 | `pms.automation.hooks.active` | boolean | 45% | `false` |
| 474 | `pms.automation.hooks.ignoredHooks` | array (len 0–0) | 100% |  |
| 475 | `pms.autoPayments` | object | 100% |  |
| 476 | `pms.autoPayments.policy` | array (len 0–0) | 100% |  |
| 477 | `pms.cleaningStatus` | object | 100% |  |
| 478 | `pms.cleaningStatus.active` | boolean | 100% | `false` |
| 479 | `pms.cleaningStatus.markAsDirtyOnCheckIn` | null | 0% |  |
| 480 | `pms.cleaningStatus.statusFade` | null | 0% |  |
| 481 | `pms.tasks` | object | 100% |  |
| 482 | `pms.tasks.defaultTasks` | array (len 0–0) | 100% |  |
| 483 | `postBookingService` | object | 50% |  |
| 484 | `postBookingService.findServiceProvider` | boolean | 50% | `false` |
| 485 | `postBookingService.handleEmergencies` | boolean | 50% | `false` |
| 486 | `postBookingService.manualWork` | boolean | 50% | `false` |
| 487 | `postBookingService.monitorReservations` | boolean | 50% | `false` |
| 488 | `postBookingService.reservationTask` | boolean | 50% | `false` |
| 489 | `preBooking` | array (len 0–0) | 100% |  |
| 490 | `prices` | object | 100% |  |
| 491 | `prices.basePrice` | number | 100% | `1000` |
| 492 | `prices.cleaningFee` | number | 95% | `140` |
| 493 | `prices.currency` | string | 100% | `USD` |
| 494 | `prices.extraPersonFee` | number | 3% | `0` |
| 495 | `prices.guestsIncludedInRegularFee` | number | 3% | `2` |
| 496 | `prices.monthlyPriceFactor` | number | 100% | `0.9` |
| 497 | `prices.securityDepositFee` | number | 99% | `0` |
| 498 | `prices.weekendBasePrice` | number | 97% | `1000` |
| 499 | `prices.weekendDays` | array (len 2–2) | 96% |  |
| 500 | `prices.weekendDays[]` | number | 96% | `5` |
| 501 | `prices.weeklyPriceFactor` | number | 100% | `0.94` |
| 502 | `privateDescription` | object | 91% |  |
| 503 | `privateDescription.directions` | string | 57% | `If driving yourself: look for our address MIAMI VACATION …` |
| 504 | `promotions` | array (len 8–12) | 100% |  |
| 505 | `promotions[]` | string | 100% | `68434c595695558ae80e9fd3` |
| 506 | `propertyType` | string | 100% | `Apartment` |
| 507 | `publicDescription` | object | 95% |  |
| 508 | `publicDescription.access` | string | 93% | `Designed for couples seeking relaxation and urban explora…` |
| 509 | `publicDescription.houseRules` | string | 95% | `MIAMI VACATION RENTALS SHORT-TERM RENTAL AGREEMENT & HOUS…` |
| 510 | `publicDescription.interactionWithGuests` | string | 1% | `We are available throughout your stay to assist with anyt…` |
| 511 | `publicDescription.neighborhood` | string | 46% | `You are in Brickell Financial District (Walk Score: 95/10…` |
| 512 | `publicDescription.notes` | string | 93% | `Security Deposit / Damage Waiver: Before check-in, all gu…` |
| 513 | `publicDescription.space` | string | 95% | `Our apartment offers a modern layout designed for comfort…` |
| 514 | `publicDescription.summary` | string | 95% | `Guest verdict: "Guests love the location." Our apartment …` |
| 515 | `publicDescription.transit` | string | 90% | `1 min walk: The Miami Riverwalk (Direct access) 4 min wal…` |
| 516 | `publishedAddress` | object | 1% |  |
| 517 | `receptionistsService` | object | 100% |  |
| 518 | `receptionistsService.active` | boolean | 45% | `false` |
| 519 | `receptionistsService.receptionDesk` | object | 100% |  |
| 520 | `receptionistsService.receptionDesk.atPhones` | array (len 0–0) | 100% |  |
| 521 | `receptionistsService.receptionDesk.ittt` | array (len 0–0) | 100% |  |
| 522 | `receptionistsService.screening` | object | 100% |  |
| 523 | `receptionistsService.screening.checklist` | array (len 0–0) | 100% |  |
| 524 | `roomType` | string | 100% | `Entire home/apt` |
| 525 | `SaaS` | object | 100% |  |
| 526 | `SaaS.autoRenew` | boolean | 100% | `true` |
| 527 | `sales` | object | 100% |  |
| 528 | `sales.salesService` | object | 100% |  |
| 529 | `sales.salesService.atPhones` | array (len 0–0) | 100% |  |
| 530 | `sourceOfCreation` | string | 100% | `duplicate` |
| 531 | `subunitSpecificPictures` | array (len 3–74) | 89% |  |
| 532 | `subunitSpecificPictures[]` | object | 89% |  |
| 533 | `subunitSpecificPictures[]._id` | string | 89% | `6806b1a0852ef7df3de887b8` |
| 534 | `subunitSpecificPictures[].caption` | string | 12% | `Coziest studio ever! Living area, bed, dining area, compl…` |
| 535 | `subunitSpecificPictures[].height` | number | 2% | `1536` |
| 536 | `subunitSpecificPictures[].original` | string | 89% | `https://assets.guesty.com/image/upload/listing_images_s3/…` |
| 537 | `subunitSpecificPictures[].size` | number | 63% | `0` |
| 538 | `subunitSpecificPictures[].thumbnail` | string | 89% | `https://assets.guesty.com/image/upload/t_default_thumb/li…` |
| 539 | `subunitSpecificPictures[].width` | number | 2% | `2048` |
| 540 | `tags` | array (len 0–11) | 100% |  |
| 541 | `tags[]` | string | 100% | `Icon` |
| 542 | `taxes` | array (len 0–0) | 100% |  |
| 543 | `terms` | object | 100% |  |
| 544 | `terms.maxNights` | number | 100% | `365` |
| 545 | `terms.minNights` | number | 100% | `1` |
| 546 | `timezone` | string | 100% | `America/New_York` |
| 547 | `title` | string | 100% | `Bayfront Couples' Suite with Skyline Views` |
| 548 | `trashCollectedOn` | string | 0% |  |
| 549 | `type` | string | 100% | `SINGLE` |
| 550 | `useAccountAdditionalFees` | boolean | 100% | `false` |
| 551 | `useAccountMarkups` | boolean | 100% | `false` |
| 552 | `useAccountRevenueShare` | boolean | 100% | `true` |
| 553 | `useAccountTaxes` | boolean | 100% | `true` |
| 554 | `wifiName` | string | 94% | `Mvr3106` |
| 555 | `wifiPassword` | string | 94% | `Icon3106` |

Total distinct paths: 555

---

## Part B — What the base object already covers, and what needs extra endpoints

### B.0 — Key correction

The working hypothesis was *"the payload we have is only the list of listings, not the detail."*
**The real data shows the opposite.** `fetchListingDetail()` already calls `GET /v1/listings/{id}`
per listing, and that single object is the **full detail** — 555 paths. It already includes nearly
everything we'd want as a unit baseline:

| Logical group | Already in base object (raw path) |
|---|---|
| Identity | `_id`, `nickname`, `title`, `accountId`, `tags[]`, `complexId` |
| Type & capacity | `propertyType`, `roomType`, `accommodates`, `bedrooms`, `bathrooms`, `beds`, `areaSquareFeet` |
| Address & geo | `address.{full,street,city,state,country,zipcode,lat,lng,apt,unit,buildingName}`, `timezone` |
| Rooms / beds | `listingRooms[].beds[].{type,quantity}`, `listingRooms[].roomNumber` |
| Amenities | `amenities[]` (full list), `amenitiesNotIncluded[]` |
| Photos | `picture.{thumbnail,regular,large}`, `pictures[].{original,thumbnail,caption}`, `subunitSpecificPictures[]` |
| Descriptions | `publicDescription.{summary,space,access,neighborhood,transit,notes,houseRules,interactionWithGuests}`, `privateDescription.directions` |
| Pricing & terms | `prices.{basePrice,cleaningFee,currency,securityDepositFee,extraPersonFee,weekly/monthlyPriceFactor,weekendBasePrice}`, `terms.{minNights,maxNights}` |
| Check-in | `defaultCheckInTime`, `defaultCheckOutTime`, `checkInInstructions.{primaryCheckIn,notes}` |
| Access secrets | `wifiName`, `wifiPassword`, `doorCode`, `lockCode` *(see B.3 — sensitive)* |
| OTA channels | `integrations[]` per channel (`airbnb2`, `bookingCom`, `homeaway2`=Vrbo, `expedia`, `whimstay`, `vacayHome`, `rentalsUnited`): `id`, `status`, `externalUrl`, `financials`, `cancellationPolicy` |
| Ownership | `owners[]` (owner **IDs** only — names/emails need a lookup, see B.1) |
| Financials | `financials.channelCommission`, `markups.<channel>`, `accountTaxes[]`, `commissionFormula`, `netIncomeFormula`, `ownerRevenueFormula`, `businessModel` |
| Custom fields | `customFields[].{fieldId,value}` (e.g. Breezeway guide URL) |
| Status flags | `active`, `isListed`, `isTest`, `cleaningStatus.value`, `lastActivityAt`, `lastUpdatedAt`, `importedAt` |

**Implication for the "push" flow:** to build the Data Master listing baseline we do **not** need to
call extra endpoints — we can project straight from the `raw` we already store. Extra endpoints are
only needed for data that is genuinely **absent** from the base object (below).

### B.1 — Genuinely-additive listing-ID endpoints (not in the base object)

| Endpoint | Adds | Recommendation |
|---|---|---|
| `GET /v1/owners/{ownerId}` | Resolves `owners[]` IDs → owner name/email/phone/payout. There is already a `GuestyOwner` model to mirror into. | **Pull on push** (cheap: only the owner IDs referenced). |
| `GET /v1/reviews/listings/{listingIds}` | Average review score per listing (not in base). | Optional — a Reviews module already exists (CX, BigQuery). Likely redundant; **defer**. |
| `GET /v1/availability-pricing-api/calendar/listings/{id}` | Per-date availability + nightly price (`startDate`/`endDate` required). Time-series, large. | **Defer** — belongs to a pricing/calendar module, not the data-master baseline. |
| `GET /v1/reservations?filter[listingId]={id}` | Bookings for the listing. | **Defer** — operational module, not baseline. |
| `GET /v1/properties/{listingId}/logs` (a.k.a. `/v1/property-logs/{id}`) | Change/audit history. | **Defer** — diagnostics only. |
| `GET /v1/photos/{listingId}` / `room-photos` | Photo ordering/captions mgmt. | Skip — base `pictures[]` already has URLs. |
| `GET /v1/amenities/{unitTypeId}`, `description-sets`, `properties/spaces`, `house-rules` | Structured variants of data already present in base. | Skip — base covers these. |

> **Bottom line:** the only endpoint worth calling on push is **owner detail** (to turn `owners[]`
> IDs into real owner records). Everything else for the baseline comes from `raw`.

### B.2 — Recommended projection: `raw` → Data Master fields

Reusing the existing `Listing` model ([schema.prisma:349-376](../prisma/schema.prisma#L349-L376)) and
the `Unit` baseline it feeds:

| Target field | Source raw path | Notes |
|---|---|---|
| `Listing.guestyId` | `_id` | already done |
| `Listing.name` | `nickname` ?? `title` | |
| `Listing.nickname` | `nickname` | |
| `Listing.propertyTypeId`/type | `propertyType` | string label, e.g. "Apartment" |
| `Listing.sqrFeet` | `areaSquareFeet` | |
| `Listing.totalOccupancy` | `accommodates` | |
| `Listing.liveDate` | `importedAt` ?? `createdAt` | |
| `Listing.urlAirbnb` | `integrations[].airbnb2.id` → airbnb url | derive `https://airbnb.com/rooms/{id}` |
| `Listing.urlVrbo` | `integrations[].externalUrl` (vrbo.com) | present 74% |
| `Listing.urlBooking` | `integrations[].bookingCom.id` | |
| `Unit.bedrooms` | `bedrooms` | baseline when attaching |
| `Unit.bathrooms` | `bathrooms` | |
| `Unit.capacity` | `accommodates` | |
| `Unit.totalBeds` | `beds` | |
| `Unit.kings/queens/twins` | `listingRooms[].beds[]` (`type`=`KING_BED`/`QUEEN_BED`/…, `quantity`) | aggregate |
| `Unit.sqft` | `areaSquareFeet` | |
| `Unit.features` | `amenities[]` | subset/mapping |
| `Building.address`/geo | `address.*`, `address.lat/lng`, `address.buildingName` | building inference |

### B.3 — Sensitive fields (apply access control before surfacing)

`raw` contains operational secrets that must **not** be shown to all roles or sent to channels:
`wifiPassword` (94%), `wifiName`, `doorCode`, `lockCode`, `checkInInstructions.notes`,
`privateDescription.directions`, `contactPhone`. Gate these behind a privileged role in the
detail view and never include them in list responses.

---

## Part C — Proposed structure & UX (for review — not yet built)

- **`GuestyListing`** stays the Guesty source of truth (`raw` already complete). Add only a
  `promoted`/`promotedAt` marker (and optionally `rawOwners` if we pull owner detail on push).
- **`Listing`** = the Data Master entity; make `unitId` **optional** so a listing can exist before
  being attached to a unit. "Push" creates/links a `Listing` and projects the B.2 fields from `raw`.
- **Owner detail on push:** for each id in `owners[]`, fetch `GET /v1/owners/{id}` and upsert into
  the existing `GuestyOwner` model.
- **`/data-master/listings`** — big filterable list (thumbnail, nickname, type, beds/baths, active
  badge, attached-unit indicator).
- **`/data-master/listings/[id]`** — detail: left = Guesty-derived content rendered from `raw`
  (photos, description, amenities, address, pricing, channels, ownership); right = Data Master panel
  (attach-to-unit, OTA urls, status, notes). Sensitive fields (B.3) gated by role.

