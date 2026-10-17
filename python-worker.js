
'use strict';

// Run Python in a separate browser worker.
let pyodidePromise;

async function getPyodide() {
  if (!pyodidePromise) {
    importScripts(
      'https://cdn.jsdelivr.net/pyodide/v0.27.7/full/pyodide.js'
    );

    pyodidePromise = loadPyodide({
      indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.27.7/full/'
    });
  }

  return pyodidePromise;
}

self.onmessage = async (event) => {
  if (event.data?.type !== 'run') return;

  try {
    const pyodide = await getPyodide();

    // Define the action limit directly in Python.
    // Do not import MAX_ACTIONS from JavaScript.
    const bootstrap = `
MAX_ACTIONS = 100
_actions = []

def _record(action):
    if len(_actions) >= MAX_ACTIONS:
        raise RuntimeError(
            'Action limit exceeded (100). Shorten your solution.'
        )
    _actions.append(action)

def move():
    _record('move')

def turn_up():
    _record('turn_up')

def turn_down():
    _record('turn_down')

def collect_coin():
    _record('collect_coin')
`;

    await pyodide.runPythonAsync(bootstrap);

    // Execute the user's Python program.
    await pyodide.runPythonAsync(event.data.code);

    // Return the approved robot actions to the game.
    const actions = pyodide.globals.get('_actions').toJs();

    self.postMessage({
      type: 'result',
      commands: actions
    });

  } catch (error) {
    self.postMessage({
      type: 'result',
      error: String(error?.message || error)
        .split('\n')
        .slice(-3)
        .join('\n')
    });
  }
};

// Load Python when the worker starts.
getPyodide()
  .then(() => self.postMessage({ type: 'ready' }))
  .catch(error => {
    self.postMessage({
      type: 'boot-error',
      error: String(error?.message || error)
    });
  });
