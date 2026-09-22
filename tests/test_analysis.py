import copy
import json
import unittest
from pathlib import Path

from mcp_fantasy import build_weekly_brief


class WeeklyBriefTests(unittest.TestCase):
    def setUp(self):
        fixture = Path(__file__).parents[1] / "examples" / "fictional_snapshot.json"
        self.snapshot = json.loads(fixture.read_text())

    def test_builds_expected_advisory_brief(self):
        brief = build_weekly_brief(self.snapshot)

        self.assertEqual(brief["week"], 7)
        self.assertEqual(brief["lineup"][0]["recommendation"], "strong start consideration")
        self.assertEqual(brief["lineup"][1]["recommendation"], "monitor availability")
        self.assertEqual(brief["waiver_watch"], [{"player": "Theo Banks", "trend": "rising"}])
        self.assertIn("no transaction", brief["safety"])

    def test_never_mutates_source_data(self):
        original = copy.deepcopy(self.snapshot)

        build_weekly_brief(self.snapshot)

        self.assertEqual(self.snapshot, original)

    def test_rejects_unstructured_private_payloads(self):
        with self.assertRaises(ValueError):
            build_weekly_brief({"roster": "raw-response", "available": []})


if __name__ == "__main__":
    unittest.main()
