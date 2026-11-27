"""Exercise safety boundaries in temporary checkouts, never the real adapters."""
import contextlib
import importlib.util
import io
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('agent_sync', Path(__file__).with_name('sync.py'))
sync = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sync)


class SyncSafetyTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()
        self.destination = '.agents/skills/example/SKILL.md'
        self.content = '---\nname: example\ndescription: "Example"\n---\n' + sync.MARKER + '\n'

    def run_sync(self, mode, expected=None):
        if expected is None:
            expected = {self.destination: self.content}
        with patch.object(sync, 'ROOT', self.root), patch.object(sync, 'expected_files', return_value=expected), patch('sys.argv', ['sync.py', mode]), contextlib.redirect_stdout(io.StringIO()):
            return sync.main()

    def test_creation_idempotence_and_drift(self):
        self.assertEqual(self.run_sync('--write'), 0)
        self.assertEqual(self.run_sync('--check'), 0)
        target = self.root / self.destination
        target.write_text(self.content + 'local change\n')
        self.assertEqual(self.run_sync('--check'), 1)

    def test_unmanaged_file_not_overwritten(self):
        target = self.root / self.destination
        target.parent.mkdir(parents=True)
        target.write_text('user content')
        with self.assertRaisesRegex(ValueError, 'Unmanaged'):
            self.run_sync('--write')
        self.assertEqual(target.read_text(), 'user content')

    def test_removed_source_is_reported_without_deletion(self):
        self.run_sync('--write')
        with self.assertRaisesRegex(ValueError, 'Stale managed'):
            self.run_sync('--check', {})
        self.assertTrue((self.root / self.destination).exists())

    def test_symlink_destination_not_followed(self):
        external = self.root / 'other'
        external.mkdir()
        (self.root / '.agents').symlink_to(external, target_is_directory=True)
        with self.assertRaisesRegex(ValueError, 'Symlink'):
            self.run_sync('--write')
        self.assertEqual(list(external.iterdir()), [])


if __name__ == '__main__':
    unittest.main()
