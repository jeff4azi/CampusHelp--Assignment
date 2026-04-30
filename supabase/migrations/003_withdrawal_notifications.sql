-- ═══════════════════════════════════════════════════════════════════════════
-- WITHDRAWAL NOTIFICATIONS
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Add withdrawal_paid to notifications type check ────────────────────
-- (notifications table uses text type so no enum change needed)

-- ── 2. TRIGGER: notify helper when withdrawal status changes to completed ──
create or replace function public.notify_withdrawal_completed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_amount_str text;
begin
  -- Only fire when status changes TO 'completed'
  if NEW.status = 'completed' and OLD.status != 'completed' then
    
    v_amount_str := '₦' || to_char(NEW.amount, 'FM999,999,999');

    -- In-app notification
    insert into public.notifications (user_id, type, title, body, ref_id)
    values (
      NEW.helper_id,
      'withdrawal_paid',
      'Withdrawal paid! 🎉',
      'Your withdrawal of ' || v_amount_str || ' has been processed and sent to your bank account.',
      NEW.id
    );

  end if;
  
  return NEW;
end;
$$;

drop trigger if exists on_withdrawal_completed on public.withdrawals;
create trigger on_withdrawal_completed
  after update on public.withdrawals
  for each row
  execute function public.notify_withdrawal_completed();

-- ── 3. TRIGGER: notify helper when withdrawal is first created (pending) ──
create or replace function public.notify_withdrawal_pending()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_amount_str text;
begin
  v_amount_str := '₦' || to_char(NEW.amount, 'FM999,999,999');

  -- In-app notification
  insert into public.notifications (user_id, type, title, body, ref_id)
  values (
    NEW.helper_id,
    'withdrawal_pending',
    'Withdrawal request received 💸',
    'Your withdrawal of ' || v_amount_str || ' is being processed. You will be notified once it is paid out (within 24 hours).',
    NEW.id
  );

  return NEW;
end;
$$;

drop trigger if exists on_withdrawal_created on public.withdrawals;
create trigger on_withdrawal_created
  after insert on public.withdrawals
  for each row
  execute function public.notify_withdrawal_pending();

-- ═══════════════════════════════════════════════════════════════════════════
-- EMAIL SETUP (via Supabase Auth Hooks or SMTP)
-- ═══════════════════════════════════════════════════════════════════════════
-- To send actual emails, go to:
-- Supabase Dashboard → Authentication → Email Templates
-- OR use a custom SMTP in Project Settings → Auth → SMTP Settings
--
-- For withdrawal emails specifically, you can use Supabase Edge Functions
-- triggered by the withdrawals table changes (see functions/paystack-webhook)
-- ═══════════════════════════════════════════════════════════════════════════
