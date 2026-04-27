Upstream URL: https://github.com/dotnet/eShop
Pinned Commit SHA: 5624ad564d1602a927879df32a79b94522eb6101
Snapshot Date: 2026-03-22

This fixture is a full vendored snapshot of the upstream repository with only the `.git/` directory removed.
It is used for offline characterization and integration tests of FlowConsole's C# architecture-aware scan.

Current test scope intentionally excludes full Aspire/AppHost semantic assertions, even though `src/eShop.AppHost/` is present in this snapshot.
