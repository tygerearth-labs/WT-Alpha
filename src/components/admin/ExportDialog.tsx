'use client';

import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import {
  Download,
  FileDown,
  Loader2,
  Database,
  CalendarRange,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const EXPORT_TYPES = [
  { value: 'users', label: 'Users', icon: '👥', color: '#03DAC6', description: 'User accounts, plans, and activity' },
  { value: 'activity', label: 'Activity Log', icon: '📋', color: '#BB86FC', description: 'Admin action audit trail' },
  { value: 'announcements', label: 'Announcements', icon: '📢', color: '#FFD700', description: 'Platform announcements and notices' },
  { value: 'subscriptions', label: 'Subscriptions', icon: '💳', color: '#CF6679', description: 'Active and expired subscriptions' },
] as const;

const FORMATS = [
  { value: 'csv', label: 'CSV', description: 'Spreadsheet-compatible format' },
  { value: 'json', label: 'JSON', description: 'Structured data with metadata' },
] as const;

interface ExportDialogProps {
  trigger?: React.ReactNode;
}

export function ExportDialog({ trigger }: ExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [exportType, setExportType] = useState<string>('users');
  const [format, setFormat] = useState<string>('csv');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);

  const selectedTypeInfo = EXPORT_TYPES.find((t) => t.value === exportType);

  const fetchPreviewCount = useCallback(async () => {
    if (!exportType) return;
    setLoadingPreview(true);
    setPreviewCount(null);

    try {
      const filters: Record<string, unknown> = {};
      if (dateFrom) filters.dateFrom = dateFrom.toISOString();
      if (dateTo) filters.dateTo = dateTo.toISOString();
      if (exportType === 'activity') {
        // We don't have a count-only endpoint, so we'll just show a message
        setPreviewCount(-1);
        setLoadingPreview(false);
        return;
      }

      // For preview count, we use the stats endpoint for users
      if (exportType === 'users') {
        const res = await fetch('/api/admin/stats');
        if (res.ok) {
          const data = await res.json();
          setPreviewCount(data.totalUsers || 0);
        }
      } else {
        setPreviewCount(-1);
      }
    } catch {
      setPreviewCount(-1);
    } finally {
      setLoadingPreview(false);
    }
  }, [exportType, dateFrom, dateTo]);

  // Fetch preview when dialog opens or type/filters change
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      fetchPreviewCount();
    }
  };

  const handleTypeChange = (value: string) => {
    setExportType(value);
    setPreviewCount(null);
  };

  const handleFormatChange = (value: string) => {
    setFormat(value);
  };

  const handleDateChange = () => {
    setShowCalendar(false);
    fetchPreviewCount();
  };

  const clearDateRange = () => {
    setDateFrom(undefined);
    setDateTo(undefined);
    setPreviewCount(null);
    setTimeout(fetchPreviewCount, 100);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const filters: Record<string, unknown> = {};
      if (dateFrom) filters.dateFrom = dateFrom.toISOString();
      if (dateTo) filters.dateTo = dateTo.toISOString();

      const res = await fetch('/api/admin/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: exportType,
          format,
          filters,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Export failed');
      }

      // Get the filename from the Content-Disposition header
      const disposition = res.headers.get('Content-Disposition');
      let filename = `export_${exportType}_${Date.now()}.${format}`;
      if (disposition) {
        const match = disposition.match(/filename="(.+?)"/);
        if (match) filename = match[1];
      }

      // Download the file
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Export completed', {
        description: `${selectedTypeInfo?.label || exportType} data exported as ${format.toUpperCase()}`,
      });

      setOpen(false);
    } catch (error) {
      toast.error('Export failed', {
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            size="sm"
            className="h-8 gap-1.5 text-[11px] rounded-lg bg-[#BB86FC]/10 border border-[#BB86FC]/20 text-[#BB86FC] hover:bg-[#BB86FC]/20 hover:text-[#BB86FC] transition-all"
          >
            <FileDown className="h-3 w-3" />
            Export Data
          </Button>
        )}
      </DialogTrigger>
      <DialogContent
        className="sm:max-w-[480px] p-0 gap-0 overflow-hidden bg-[#0D0D0D]/95 backdrop-blur-xl border-white/[0.08] shadow-[0_16px_64px_rgba(0,0,0,0.6)]"
      >
        {/* Header gradient accent */}
        <div className="h-px bg-gradient-to-r from-transparent via-[#BB86FC]/40 to-transparent" />

        <DialogHeader className="p-5 pb-0">
          <DialogTitle className="text-[15px] font-bold text-white/90 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#BB86FC]/10 flex items-center justify-center">
              <Database className="h-4 w-4 text-[#BB86FC]" />
            </div>
            Export Data
          </DialogTitle>
          <DialogDescription className="text-[12px] text-white/35 mt-1.5">
            Choose what to export and the output format. Large exports may take a moment.
          </DialogDescription>
        </DialogHeader>

        <div className="p-5 space-y-4">
          {/* Export Type */}
          <div className="space-y-2">
            <label className="text-[11px] font-semibold uppercase tracking-widest text-white/30">
              Export Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {EXPORT_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => handleTypeChange(t.value)}
                  className={cn(
                    'relative flex flex-col items-start gap-1.5 p-3 rounded-xl border transition-all text-left',
                    exportType === t.value
                      ? 'border-white/[0.15] bg-white/[0.04]'
                      : 'border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/[0.08]',
                  )}
                >
                  {exportType === t.value && (
                    <div
                      className="absolute top-0 left-0 right-0 h-px"
                      style={{ background: `linear-gradient(90deg, transparent, ${t.color}60, transparent)` }}
                    />
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-base">{t.icon}</span>
                    <span
                      className={cn(
                        'text-[12px] font-semibold',
                        exportType === t.value ? 'text-white/90' : 'text-white/50',
                      )}
                    >
                      {t.label}
                    </span>
                  </div>
                  <span className="text-[10px] text-white/25 leading-snug">{t.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Format */}
          <div className="space-y-2">
            <label className="text-[11px] font-semibold uppercase tracking-widest text-white/30">
              Format
            </label>
            <div className="grid grid-cols-2 gap-2">
              {FORMATS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => handleFormatChange(f.value)}
                  className={cn(
                    'relative flex items-center gap-2.5 p-3 rounded-xl border transition-all text-left',
                    format === f.value
                      ? 'border-[#03DAC6]/30 bg-[#03DAC6]/[0.04]'
                      : 'border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/[0.08]',
                  )}
                >
                  <div
                    className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black',
                      format === f.value
                        ? 'bg-[#03DAC6]/15 text-[#03DAC6]'
                        : 'bg-white/[0.04] text-white/30',
                    )}
                  >
                    {f.value.toUpperCase()}
                  </div>
                  <div>
                    <span
                      className={cn(
                        'text-[12px] font-semibold block',
                        format === f.value ? 'text-white/90' : 'text-white/50',
                      )}
                    >
                      {f.label}
                    </span>
                    <span className="text-[10px] text-white/25">{f.description}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold uppercase tracking-widest text-white/30 flex items-center gap-1.5">
                <CalendarRange className="h-3 w-3" />
                Date Range (optional)
              </label>
              {(dateFrom || dateTo) && (
                <button
                  onClick={clearDateRange}
                  className="text-[10px] text-[#CF6679]/70 hover:text-[#CF6679] transition-colors flex items-center gap-1"
                >
                  <X className="h-2.5 w-2.5" />
                  Clear
                </button>
              )}
            </div>
            <div
              className="flex items-center gap-2 p-3 rounded-xl border border-white/[0.04] bg-white/[0.01] cursor-pointer hover:bg-white/[0.02] hover:border-white/[0.08] transition-all"
              onClick={() => setShowCalendar(!showCalendar)}
            >
              <CalendarRange className="h-4 w-4 text-white/25 shrink-0" />
              <span className="text-[12px] text-white/50">
                {dateFrom && dateTo
                  ? `${dateFrom.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — ${dateTo.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                  : dateFrom
                    ? `From ${dateFrom.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                    : dateTo
                      ? `Until ${dateTo.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                      : 'All dates'}
              </span>
              <span className="text-[10px] text-white/20 ml-auto">Click to select</span>
            </div>

            {showCalendar && (
              <div className="p-3 rounded-xl border border-white/[0.06] bg-[#141422] animate-in fade-in-0 slide-in-from-top-2 duration-200">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 space-y-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-white/30">From</span>
                    <Calendar
                      mode="single"
                      selected={dateFrom}
                      onSelect={(d) => {
                        setDateFrom(d);
                      }}
                      className="rounded-lg border-white/[0.04] bg-transparent mx-auto"
                      classNames={{
                        months: 'flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0',
                        month: 'space-y-4',
                        caption: 'flex justify-center pt-1 relative items-center',
                        caption_label: 'text-[11px] font-medium text-white/50',
                        nav_button: 'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 text-white/50',
                        nav_button_previous: 'absolute left-1',
                        nav_button_next: 'absolute right-1',
                        table: 'w-full border-collapse space-y-1',
                        head_row: 'flex',
                        head_cell: 'text-white/25 font-normal w-8 h-8 text-[10px]',
                        row: 'flex w-full mt-2',
                        cell: 'text-center text-[11px] p-0 relative h-8 w-8',
                        day: 'h-8 w-8 p-0 font-normal text-white/50 hover:bg-white/[0.06] rounded-md transition-colors',
                        day_selected: 'bg-[#03DAC6] text-white hover:bg-[#03DAC6] hover:text-white rounded-md',
                        day_today: 'bg-white/[0.06] text-white/70',
                        day_outside: 'text-white/15 opacity-50',
                      }}
                    />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-white/30">To</span>
                    <Calendar
                      mode="single"
                      selected={dateTo}
                      onSelect={(d) => {
                        setDateTo(d);
                      }}
                      className="rounded-lg border-white/[0.04] bg-transparent mx-auto"
                      classNames={{
                        months: 'flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0',
                        month: 'space-y-4',
                        caption: 'flex justify-center pt-1 relative items-center',
                        caption_label: 'text-[11px] font-medium text-white/50',
                        nav_button: 'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 text-white/50',
                        nav_button_previous: 'absolute left-1',
                        nav_button_next: 'absolute right-1',
                        table: 'w-full border-collapse space-y-1',
                        head_row: 'flex',
                        head_cell: 'text-white/25 font-normal w-8 h-8 text-[10px]',
                        row: 'flex w-full mt-2',
                        cell: 'text-center text-[11px] p-0 relative h-8 w-8',
                        day: 'h-8 w-8 p-0 font-normal text-white/50 hover:bg-white/[0.06] rounded-md transition-colors',
                        day_selected: 'bg-[#03DAC6] text-white hover:bg-[#03DAC6] hover:text-white rounded-md',
                        day_today: 'bg-white/[0.06] text-white/70',
                        day_outside: 'text-white/15 opacity-50',
                      }}
                    />
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <Button
                    size="sm"
                    className="h-7 px-3 text-[10px] rounded-lg bg-[#03DAC6]/15 text-[#03DAC6] hover:bg-[#03DAC6]/25"
                    onClick={handleDateChange}
                  >
                    Apply
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Preview / Record Count */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.015] border border-white/[0.04]">
            <div className="flex items-center gap-2">
              <Database className="h-3.5 w-3.5 text-white/25" />
              <span className="text-[11px] text-white/40">Records</span>
            </div>
            {loadingPreview ? (
              <div className="flex items-center gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin text-white/25" />
                <span className="text-[11px] text-white/25">Loading...</span>
              </div>
            ) : previewCount !== null ? (
              previewCount === -1 ? (
                <Badge variant="outline" className="text-[10px] font-semibold border-white/[0.08] text-white/30 bg-white/[0.02]">
                  All matching records
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="text-[10px] font-semibold"
                  style={{
                    borderColor: `${selectedTypeInfo?.color}25`,
                    color: selectedTypeInfo?.color,
                    backgroundColor: `${selectedTypeInfo?.color}08`,
                  }}
                >
                  {previewCount.toLocaleString()} records
                </Badge>
              )
            ) : (
              <span className="text-[11px] text-white/20">—</span>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
              className="flex-1 h-9 text-[12px] rounded-xl text-white/40 hover:text-white/70 hover:bg-white/[0.04]"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleExport}
              disabled={exporting}
              className="flex-1 h-9 text-[12px] rounded-xl font-semibold text-white flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(135deg, #BB86FC90, #BB86FC70)',
                boxShadow: '0 2px 8px rgba(187,134,252,0.25)',
              }}
            >
              {exporting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-3.5 w-3.5" />
                  Export {format.toUpperCase()}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
