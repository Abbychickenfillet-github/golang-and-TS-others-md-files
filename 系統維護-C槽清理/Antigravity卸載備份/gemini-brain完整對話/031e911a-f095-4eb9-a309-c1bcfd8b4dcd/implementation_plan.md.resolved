# Database Migration Plan

## Goal
Migrate data from the `future_sign_prod` database to `future_sign_stage` and switch the application environment to use the stage database.

## Proposed Changes

### Database Migration
- **Export**: Use `mysqldump` to export `future_sign_prod`.
  - Command: `& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe" -h hnd1.clusters.zeabur.com -P 32195 -u root -p"4JkIrQts53BjHpy2709b6lFDf1ha8GEU" future_sign_prod --column-statistics=0 --result-file="prod_dump.sql"`
  - *Note*: `--column-statistics=0` is added to avoid potential permission errors with MySQL 8.0+ clients against some servers.

- **Import**: Use `mysql` to import into `future_sign_stage`.
  - Command: `& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -h hnd1.clusters.zeabur.com -P 32195 -u root -p"4JkIrQts53BjHpy2709b6lFDf1ha8GEU" future_sign_stage < prod_dump.sql`

### Configuration
- **Update .env**:
  - Comment out Production configuration.
  - Uncomment and enable Stage configuration.

## Verification Plan
### Automated Verification
- **Check Connection**: Using the application or a test script to check if it connects to `future_sign_stage`.
- **Verify Data**: Check if a specific recent record from production exists in stage (if possible). Or simply verify table counts.
