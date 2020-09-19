# VSCode Debug Utilities

This is a VSCode extension containing developer utilities built on the [DebugAdapterTracker](https://code.visualstudio.com/api/references/vscode-api#DebugAdapterTracker) mechanism.

## [PerfTips](https://docs.microsoft.com/en-us/visualstudio/profiling/perftips)

![screenshot](https://user-images.githubusercontent.com/404623/104593615-3cb8c500-5670-11eb-861d-46ce2974a4ef.png)

Whenever the debugger stops execution the elapsed time since the last stop is displayed after the new code line.

## [CodeMaps](https://docs.microsoft.com/en-us/visualstudio/modeling/use-code-maps-to-debug-your-applications)

![screenshot](https://user-images.githubusercontent.com/404623/183659131-d23fc42b-ecb8-480a-a10b-2a8128a05e4c.gif)

The extension adds a command to open a code map which gets incrementally built while stepping through the code.

## Known Issues

- It has only been tested with the C++ and C# debuggers.
- Multiple debug sessions are untested.
- If the current source file is already open but in a different tab group it will open another editor.
