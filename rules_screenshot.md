## Rule -> Parameters

### ALERT_LOGIN_3075_FRAUDULENT_ISP_B

- Rule Description: ISP from login is found on customer profile indicating fraud occurred in past 30 days and cust device age < 180 days.
- Parameter Count: 6
- Parameters:
  - IP Carrier
  - Online Device First Seen
  - Reject Type Code
  - Rejected Transaction Indication
  - Transaction Type
  - Trx Date

### ALERT_LOGIN_3076_MULTI_ECN_PER_DEVICE_A

- Rule Description: If an Online Device Id has been used to login by at least 4 users (>= 4 ECNs) within the past 6 hours, then create this alert rule at Login.
- Parameter Count: 1
- Parameters:
  - Transaction Type

### ALERT_LOGIN_3077_FAILED_LOGINS

- Rule Description: Customer has failed at least 3 logins within the past 24 hours.
- Parameter Count: 6
- Parameters:
  - ActSet Reject Type Code
  - ActSet Transaction Type
  - ActSet Trx Date
  - Main Entity Activity Set
  - Transaction Type
  - Trx Date

### ALERT_LOGIN_3079_UNTRUST_ISP_A

- Rule Description: If ISP is not on the Trusted ISP list from the given user then fire advisory
- Parameter Count: 4
- Parameters:
  - IP Carrier
  - Reject Type Code
  - Rejected Transaction Indication
  - Transaction Type

### RISK_LOGIN_3000_NEW_DVC_A

- Rule Description: If login from an untrusted device with customer device age <=365 days, then challenge. Bypass delegate users and bypass when a NULL WF DVC_ID is pre upgraded flag returns TRUE. And bypass low BioCatch scores on browser logins.
- Parameter Count: 12
- Parameters:
  - BIOCATCH_MODEL_SCORE
  - Customer Type
  - Is New WFDID Upgraded Device
