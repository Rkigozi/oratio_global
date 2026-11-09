import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ServiceNotices } from './service-notices';
import { getNoticeAdminState, saveServiceNotice, NoticeApiError } from '../services/service-notice';
import { formatNoticeWindow } from '@oratio/shared/service-notice';

vi.mock('../services/service-notice', async (original) => {
  const actual = await original<typeof import('../services/service-notice')>();
  return { ...actual, getNoticeAdminState: vi.fn(), saveServiceNotice: vi.fn() };
});
const getState = vi.mocked(getNoticeAdminState);
const save = vi.mocked(saveServiceNotice);
const empty = { notice: null, version: null, updatedAt: null };
const open = () =>
  render(
    <MemoryRouter>
      <ServiceNotices />
    </MemoryRouter>
  );

beforeEach(() => {
  vi.clearAllMocks();
  getState.mockResolvedValue(empty);
  save.mockResolvedValue();
});
afterEach(cleanup);

describe('service notice administration', () => {
  it('previews maintenance dates locally and publishes UTC instants separately from display times', async () => {
    open();
    await screen.findByRole('heading', { name: 'New notice' });
    fireEvent.change(screen.getByLabelText(/^Message/), {
      target: { value: 'Some features will be temporarily unavailable.' },
    });
    fireEvent.click(screen.getByLabelText('Include maintenance times'));
    expect(screen.getByRole('button', { name: 'Preview notice' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Maintenance starts'), {
      target: { value: '2030-01-02T23:30' },
    });
    fireEvent.change(screen.getByLabelText('Maintenance ends'), {
      target: { value: '2030-01-03T01:00' },
    });
    const maintenance = {
      startsAt: new Date('2030-01-02T23:30').toISOString(),
      endsAt: new Date('2030-01-03T01:00').toISOString(),
    };
    fireEvent.click(screen.getByRole('button', { name: 'Preview notice' }));
    expect(screen.getByRole('region', { name: 'Notice preview' })).toHaveTextContent(
      `Maintenance: ${formatNoticeWindow(maintenance)}`
    );
    expect(save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Publish notice' }));
    await waitFor(() =>
      expect(save).toHaveBeenCalledWith(expect.objectContaining({ maintenance }), null)
    );
    expect(save.mock.calls[0][0]?.startsAt).not.toBe(maintenance.startsAt);
  });

  it('requires both maintenance times in order and invalidates preview when changed or removed', async () => {
    open();
    await screen.findByRole('heading', { name: 'New notice' });
    fireEvent.change(screen.getByLabelText(/^Message/), { target: { value: 'Notice details' } });
    fireEvent.click(screen.getByLabelText('Include maintenance times'));
    fireEvent.change(screen.getByLabelText('Maintenance starts'), {
      target: { value: '2030-01-02T10:00' },
    });
    fireEvent.change(screen.getByLabelText('Maintenance ends'), {
      target: { value: '2030-01-02T09:00' },
    });
    expect(screen.getByRole('alert')).toHaveTextContent('end after the start');
    expect(screen.getByRole('button', { name: 'Preview notice' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Maintenance ends'), {
      target: { value: '2030-01-02T11:00' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Preview notice' }));
    expect(screen.getByRole('button', { name: 'Publish notice' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Maintenance ends'), {
      target: { value: '2030-01-02T12:00' },
    });
    expect(screen.queryByRole('button', { name: 'Publish notice' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Preview notice' }));
    fireEvent.click(screen.getByLabelText('Include maintenance times'));
    expect(screen.queryByRole('region', { name: 'Notice preview' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Preview notice' }));
    fireEvent.click(screen.getByRole('button', { name: 'Publish notice' }));
    await waitFor(() => expect(save).toHaveBeenCalled());
    expect(save.mock.calls[0][0]).not.toHaveProperty('maintenance');
  });

  it('shows the saved maintenance window separately from the banner display period', async () => {
    const maintenance = {
      startsAt: '2030-01-02T10:00:00.000Z',
      endsAt: '2030-01-02T11:00:00.000Z',
    };
    getState.mockResolvedValue({
      ...empty,
      notice: {
        id: 'd6449951-06f2-4cbd-a1ef-b49963f1828c',
        title: 'Maintenance',
        message: 'Notice details',
        startsAt: '2030-01-01T10:00:00.000Z',
        endsAt: '2030-01-02T12:00:00.000Z',
        maintenance,
      },
    });
    open();
    expect(
      await screen.findByText(`Maintenance: ${formatNoticeWindow(maintenance)}`)
    ).toBeVisible();
    expect(screen.getByText(/^Banner display:/)).toBeVisible();
  });

  it('requires preview and explicit publish, sending the current version', async () => {
    getState.mockResolvedValue({ ...empty, version: 'current-version' });
    open();
    await screen.findByRole('heading', { name: 'New notice' });
    fireEvent.change(screen.getByLabelText(/^Message/), {
      target: { value: 'Maintenance tonight' },
    });
    expect(screen.queryByRole('button', { name: 'Publish notice' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Preview notice' }));
    expect(screen.getByRole('region', { name: 'Notice preview' })).toBeInTheDocument();
    expect(save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Publish notice' }));
    await waitFor(() =>
      expect(save).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Maintenance tonight' }),
        'current-version'
      )
    );
    expect(await screen.findByText(/Notice saved/)).toBeInTheDocument();
  });
  it('keeps oversized text and explains the limit instead of silently truncating it', async () => {
    open();
    await screen.findByRole('heading', { name: 'New notice' });
    const input = screen.getByLabelText(/^Message/);
    fireEvent.change(input, { target: { value: 'x'.repeat(241) } });
    expect(input).toHaveValue('x'.repeat(241));
    expect(screen.getByRole('alert')).toHaveTextContent('Shorten the text');
    expect(screen.getByRole('button', { name: 'Preview notice' })).toBeDisabled();
    fireEvent.change(input, { target: { value: 'x'.repeat(240) } });
    expect(screen.getByRole('button', { name: 'Preview notice' })).not.toBeDisabled();
  });
  it('retains the draft after a failed publish', async () => {
    save.mockRejectedValue(new NoticeApiError('Offline. Your draft has been kept.', 503));
    open();
    await screen.findByRole('heading', { name: 'New notice' });
    fireEvent.change(screen.getByLabelText(/^Message/), { target: { value: 'Keep this message' } });
    fireEvent.click(screen.getByRole('button', { name: 'Preview notice' }));
    fireEvent.click(screen.getByRole('button', { name: 'Publish notice' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Offline');
    expect(screen.getByLabelText(/^Message/)).toHaveValue('Keep this message');
  });
  it('blocks stale writes until reload, preserving the draft during reload', async () => {
    save.mockRejectedValue(new NoticeApiError('This notice changed elsewhere.', 409));
    open();
    await screen.findByRole('heading', { name: 'New notice' });
    fireEvent.change(screen.getByLabelText(/^Message/), { target: { value: 'My draft' } });
    fireEvent.click(screen.getByRole('button', { name: 'Preview notice' }));
    fireEvent.click(screen.getByRole('button', { name: 'Publish notice' }));
    await screen.findByRole('alert');
    expect(screen.getByRole('button', { name: 'Publish notice' })).toBeDisabled();
    getState.mockResolvedValue({ ...empty, version: 'new-version' });
    fireEvent.click(screen.getByRole('button', { name: 'Reload current notice' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Publish notice' })).not.toBeDisabled()
    );
    expect(screen.getByLabelText(/^Message/)).toHaveValue('My draft');
  });
  it('hides editing for unauthorized accounts', async () => {
    getState.mockRejectedValue(new NoticeApiError('Forbidden', 403));
    open();
    expect(await screen.findByText('Notice administrator access required')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Preview notice' })).not.toBeInTheDocument();
    expect(save).not.toHaveBeenCalled();
  });
});
