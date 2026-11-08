#!/usr/bin/env python3
"""Smoke tests for Stubuika's public command-line and TUI entry points."""
import json
import os
import pty
import select
import subprocess
import sys
import tempfile
import time

binary = os.path.abspath(sys.argv[1])
def run(*args, **kwargs):
    return subprocess.run([binary, *args], text=True, stdout=subprocess.PIPE,
                          stderr=subprocess.PIPE, check=False, **kwargs)

help_result = run('--help')
assert help_result.returncode == 0 and 'diagnostics [--json]' in help_result.stdout
version = run('--version')
assert version.returncode == 0 and 'Stubuika' in version.stdout
with tempfile.TemporaryDirectory() as home:
    env = dict(os.environ, HOME=home, LUNARIA_DEVICE='test"device')
    result = run('diagnostics', '--json', env=env)
    assert result.returncode == 0
    report = json.loads(result.stdout)
    assert report['application'] == 'Stubuika'
    assert report['environment']['device_profile'] == 'test"device'
    assert isinstance(report['graphics']['display'], bool)
    bad = run('diagnostics', '--unknown')
    assert bad.returncode == 2
    assert run('launch').returncode == 2
    assert run('launch', 'not-a-package').returncode == 2
    log_path = os.path.join(home, 'runtime.log')
    with open(log_path, 'w', encoding='utf-8') as log_file:
        log_file.write('[apk-ui] graphics setup failed\\n')
    log_result = run('logs', log_path)
    assert log_result.returncode == 0 and '[apk-ui]' in log_result.stdout
    assert run('logs').returncode == 2

# Redirected stdin/stdout must never start the interactive interface.
tui_no_tty = run('tui', input='')
assert tui_no_tty.returncode == 2 and 'interactive terminal' in tui_no_tty.stderr
if os.name == 'posix':
    master, slave = pty.openpty()
    env = dict(os.environ, HOME=tempfile.mkdtemp(prefix='stubuika-cli-test-'))
    proc = subprocess.Popen([binary, 'tui'], stdin=slave, stdout=slave,
                            stderr=slave, env=env, close_fds=True)
    os.close(slave)
    output = bytearray()
    deadline = time.monotonic() + 5
    while time.monotonic() < deadline and b'STUBUIKA' not in output:
        ready, _, _ = select.select([master], [], [], .2)
        if ready:
            try:
                output.extend(os.read(master, 4096))
            except OSError:
                break
    # Arrow-key navigation opens the diagnostics page from the home dashboard.
    os.write(master, b'\x1b[B\x1b[B\x1b[B\x1b[B\r')
    deadline = time.monotonic() + 5
    while time.monotonic() < deadline and b'SYSTEM DIAGNOSTICS' not in output:
        ready, _, _ = select.select([master], [], [], .2)
        if ready:
            try:
                output.extend(os.read(master, 4096))
            except OSError:
                break
    assert b'SYSTEM DIAGNOSTICS' in output, output.decode(errors='replace')
    os.write(master, b'qq')  # return from diagnostics, then quit dashboard
    try:
        code = proc.wait(timeout=5)
    except subprocess.TimeoutExpired:
        proc.kill(); raise AssertionError('TUI did not respond to navigation and q')
    while True:
        ready, _, _ = select.select([master], [], [], .05)
        if not ready: break
        try:
            output.extend(os.read(master, 4096))
        except OSError:
            break
    os.close(master)
    assert code == 0 and b'Dashboard' in output and b'Host ' in output, output.decode(errors='replace')
print('CLI/TUI smoke tests passed')
