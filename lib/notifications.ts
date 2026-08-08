/**
 * Shared in-app notification insert, used alongside (not instead of) the
 * transactional emails in lib/mail — the NotificationBell reads from the
 * same `notifications` table this writes to.
 */
export async function createNotification({
  supabase,
  userType,
  userId,
  title,
  message,
  type = 'system',
  link = null,
}: {
  supabase: any
  userType: 'client' | 'expert' | 'admin'
  userId: string | null
  title: string
  message: string
  type?: 'message' | 'session' | 'payment' | 'review' | 'system' | 'admin'
  link?: string | null
}) {
  const { error } = await supabase.from('notifications').insert({
    user_type: userType,
    user_id: userId,
    title: title.slice(0, 120),
    message: message.slice(0, 500),
    type,
    link,
  })

  if (error) {
    console.error('NOTIFICATION_CREATE_ERROR', { userType, userId, type, error })
  }
}
