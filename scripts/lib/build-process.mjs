import { spawn } from 'node:child_process';

// Put build subprocesses in their own group so cancellation reaches Cargo,
// rustc and the linker, while leaving unrelated processes alone.
export function spawnBuild(command, args, options = {}) {
  const grouped = process.platform !== 'win32';
  const child = spawn(command, args, { ...options, detached: grouped });
  let timeout;
  const signal = value => {
    if (!child.pid) return;
    try { grouped ? process.kill(-child.pid, value) : child.kill(value); }
    catch (error) { if (error.code !== 'ESRCH') throw error; }
  };
  const cancel = value => {
    if (timeout) return;
    signal(value);
    timeout = setTimeout(() => signal('SIGKILL'), 2000);
    timeout.unref();
  };
  const interrupt = () => cancel('SIGINT');
  const terminate = () => cancel('SIGTERM');
  process.once('SIGINT', interrupt); process.once('SIGTERM', terminate);
  function cleanup() {
    // The group leader can exit before an uncooperative descendant. Finish
    // cancellation before allowing the wrapper itself to exit.
    if (timeout) signal('SIGKILL');
    clearTimeout(timeout);
    process.removeListener('SIGINT', interrupt); process.removeListener('SIGTERM', terminate);
  }
  child.once('exit', cleanup); child.once('error', cleanup);
  return child;
}
