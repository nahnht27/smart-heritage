import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FeedbackPage from '../FeedbackPage'
import * as feedbackService from '../../services/feedbackService'
import type { FeedbackItem } from '../../types/feedback'

vi.mock('../../services/feedbackService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/feedbackService')>()
  return {
    ...actual,
    getAllFeedback: vi.fn(),
    moderateFeedback: vi.fn(),
    createFeedbackItem: vi.fn(),
    updateFeedbackItem: vi.fn(),
    deleteFeedbackItem: vi.fn(),
  }
})

const mockItems: FeedbackItem[] = [
  {
    id: 1,
    code: 'F001',
    type: 'FEEDBACK',
    title: 'Great historical information',
    comment: 'The audio guide was very informative.',
    user: 'Nguyen Minh Anh',
    date: '2025-05-10',
    status: 'PENDING',
    rating: 5,
  },
  {
    id: 2,
    code: 'C001',
    type: 'CONTENT',
    title: 'About Smart Heritage',
    content: 'Smart Heritage platform details.',
    user: 'Admin',
    date: '2025-05-07',
    status: 'PUBLISHED',
  },
]

describe('FeedbackPage — Admin Feedback & Content Management', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(feedbackService.getAllFeedback).mockResolvedValue({
      items: mockItems,
      totalElements: 2,
      totalPages: 1,
    })
  })

  it('renders table with feedback items and columns matching wireframe', async () => {
    render(<FeedbackPage />)

    expect(
      screen.getByRole('heading', {
        name: 'Feedback / Content Management',
        level: 1,
      }),
    ).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('F001')).toBeInTheDocument()
    })

    expect(screen.getByText('Great historical information')).toBeInTheDocument()
    expect(screen.getByText('Nguyen Minh Anh')).toBeInTheDocument()
    expect(screen.getAllByText('Pending').length).toBeGreaterThan(0)
    expect(screen.getByText('C001')).toBeInTheDocument()
    expect(screen.getByText('About Smart Heritage')).toBeInTheDocument()
    expect(screen.getAllByText('Published').length).toBeGreaterThan(0)
  })

  it('moderates pending feedback via quick approve and reject buttons', async () => {
    vi.mocked(feedbackService.moderateFeedback).mockResolvedValueOnce({
      ...mockItems[0],
      status: 'APPROVED',
    })

    render(<FeedbackPage />)

    await waitFor(() => {
      expect(screen.getByTitle('Approve feedback')).toBeInTheDocument()
    })

    const approveBtn = screen.getByTitle('Approve feedback')
    await userEvent.click(approveBtn)

    expect(feedbackService.moderateFeedback).toHaveBeenCalledWith(1, 'APPROVE')
  })

  it('filters feedback items by search query', async () => {
    render(<FeedbackPage />)

    const searchInput = screen.getByPlaceholderText('Search feedback...')
    await userEvent.type(searchInput, 'heritage')

    await waitFor(() => {
      expect(feedbackService.getAllFeedback).toHaveBeenCalledWith(
        expect.objectContaining({ q: 'heritage' }),
      )
    })
  })

  it('opens details modal when clicking view button', async () => {
    render(<FeedbackPage />)

    await waitFor(() => {
      expect(screen.getByLabelText('View F001')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByLabelText('View F001'))

    expect(screen.getByText(/Feedback Details — F001/i)).toBeInTheDocument()
    expect(screen.getByText('The audio guide was very informative.')).toBeInTheDocument()
  })

  it('opens add content modal and submits new content', async () => {
    vi.mocked(feedbackService.createFeedbackItem).mockResolvedValueOnce({
      id: 3,
      code: 'C003',
      type: 'CONTENT',
      title: 'Museum Visiting Hours',
      content: 'Open from 8 AM to 5 PM daily.',
      user: 'Admin',
      date: '2025-05-11',
      status: 'PUBLISHED',
    })

    render(<FeedbackPage />)

    const addBtn = screen.getByRole('button', { name: /\+ Add Content/i })
    await userEvent.click(addBtn)

    expect(
      screen.getByRole('heading', {
        name: 'Add Content / Announcement',
        level: 2,
      }),
    ).toBeInTheDocument()

    const titleInput = screen.getByPlaceholderText('Enter title or topic')
    await userEvent.type(titleInput, 'Museum Visiting Hours')

    const saveBtn = screen.getByRole('button', { name: 'Create Item' })
    await userEvent.click(saveBtn)

    await waitFor(() => {
      expect(feedbackService.createFeedbackItem).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Museum Visiting Hours',
        }),
      )
    })
  })
})
