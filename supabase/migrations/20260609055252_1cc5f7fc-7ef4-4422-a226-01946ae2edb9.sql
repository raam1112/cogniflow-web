CREATE POLICY "Users insert own reminders" ON public.reminder_log
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own reminders" ON public.reminder_log
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own reminders" ON public.reminder_log
FOR DELETE TO authenticated
USING (auth.uid() = user_id);