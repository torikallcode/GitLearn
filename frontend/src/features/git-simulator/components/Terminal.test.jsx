// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import Terminal from './Terminal'

describe('Terminal', () => {
  let container
  let root

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(async () => {
    await act(async () => root.unmount())
    container.remove()
  })

  async function render(props = {}) {
    await act(async () => {
      root.render(
        <Terminal
          lines={[{ type: 'out', text: 'On branch main' }]}
          onCommand={() => {}}
          onReset={() => {}}
          onUndo={() => {}}
          canUndo
          suggestions={['git status']}
          {...props}
        />,
      )
    })
  }

  it('renders output and calls reset/undo actions', async () => {
    const onReset = vi.fn()
    const onUndo = vi.fn()
    await render({ onReset, onUndo })

    expect(container.textContent).toContain('On branch main')
    const buttons = [...container.querySelectorAll('button')]
    const undo = buttons.find((button) => button.getAttribute('aria-label') === 'Undo command terakhir')
    const reset = buttons.find((button) => button.getAttribute('aria-label') === 'Reset sandbox')
    expect(undo.disabled).toBe(false)

    await act(async () => undo.dispatchEvent(new MouseEvent('click', { bubbles: true })))
    await act(async () => reset.dispatchEvent(new MouseEvent('click', { bubbles: true })))
    expect(onUndo).toHaveBeenCalledOnce()
    expect(onReset).toHaveBeenCalledOnce()
  })

  it('submits a typed command and exposes command suggestions', async () => {
    const onCommand = vi.fn()
    await render({ onCommand })
    const input = container.querySelector('input[aria-label="Command Git"]')
    const setValue = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set

    await act(async () => {
      setValue.call(input, 'git status')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await act(async () => {
      container.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })

    expect(onCommand).toHaveBeenCalledWith('git status')
    expect(input.value).toBe('')
    expect(container.textContent).toContain('git status')
  })

  it('disables undo when there is no history', async () => {
    await render({ canUndo: false })
    const undo = [...container.querySelectorAll('button')].find(
      (button) => button.getAttribute('aria-label') === 'Undo command terakhir',
    )
    expect(undo.disabled).toBe(true)
  })
})
