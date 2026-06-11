# Cycle-03 — VOID (invalid capture environment)

This screenshot set does not depict the product. A stale next-server
(orphaned during inter-cycle diagnostics) served old HTML referencing
CSS assets deleted by a fresh build: every page captured unstyled with
51 phantom 400/404 resource errors. The examiner report for this set
scored the broken capture, not the product, and does not count toward
the cycle floor. Structural fix: scripts/qa-shoot.sh (port/buildId/CSS
gates). Real defects confirmed independently (favicon 404, runtime
Google-Fonts dependency) were fixed in the remediation commit.
