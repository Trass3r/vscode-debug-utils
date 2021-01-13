# VSCode Debug Utilities

This is a VSCode extension containing developer utilities built on the [DebugAdapterTracker](https://code.visualstudio.com/api/references/vscode-api#DebugAdapterTracker) mechanism.

## [PerfTips](https://docs.microsoft.com/en-us/visualstudio/profiling/perftips)

Whenever the debugger stops execution the elapsed time since the last stop is displayed after the new code line.

## Known Issues

- It has only been tested with the C++ and C# debuggers.
- Multiple debug sessions are untested.
- If the current source file is already open but in a different tab group it will open another editor.
