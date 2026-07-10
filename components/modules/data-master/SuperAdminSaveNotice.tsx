import { ShieldAlert } from 'lucide-react'

/**
 * Shown at the top of Data Master forms when the current user is a super admin.
 * Explains why required-field validation is not blocking saves (the resolver is
 * relaxed for super admins so blank fields can be saved during data cleanup).
 */
export function SuperAdminSaveNotice() {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-mvr-warning/30 bg-mvr-warning-light px-4 py-2.5">
      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-mvr-warning" />
      <p className="text-xs text-mvr-olive">
        <span className="font-semibold">Super admin override.</span> Required-field checks are off — you can save
        with blank fields. Some records may be left incomplete.
      </p>
    </div>
  )
}
