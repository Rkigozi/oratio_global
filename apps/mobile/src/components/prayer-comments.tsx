import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MessageCircle, Send, X } from 'lucide-react-native';
import {
  createComment,
  deleteComment,
  getCommentCount,
  getComments,
  subscribeToPrayerCommentChanges,
  toggleCommentsEnabled,
  updateComment,
  type Comment,
} from '@oratio/shared/queries';
import { timeAgo, type PrayerRequest } from '@oratio/shared/prayer-data';
import { WriteOutcomeError } from '@oratio/shared/write-outcome';
import { useAuth } from '../hooks/auth-context';
import { useBlockUser } from '../hooks/use-block-user';
import { asNativeIcon } from './icon';
import { Avatar } from './avatar';
import { ContentReportSheet } from './content-report-sheet';
import { useRecoverableWrite } from '../hooks/use-recoverable-write';
import { withRequestTimeout } from '../services/request-timeout';
import { WriteRecovery } from './write-recovery';
import { colors, fontFamilies } from '../theme';

const PAGE_SIZE = 20;
const MessageIcon = asNativeIcon(MessageCircle);
const SendIcon = asNativeIcon(Send);
const XIcon = asNativeIcon(X);

type ReplyTarget = {
  parentId: string;
  username: string;
};

type CommentIntent =
  | { kind: 'create'; body: string; parentId: string | null }
  | { kind: 'edit'; comment: Comment; body: string }
  | { kind: 'delete'; comment: Comment }
  | { kind: 'toggle'; enabled: boolean };
type CommentResult =
  | { kind: 'create'; comment: Comment; body: string }
  | { kind: 'edit'; comment: Comment; body: string }
  | { kind: 'delete'; comment: Comment }
  | { kind: 'toggle'; enabled: boolean };

export function PrayerComments({
  prayer,
  onBlocked,
  readOnly = false,
}: {
  prayer: PrayerRequest;
  onBlocked?: () => void;
  readOnly?: boolean;
}) {
  const { profile, user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [total, setTotal] = useState(prayer.commentCount ?? 0);
  const [draft, setDraft] = useState('');
  const [replyTo, setReplyTo] = useState<ReplyTarget | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [busyDeleteId, setBusyDeleteId] = useState<string | null>(null);
  const [reportTargetId, setReportTargetId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [readError, setReadError] = useState('');
  const [commentsEnabled, setCommentsEnabled] = useState(prayer.commentsEnabled !== false);
  const [togglingComments, setTogglingComments] = useState(false);
  const loadedLimitRef = useRef(PAGE_SIZE);
  const readRequest = useRef(0);
  const readBusy = useRef(false);
  const currentScope = useRef('');
  const scope = `${user?.id ?? ''}:${prayer.id}`;
  currentScope.current = scope;
  const isPrivate = prayer.audience === 'private';
  const writes = useRecoverableWrite<CommentIntent, CommentResult>(
    prayer.id,
    user?.id,
    async (intent, attempt) => {
      if (intent.kind === 'create') {
        const comment = await createComment(
          { prayer_id: prayer.id, body: intent.body, parent_id: intent.parentId },
          attempt
        );
        if (!comment) throw new WriteOutcomeError(false);
        return { kind: 'create', comment, body: intent.body };
      }
      if (intent.kind === 'edit') {
        const comment = await updateComment(intent.comment.id, intent.body, {
          ...attempt,
          expectedUpdatedAt: intent.comment.updated_at,
        });
        if (!comment) throw new WriteOutcomeError(false);
        return { kind: 'edit', comment, body: intent.body };
      }
      if (intent.kind === 'delete') {
        if (!(await deleteComment(intent.comment.id, attempt))) throw new WriteOutcomeError(false);
        return intent;
      }
      if (!(await toggleCommentsEnabled(prayer.id, intent.enabled, attempt)))
        throw new WriteOutcomeError(false);
      return intent;
    }
  );
  const commentsAvailable = readOnly || prayer.audience !== 'public' || commentsEnabled;
  const canModerate =
    !!user &&
    (prayer.authorId
      ? prayer.authorId === user.id
      : !!prayer.username && prayer.username === profile?.username);
  const canToggleComments = !readOnly && prayer.audience === 'public' && canModerate;
  const { blocking, confirmBlock } = useBlockUser(() => {
    setComments([]);
    setReplyTo(null);
    setEditingId(null);
    if (onBlocked) onBlocked();
    else void load();
  });

  useEffect(() => {
    setCommentsEnabled(prayer.commentsEnabled !== false);
  }, [prayer.commentsEnabled]);

  const load = useCallback(
    async (limit = loadedLimitRef.current) => {
      const request = ++readRequest.current;
      const active = () => request === readRequest.current && currentScope.current === scope;
      readBusy.current = true;
      setLoadingMore(false);
      setReadError('');
      try {
        const [nextComments, nextTotal] = await withRequestTimeout(
          Promise.all([
            getComments(prayer.id, limit, 0, { throwOnError: true }),
            getCommentCount(prayer.id, { throwOnError: true }),
          ])
        );
        if (!active()) return;
        setComments(nextComments);
        setTotal(nextTotal);
        loadedLimitRef.current = Math.max(PAGE_SIZE, nextComments.length);
      } catch {
        if (active())
          setReadError(isPrivate ? "We couldn't load your notes." : "We couldn't load comments.");
      } finally {
        if (active()) {
          readBusy.current = false;
          setLoading(false);
        }
      }
    },
    [isPrivate, prayer.id, scope]
  );

  useEffect(() => {
    setLoading(true);
    setError('');
    setComments([]);
    setDraft('');
    setReplyTo(null);
    setEditingId(null);
    setEditText('');
    setSubmitting(false);
    setSavingEdit(false);
    setBusyDeleteId(null);
    setTogglingComments(false);
    loadedLimitRef.current = PAGE_SIZE;
    void load(PAGE_SIZE);
    return () => {
      readRequest.current += 1;
    };
  }, [load]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = subscribeToPrayerCommentChanges(prayer.id, () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void load(), 250);
    });

    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe();
    };
  }, [load, prayer.id]);

  const loadMore = async () => {
    if (readBusy.current || comments.length >= total) return;
    const request = ++readRequest.current;
    const active = () => request === readRequest.current && currentScope.current === scope;
    readBusy.current = true;
    setLoadingMore(true);
    setReadError('');
    try {
      const more = await withRequestTimeout(
        getComments(prayer.id, PAGE_SIZE, comments.length, { throwOnError: true })
      );
      if (!active()) return;
      setComments((current) => [
        ...current,
        ...more.filter((item) => !current.some((existing) => existing.id === item.id)),
      ]);
      loadedLimitRef.current = Math.max(PAGE_SIZE, comments.length + more.length);
    } catch {
      if (active())
        setReadError(
          isPrivate ? "We couldn't load more notes." : "We couldn't load more comments."
        );
    } finally {
      if (active()) {
        readBusy.current = false;
        setLoadingMore(false);
      }
    }
  };

  const completeWrite = (result: Awaited<ReturnType<typeof writes.run>>) => {
    if (result.status === 'failed') {
      setError("We couldn't save that change. Your draft has been kept.");
      return;
    }
    if (result.status !== 'saved') return;
    const value = result.value;
    if (value.kind === 'create') {
      const created = value.comment;
      const withProfile = created.user
        ? created
        : {
            ...created,
            user: profile
              ? { username: profile.username, display_name: profile.display_name, avatar_url: null }
              : null,
          };
      setComments((current) =>
        current.some((item) => item.id === created.id)
          ? current.map((item) => (item.id === created.id ? withProfile : item))
          : [...current, withProfile]
      );
      setTotal((current) =>
        Math.max(
          current,
          comments.length + (comments.some((item) => item.id === created.id) ? 0 : 1)
        )
      );
      loadedLimitRef.current += 1;
      setDraft((current) => (current.trim() === value.body ? '' : current));
      setReplyTo(null);
    } else if (value.kind === 'edit') {
      setComments((current) =>
        current.map((item) =>
          item.id === value.comment.id
            ? { ...value.comment, user: value.comment.user ?? item.user }
            : item
        )
      );
      setEditingId(null);
      setEditText('');
    } else if (value.kind === 'delete') {
      setComments((current) =>
        current.filter(
          (item) => item.id !== value.comment.id && item.parent_id !== value.comment.id
        )
      );
      if (replyTo?.parentId === value.comment.id) setReplyTo(null);
    } else {
      setCommentsEnabled(value.enabled);
    }
    void load();
  };

  const submit = async () => {
    const body = draft.trim();
    if (!body || writes.isLocked()) return;
    setSubmitting(true);
    setError('');
    const result = await writes.run({
      kind: 'create',
      body,
      parentId: isPrivate ? null : (replyTo?.parentId ?? null),
    });
    if (result.status === 'ignored') return;
    completeWrite(result);
    setSubmitting(false);
  };

  const startEdit = (comment: Comment) => {
    if (writes.isLocked()) return;
    setEditingId(comment.id);
    setEditText(comment.body);
    setError('');
  };

  const cancelEdit = () => {
    if (writes.isLocked()) return;
    setEditingId(null);
    setEditText('');
  };

  const saveEdit = async (comment: Comment) => {
    if (writes.isLocked()) return;
    const body = editText.trim();
    if (!body) {
      setError(isPrivate ? 'A note cannot be empty.' : 'A comment cannot be empty.');
      return;
    }
    if (body === comment.body) {
      cancelEdit();
      return;
    }

    setSavingEdit(true);
    setError('');
    const result = await writes.run({ kind: 'edit', comment, body });
    if (result.status === 'ignored') return;
    completeWrite(result);
    setSavingEdit(false);
  };

  const remove = async (comment: Comment) => {
    if (writes.isLocked()) return;
    setBusyDeleteId(comment.id);
    setError('');
    const result = await writes.run({ kind: 'delete', comment });
    if (result.status === 'ignored') return;
    completeWrite(result);
    setBusyDeleteId(null);
  };

  const confirmDelete = (comment: Comment) => {
    if (writes.isLocked()) return;
    const own = comment.user_id === user?.id;
    const noun = isPrivate ? 'note' : 'comment';
    Alert.alert(
      `${own ? 'Delete' : 'Remove'} ${noun}?`,
      `This ${noun} will be removed permanently.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: own ? 'Delete' : 'Remove',
          style: 'destructive',
          onPress: () => void remove(comment),
        },
      ]
    );
  };

  const toggleComments = async (enabled: boolean) => {
    if (!canToggleComments || writes.isLocked()) return;
    setTogglingComments(true);
    setError('');
    const result = await writes.run({ kind: 'toggle', enabled });
    if (result.status === 'ignored') return;
    completeWrite(result);
    setTogglingComments(false);
  };

  const topLevel = comments.filter((comment) => !comment.parent_id);
  const repliesFor = (id: string) => comments.filter((comment) => comment.parent_id === id);
  const sectionLabel = isPrivate ? 'Notes' : 'Comments';

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <MessageIcon color={colors.textDim} size={14} strokeWidth={1.7} />
        <Text style={styles.sectionLabel}>
          {sectionLabel} ({total})
        </Text>
        {canToggleComments ? (
          <Switch
            accessibilityLabel="Allow comments"
            disabled={togglingComments || writes.locked}
            onValueChange={(enabled) => void toggleComments(enabled)}
            thumbColor={commentsEnabled ? colors.accent : colors.textDim}
            trackColor={{ false: colors.surfaceBorder, true: colors.accentDark }}
            value={commentsEnabled}
          />
        ) : null}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {writes.uncertain ? (
        <WriteRecovery busy={writes.busy} onRetry={() => void writes.retry().then(completeWrite)} />
      ) : null}
      {readError ? (
        <View>
          <Text accessibilityRole="alert" style={styles.error}>
            {readError}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void load()}
            style={styles.loadMoreButton}
          >
            <Text style={styles.loadMoreText}>{isPrivate ? 'Retry notes' : 'Retry comments'}</Text>
          </Pressable>
        </View>
      ) : null}

      {!commentsAvailable ? (
        <Text style={styles.emptyText}>Comments are off for this prayer.</Text>
      ) : loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={colors.accent} size="small" />
        </View>
      ) : (
        <>
          {topLevel.length === 0 && !readError ? (
            <Text style={styles.emptyText}>
              {isPrivate ? 'No notes yet.' : 'No comments yet. Be the first to encourage them.'}
            </Text>
          ) : (
            <View style={styles.threadList}>
              {topLevel.map((comment) => (
                <CommentThread
                  key={comment.id}
                  busyDeleteId={busyDeleteId}
                  canModerate={canModerate}
                  comment={comment}
                  currentUserId={user?.id}
                  editText={editText}
                  editingId={editingId}
                  isPrivate={isPrivate}
                  readOnly={readOnly}
                  onCancelEdit={cancelEdit}
                  onChangeEdit={(value) => {
                    if (writes.isLocked()) return;
                    setEditText(value);
                    setError('');
                  }}
                  onDelete={confirmDelete}
                  onReply={(parentId, username) => {
                    if (!writes.isLocked()) setReplyTo({ parentId, username });
                  }}
                  onReport={setReportTargetId}
                  onBlock={(comment) => {
                    if (!blocking) confirmBlock(comment.user_id, comment.user?.username);
                  }}
                  onSaveEdit={(target) => void saveEdit(target)}
                  onStartEdit={startEdit}
                  replies={repliesFor(comment.id)}
                  savingEdit={savingEdit || writes.locked}
                />
              ))}
            </View>
          )}

          {comments.length < total ? (
            <Pressable
              accessibilityRole="button"
              disabled={loadingMore}
              onPress={() => void loadMore()}
              style={styles.loadMoreButton}
            >
              {loadingMore ? (
                <ActivityIndicator color={colors.accent} size="small" />
              ) : (
                <Text style={styles.loadMoreText}>Load more comments</Text>
              )}
            </Pressable>
          ) : null}

          {!readOnly && replyTo ? (
            <View style={styles.replyingRow}>
              <Text numberOfLines={1} style={styles.replyingText}>
                Replying to @{replyTo.username}
              </Text>
              <Pressable
                accessibilityLabel="Cancel reply"
                accessibilityRole="button"
                hitSlop={8}
                disabled={writes.locked}
                onPress={() => setReplyTo(null)}
                style={styles.cancelReplyButton}
              >
                <XIcon color={colors.textDim} size={15} strokeWidth={1.8} />
              </Pressable>
            </View>
          ) : null}

          {!readOnly && (
            <View style={styles.composer}>
              <View style={styles.inputShell}>
                <TextInput
                  editable={!writes.locked}
                  maxLength={500}
                  multiline
                  onChangeText={(value) => {
                    setDraft(value);
                    setError('');
                  }}
                  placeholder={
                    isPrivate
                      ? 'Add a note...'
                      : replyTo
                        ? 'Write a reply...'
                        : 'Write an encouragement...'
                  }
                  placeholderTextColor={colors.textDim}
                  style={styles.input}
                  textAlignVertical="top"
                  value={draft}
                />
                <Text style={styles.counter}>{draft.length}/500</Text>
              </View>
              <Pressable
                accessibilityLabel={
                  isPrivate ? 'Save note' : replyTo ? 'Post reply' : 'Post comment'
                }
                accessibilityRole="button"
                disabled={!draft.trim() || submitting || writes.locked}
                onPress={() => void submit()}
                style={({ pressed }) => [
                  styles.sendButton,
                  draft.trim() && styles.sendButtonActive,
                  pressed && draft.trim() && styles.sendButtonPressed,
                  (!draft.trim() || submitting) && styles.disabled,
                ]}
              >
                {submitting ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <SendIcon
                    color={draft.trim() ? colors.white : colors.textDim}
                    size={17}
                    strokeWidth={1.8}
                  />
                )}
              </Pressable>
            </View>
          )}
        </>
      )}
      <ContentReportSheet
        onClose={() => setReportTargetId(null)}
        reportableId={reportTargetId || ''}
        reportableType="comment"
        visible={Boolean(reportTargetId)}
      />
    </View>
  );
}

function CommentThread({
  comment,
  replies,
  currentUserId,
  canModerate,
  isPrivate,
  readOnly,
  editingId,
  editText,
  savingEdit,
  busyDeleteId,
  onReply,
  onReport,
  onBlock,
  onStartEdit,
  onChangeEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
}: {
  comment: Comment;
  replies: Comment[];
  currentUserId?: string;
  canModerate: boolean;
  isPrivate: boolean;
  readOnly: boolean;
  editingId: string | null;
  editText: string;
  savingEdit: boolean;
  busyDeleteId: string | null;
  onReply: (parentId: string, username: string) => void;
  onReport: (commentId: string) => void;
  onBlock: (comment: Comment) => void;
  onStartEdit: (comment: Comment) => void;
  onChangeEdit: (value: string) => void;
  onCancelEdit: () => void;
  onSaveEdit: (comment: Comment) => void;
  onDelete: (comment: Comment) => void;
}) {
  return (
    <View style={styles.thread}>
      <CommentEntry
        busyDelete={busyDeleteId === comment.id}
        canModerate={canModerate}
        comment={comment}
        currentUserId={currentUserId}
        editText={editText}
        editing={!readOnly && editingId === comment.id}
        isPrivate={isPrivate}
        readOnly={readOnly}
        onCancelEdit={onCancelEdit}
        onChangeEdit={onChangeEdit}
        onDelete={onDelete}
        onReply={() =>
          onReply(comment.id, comment.user?.username || comment.user?.display_name || 'user')
        }
        onReport={() => onReport(comment.id)}
        onBlock={() => onBlock(comment)}
        onSaveEdit={onSaveEdit}
        onStartEdit={onStartEdit}
        savingEdit={savingEdit}
      />
      {!isPrivate && replies.length > 0 ? (
        <View style={styles.replies}>
          {replies.map((reply) => (
            <CommentEntry
              key={reply.id}
              busyDelete={busyDeleteId === reply.id}
              canModerate={canModerate}
              comment={reply}
              compact
              currentUserId={currentUserId}
              editText={editText}
              editing={!readOnly && editingId === reply.id}
              isPrivate={false}
              readOnly={readOnly}
              onCancelEdit={onCancelEdit}
              onChangeEdit={onChangeEdit}
              onDelete={onDelete}
              onReply={() =>
                onReply(comment.id, reply.user?.username || reply.user?.display_name || 'user')
              }
              onReport={() => onReport(reply.id)}
              onBlock={() => onBlock(reply)}
              onSaveEdit={onSaveEdit}
              onStartEdit={onStartEdit}
              savingEdit={savingEdit}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function CommentEntry({
  comment,
  currentUserId,
  canModerate,
  isPrivate,
  readOnly,
  compact = false,
  editing,
  editText,
  savingEdit,
  busyDelete,
  onReply,
  onReport,
  onBlock,
  onStartEdit,
  onChangeEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
}: {
  comment: Comment;
  currentUserId?: string;
  canModerate: boolean;
  isPrivate: boolean;
  readOnly: boolean;
  compact?: boolean;
  editing: boolean;
  editText: string;
  savingEdit: boolean;
  busyDelete: boolean;
  onReply: () => void;
  onReport: () => void;
  onBlock: () => void;
  onStartEdit: (comment: Comment) => void;
  onChangeEdit: (value: string) => void;
  onCancelEdit: () => void;
  onSaveEdit: (comment: Comment) => void;
  onDelete: (comment: Comment) => void;
}) {
  const username = comment.user?.username || comment.user?.display_name || 'user';
  const displayName = comment.user?.display_name || username;
  const own = comment.user_id === currentUserId;
  const canDelete = own || canModerate;
  const edited =
    new Date(comment.updated_at).getTime() - new Date(comment.created_at).getTime() >= 1000;

  if (isPrivate) {
    return (
      <View style={styles.noteRow}>
        <View style={styles.noteMeta}>
          <Text style={styles.entryTime}>{timeAgo(comment.created_at)}</Text>
          {edited ? <Text style={styles.edited}>Edited</Text> : null}
        </View>
        <EntryBody
          comment={comment}
          editing={editing}
          editText={editText}
          onCancelEdit={onCancelEdit}
          onChangeEdit={onChangeEdit}
          onSaveEdit={onSaveEdit}
          savingEdit={savingEdit}
        />
        {!editing && !readOnly ? (
          <View style={styles.entryActions}>
            <TextAction label="Edit" onPress={() => onStartEdit(comment)} />
            <TextAction
              danger
              disabled={busyDelete}
              label={busyDelete ? 'Deleting...' : 'Delete'}
              onPress={() => onDelete(comment)}
            />
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.entry}>
      <Avatar name={displayName} size={compact ? 22 : 28} uri={comment.user?.avatar_url} />
      <View style={styles.entryCopy}>
        <View style={styles.entryMeta}>
          <Text numberOfLines={1} style={styles.entryUsername}>
            @{username}
          </Text>
          <Text style={styles.entryTime}>{timeAgo(comment.created_at)}</Text>
          {edited ? <Text style={styles.edited}>Edited</Text> : null}
        </View>
        <EntryBody
          comment={comment}
          editing={editing}
          editText={editText}
          onCancelEdit={onCancelEdit}
          onChangeEdit={onChangeEdit}
          onSaveEdit={onSaveEdit}
          savingEdit={savingEdit}
        />
        {!editing && !readOnly ? (
          <View style={styles.entryActions}>
            <TextAction label="Reply" onPress={onReply} />
            {own ? <TextAction label="Edit" onPress={() => onStartEdit(comment)} /> : null}
            {canDelete ? (
              <TextAction
                danger
                disabled={busyDelete}
                label={busyDelete ? 'Removing...' : own ? 'Delete' : 'Remove'}
                onPress={() => onDelete(comment)}
              />
            ) : null}
            {!own && !canModerate ? <TextAction label="Report" onPress={onReport} /> : null}
            {!own && currentUserId ? (
              <TextAction danger label="Block user" onPress={onBlock} />
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

function EntryBody({
  comment,
  editing,
  editText,
  savingEdit,
  onChangeEdit,
  onCancelEdit,
  onSaveEdit,
}: {
  comment: Comment;
  editing: boolean;
  editText: string;
  savingEdit: boolean;
  onChangeEdit: (value: string) => void;
  onCancelEdit: () => void;
  onSaveEdit: (comment: Comment) => void;
}) {
  if (!editing) return <Text style={styles.entryBody}>{comment.body}</Text>;

  return (
    <View style={styles.editBlock}>
      <TextInput
        maxLength={500}
        multiline
        onChangeText={onChangeEdit}
        style={styles.editInput}
        textAlignVertical="top"
        value={editText}
      />
      <View style={styles.editActions}>
        <Text style={styles.editCounter}>{editText.length}/500</Text>
        <TextAction disabled={savingEdit} label="Cancel" onPress={onCancelEdit} />
        <TextAction
          disabled={savingEdit || !editText.trim()}
          label={savingEdit ? 'Saving...' : 'Save'}
          onPress={() => onSaveEdit(comment)}
          primary
        />
      </View>
    </View>
  );
}

function TextAction({
  label,
  onPress,
  disabled = false,
  danger = false,
  primary = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  danger?: boolean;
  primary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      hitSlop={{ top: 8, bottom: 8, left: 5, right: 5 }}
      onPress={onPress}
      style={disabled ? styles.disabled : undefined}
    >
      <Text
        style={[styles.actionText, primary && styles.actionPrimary, danger && styles.actionDanger]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 28,
    paddingTop: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 18,
  },
  sectionLabel: {
    flex: 1,
    color: colors.textMuted,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  loadingState: {
    minHeight: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: colors.textDim,
    fontFamily: fontFamilies.body,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    paddingVertical: 18,
  },
  error: {
    color: colors.danger,
    fontFamily: fontFamilies.body,
    fontSize: 11,
    lineHeight: 17,
    marginBottom: 12,
  },
  threadList: {
    gap: 20,
    marginBottom: 18,
  },
  thread: {
    gap: 11,
  },
  entry: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  entryCopy: {
    flex: 1,
    minWidth: 0,
  },
  entryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  entryUsername: {
    maxWidth: '58%',
    color: colors.textMuted,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 11,
  },
  entryTime: {
    color: colors.textDim,
    fontFamily: fontFamilies.body,
    fontSize: 9,
  },
  edited: {
    color: colors.textFaint,
    fontFamily: fontFamilies.body,
    fontSize: 9,
  },
  entryBody: {
    color: colors.textSecondary,
    fontFamily: fontFamilies.body,
    fontSize: 14,
    lineHeight: 21,
  },
  entryActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 18,
    minHeight: 32,
  },
  actionText: {
    color: colors.textDim,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 10,
    paddingVertical: 8,
  },
  actionPrimary: {
    color: colors.accent,
  },
  actionDanger: {
    color: colors.textFaint,
  },
  replies: {
    gap: 12,
    marginLeft: 37,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: colors.divider,
  },
  noteRow: {
    paddingVertical: 4,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  noteMeta: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 5,
  },
  editBlock: {
    gap: 6,
  },
  editInput: {
    minHeight: 72,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    fontFamily: fontFamilies.body,
    fontSize: 13,
    lineHeight: 19,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 8,
  },
  editActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 16,
  },
  editCounter: {
    flex: 1,
    color: colors.textDim,
    fontFamily: fontFamilies.body,
    fontSize: 9,
  },
  loadMoreButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadMoreText: {
    color: colors.accent,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 12,
  },
  replyingRow: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 4,
  },
  replyingText: {
    flex: 1,
    color: colors.textDim,
    fontFamily: fontFamilies.body,
    fontSize: 10,
  },
  cancelReplyButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginTop: 4,
  },
  inputShell: {
    flex: 1,
    minHeight: 48,
    position: 'relative',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 8,
  },
  input: {
    minHeight: 46,
    maxHeight: 112,
    paddingHorizontal: 12,
    paddingTop: 11,
    paddingBottom: 18,
    paddingRight: 48,
    color: colors.text,
    fontFamily: fontFamilies.body,
    fontSize: 13,
    lineHeight: 19,
  },
  counter: {
    position: 'absolute',
    right: 8,
    bottom: 5,
    color: colors.textFaint,
    fontFamily: fontFamilies.body,
    fontSize: 8,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  sendButtonActive: {
    backgroundColor: colors.accentDark,
  },
  sendButtonPressed: {
    backgroundColor: colors.accent,
  },
  disabled: {
    opacity: 0.45,
  },
});
