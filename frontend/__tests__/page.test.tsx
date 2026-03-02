import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import ChatApp from '../app/page'

// Mock fetch
global.fetch = jest.fn()

describe('ChatApp', () => {
    beforeEach(() => {
        jest.clearAllMocks()
            // Default mock for fetchHistory
            ; (global.fetch as jest.Mock).mockImplementation((url) => {
                if (typeof url === 'string' && url.endsWith('/sessions')) {
                    return Promise.resolve({
                        ok: true,
                        json: () => Promise.resolve([]),
                    })
                }
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({}),
                })
            })
    })

    test('1. Send button disabled when input is empty', () => {
        render(<ChatApp />)
        const sendButton = screen.getByRole('button', { name: /send/i })
        expect(sendButton).toBeDisabled()

        const textarea = screen.getByPlaceholderText(/type your message/i)
        fireEvent.change(textarea, { target: { value: 'Hello' } })
        expect(sendButton).not.toBeDisabled()

        fireEvent.change(textarea, { target: { value: '   ' } })
        expect(sendButton).toBeDisabled()
    })

    test('2. Send button disabled during loading', async () => {
        // Specific mock for this test to avoid history.map error
        ; (global.fetch as jest.Mock).mockImplementation((url) => {
            if (typeof url === 'string' && url.endsWith('/sessions')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve([]),
                })
            }
            return new Promise(resolve => setTimeout(() => resolve({
                ok: true,
                json: () => Promise.resolve({ response: 'AI response', session_id: 123 })
            }), 100))
        })

        render(<ChatApp />)
        const textarea = screen.getByPlaceholderText(/type your message/i)
        const sendButton = screen.getByRole('button', { name: /send/i })

        fireEvent.change(textarea, { target: { value: 'Hello' } })
        fireEvent.click(sendButton)

        // It should be loading
        expect(screen.getByTestId('typing-bubble')).toBeInTheDocument()
        expect(sendButton).toBeDisabled()
        expect(textarea).toBeDisabled()

        // After some time, typing bubble should disappear
        await waitFor(() => {
            expect(screen.queryByTestId('typing-bubble')).not.toBeInTheDocument()
        }, { timeout: 2000 })

        // Button is still disabled because input is empty, but textarea should be enabled again
        expect(textarea).not.toBeDisabled()
    })

    test('3. User message appears after sending', async () => {
        render(<ChatApp />)
        const textarea = screen.getByPlaceholderText(/type your message/i)
        const sendButton = screen.getByRole('button', { name: /send/i })

        fireEvent.change(textarea, { target: { value: 'Unique User Message' } })
        fireEvent.click(sendButton)

        await waitFor(() => {
            expect(textarea).toHaveValue('')
            expect(screen.getByText('Unique User Message')).toBeInTheDocument()
        })
    })

    test('4. Assistant message appears after API response', async () => {
        ; (global.fetch as jest.Mock).mockImplementation((url) => {
            if (typeof url === 'string' && url.endsWith('/chat')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ response: 'Mocked AI Response', session_id: 123 })
                })
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
        })

        render(<ChatApp />)
        const textarea = screen.getByPlaceholderText(/type your message/i)
        const sendButton = screen.getByRole('button', { name: /send/i })

        fireEvent.change(textarea, { target: { value: 'Hello' } })
        fireEvent.click(sendButton)

        await waitFor(() => {
            expect(screen.getByText('Mocked AI Response')).toBeInTheDocument()
        })
    })

    test('5. Error message on fetch failure', async () => {
        ; (global.fetch as jest.Mock).mockImplementation((url) => {
            if (typeof url === 'string' && url.endsWith('/chat')) {
                return Promise.reject(new Error('Fetch failed'))
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
        })

        render(<ChatApp />)
        const textarea = screen.getByPlaceholderText(/type your message/i)
        const sendButton = screen.getByRole('button', { name: /send/i })

        fireEvent.change(textarea, { target: { value: 'Hello' } })
        fireEvent.click(sendButton)

        await waitFor(() => {
            expect(screen.getByText(/Error: Unable to reach the server/i)).toBeInTheDocument()
        })
    })

    test('6. "New Chat" resets conversation', async () => {
        render(<ChatApp />)
        const textarea = screen.getByPlaceholderText(/type your message/i)
        const sendButton = screen.getByRole('button', { name: /send/i })

        // Add a message first
        fireEvent.change(textarea, { target: { value: 'Message to clear' } })
        fireEvent.click(sendButton)

        await waitFor(() => {
            expect(screen.getByText('Message to clear')).toBeInTheDocument()
        })

        // Click New Chat
        const newChatButton = screen.getByRole('button', { name: /new chat/i })
        fireEvent.click(newChatButton)

        // Check if message is gone
        await waitFor(() => {
            expect(screen.queryByText('Message to clear')).not.toBeInTheDocument()
            expect(screen.getByText(/Welcome to Chapka/i)).toBeInTheDocument()
        })
    })

    test('7. Sidebar shows "No sessions yet" initially', () => {
        render(<ChatApp />)
        expect(screen.getByText('No sessions yet')).toBeInTheDocument()
    })

    test('8. Enter submits, Shift+Enter does not', async () => {
        render(<ChatApp />)
        const textarea = screen.getByPlaceholderText(/type your message/i)

        // Enter without Shift
        fireEvent.change(textarea, { target: { value: 'Submit this' } })
        fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })

        await waitFor(() => {
            expect(textarea).toHaveValue('')
            // Look for the text but NOT in the textarea
            const bubbles = document.querySelectorAll('.message-bubble-user')
            expect(Array.from(bubbles).some(b => b.textContent?.includes('Submit this'))).toBe(true)
        })

        // Shift + Enter
        fireEvent.change(textarea, { target: { value: 'Do not submit this' } })
        fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true })

        // Check if it did NOT trigger message sending
        expect(textarea).toHaveValue('Do not submit this')
        const bubbles = document.querySelectorAll('.message-bubble-user')
        // Only "Submit this" should be in bubbles
        expect(Array.from(bubbles).some(b => b.textContent?.includes('Do not submit this'))).toBe(false)
    })
})
