import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import {
  Activity,
  CalendarClock,
  Download,
  FileText,
  HeartPulse,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react';
import { CartesianGrid, Legend, Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, type ChartConfig } from '@/components/ui/chart';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useActiveRoom } from '@/context/ActiveRoomContext';
import { useAuth } from '@/hooks/useAuth';
import { useDassMonitoring } from '@/hooks/useDassMonitoring';
import { useRoomMembers } from '@/hooks/useRoomMembers';
import {
  calculateDassScores,
  DASS_21_QUESTIONS,
  DASS_RESPONSE_OPTIONS,
  getDassSeverity,
  type DassResponse,
  type DassScale,
} from '@/lib/dass21';
import { getDassPdfBlob } from '@/lib/dassPdfReport';
import {
  buildDassReportRows,
  filterDassEntriesToRecentMonths,
  formatDassTakenDate,
  getDassReportFilename,
  serializeDassCsv,
  type DassReportScope,
} from '@/lib/dassReports';
import { getPartnerMember } from '@/lib/roomParticipants';
import {
  canBeginDassAssessment,
  entriesVisibleInPartnerSpace,
} from './logic/mentalMonitoring';

const chartConfig = {
  depression: { label: 'Depression', color: 'hsl(var(--chart-1))' },
  anxiety: { label: 'Anxiety', color: 'hsl(var(--chart-3))' },
  stress: { label: 'Stress', color: 'hsl(var(--chart-2))' },
} satisfies ChartConfig;

const scaleLabels: Record<DassScale, string> = {
  depression: 'Depression',
  anxiety: 'Anxiety',
  stress: 'Stress',
};

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function SeverityBadge({ scale, score }: { scale: DassScale; score: number }) {
  const severity = getDassSeverity(scale, score);
  const variant =
    severity === 'Normal'
      ? 'secondary'
      : severity === 'Mild' || severity === 'Moderate'
        ? 'outline'
        : 'destructive';

  return <Badge variant={variant}>{severity}</Badge>;
}

export default function MentalMonitoring() {
  const { activeRoomId, activeRoomType } = useActiveRoom();
  const { user } = useAuth();
  const isPartnerSpace = activeRoomType === 'partner';
  const partnerCoupleId = isPartnerSpace ? activeRoomId : null;
  const { data: roomMembers = [] } = useRoomMembers(partnerCoupleId, 'partner');
  const { historyQuery, createEntry } = useDassMonitoring(
    partnerCoupleId,
    isPartnerSpace,
  );
  const [isAssessmentOpen, setIsAssessmentOpen] = useState(false);
  const [selections, setSelections] = useState<Partial<Record<number, DassResponse>>>({});

  const memberIds = roomMembers.map((member) => member.user_id);
  const visibleEntries = entriesVisibleInPartnerSpace(
    historyQuery.data?.entries ?? [],
    memberIds,
  );
  const recentEntries = useMemo(
    () => filterDassEntriesToRecentMonths(visibleEntries),
    [visibleEntries],
  );
  const chartData = useMemo(
    () =>
      recentEntries.map((entry) => ({
        date: formatDassTakenDate(entry.takenAt),
        depression: entry.depression,
        anxiety: entry.anxiety,
        stress: entry.stress,
      })),
    [recentEntries],
  );
  const latestEntry = visibleEntries.at(-1);
  const allTimeReportRows = useMemo(
    () => buildDassReportRows(visibleEntries),
    [visibleEntries],
  );
  const recentReportRows = useMemo(
    () => buildDassReportRows(recentEntries),
    [recentEntries],
  );
  const nextEligibleAt = historyQuery.data?.nextEligibleAt ?? null;
  const canStart =
    historyQuery.isSuccess &&
    canBeginDassAssessment({
      activeRoomType,
      coupleId: partnerCoupleId,
      nextEligibleAt,
    });
  const isComplete = DASS_21_QUESTIONS.every(
    (question) => selections[question.number] !== undefined,
  );
  const partnerName = getPartnerMember(roomMembers, user?.id)?.profiles?.display_name;

  const updateSelection = (questionNumber: number, value: string) => {
    setSelections((current) => ({
      ...current,
      [questionNumber]: Number(value) as DassResponse,
    }));
  };

  const submitAssessment = async () => {
    if (!isComplete || !canStart) return;

    const scores = calculateDassScores(
      DASS_21_QUESTIONS.map((question) => selections[question.number]!),
    );

    try {
      await createEntry.mutateAsync(scores);
      setSelections({});
      setIsAssessmentOpen(false);
      toast.success('Your DASS-21 monitoring scores have been saved.');
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Could not save DASS-21 monitoring scores.',
      );
    }
  };

  const exportCsv = () => {
    try {
      downloadBlob(
        new Blob([serializeDassCsv(allTimeReportRows)], {
          type: 'text/csv;charset=utf-8',
        }),
        getDassReportFilename('csv'),
      );
    } catch {
      toast.error('Could not create the CSV report.');
    }
  };

  const exportPdf = (scope: DassReportScope) => {
    try {
      const rows = scope === 'all-time' ? allTimeReportRows : recentReportRows;
      downloadBlob(getDassPdfBlob(rows), getDassReportFilename('pdf', new Date(), scope));
    } catch {
      toast.error('Could not create the PDF report.');
    }
  };

  if (!isPartnerSpace) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <header>
          <h1 className="text-3xl font-serif font-bold text-secondary">Mental Monitoring</h1>
          <p className="text-muted-foreground">A private weekly check-in for your partner space.</p>
        </header>
        <Card className="border-secondary/20">
          <CardContent className="p-6 flex gap-3">
            <LockKeyhole className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
            <div>
              <h2 className="font-serif font-semibold text-lg">Available only in your partner space</h2>
              <p className="text-sm text-muted-foreground mt-1">
                DASS-21 Mental Monitoring is not available in a COF room. Switch to your partner space to view scores or take the weekly check-in.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-secondary">Mental Monitoring</h1>
          <p className="text-muted-foreground">A private DASS-21 check-in for your partner space.</p>
        </div>
        <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <LockKeyhole className="w-4 h-4 text-secondary" />
          Only you and your partner can view these score trends.
        </div>
      </header>

      <Alert className="border-primary/30 bg-primary/5">
        <ShieldCheck className="w-4 h-4 text-primary" />
        <AlertTitle>DASS-21 is a monitoring tool, not a diagnosis.</AlertTitle>
        <AlertDescription>
          It helps you notice patterns over time. Consult a doctor or qualified mental-health professional if signs of mental-health concerns keep appearing. If you may be in immediate danger, contact local emergency services or a crisis line now.
        </AlertDescription>
      </Alert>

      {historyQuery.isLoading ? (
        <Card>
          <CardContent className="p-8 flex justify-center">
            <LoaderCircle className="w-6 h-6 animate-spin text-secondary" />
          </CardContent>
        </Card>
      ) : historyQuery.isError ? (
        <Alert variant="destructive">
          <TriangleAlert className="w-4 h-4" />
          <AlertTitle>Unable to load Mental Monitoring</AlertTitle>
          <AlertDescription>Try refreshing the page. Your score history remains protected on the server.</AlertDescription>
        </Alert>
      ) : (
        <>
          <Card className="border-secondary/20">
            <CardHeader>
              <CardTitle className="font-serif flex items-center gap-2">
                <HeartPulse className="w-5 h-5 text-secondary" />
                Weekly DASS-21 check-in
              </CardTitle>
              <CardDescription>
                The 21 ratings stay only in this screen while you complete the check-in. Tahanan saves only the three final scores, encrypted.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isAssessmentOpen ? (
                <div className="space-y-6">
                  <p className="text-sm text-muted-foreground">
                    Think about the past week. Choose one response for each statement.
                  </p>
                  <div className="space-y-5">
                    {DASS_21_QUESTIONS.map((question) => (
                      <fieldset key={question.number} className="rounded-xl border border-border bg-card p-4">
                        <legend className="px-1 text-sm font-medium">
                          {question.number}. {question.statement}
                        </legend>
                        <RadioGroup
                          className="mt-4 gap-3"
                          value={
                            selections[question.number] === undefined
                              ? undefined
                              : String(selections[question.number])
                          }
                          onValueChange={(value) => updateSelection(question.number, value)}
                        >
                          {DASS_RESPONSE_OPTIONS.map((option) => {
                            const id = `dass-${question.number}-${option.value}`;
                            return (
                              <div key={option.value} className="flex items-start gap-3">
                                <RadioGroupItem value={String(option.value)} id={id} className="mt-0.5" />
                                <Label htmlFor={id} className="cursor-pointer font-normal leading-relaxed">
                                  {option.label}
                                </Label>
                              </div>
                            );
                          })}
                        </RadioGroup>
                      </fieldset>
                    ))}
                  </div>
                  <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setSelections({});
                        setIsAssessmentOpen(false);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      className="bg-secondary hover:bg-secondary/90 text-secondary-foreground"
                      disabled={!isComplete || createEntry.isPending}
                      onClick={submitAssessment}
                    >
                      {createEntry.isPending && <LoaderCircle className="mr-2 w-4 h-4 animate-spin" />}
                      Save final scores
                    </Button>
                  </div>
                </div>
              ) : canStart ? (
                <Button
                  type="button"
                  className="bg-secondary hover:bg-secondary/90 text-secondary-foreground"
                  onClick={() => setIsAssessmentOpen(true)}
                >
                  Start DASS-21 check-in
                </Button>
              ) : (
                <div className="flex items-start gap-3 rounded-xl bg-muted/60 p-4 text-sm text-muted-foreground">
                  <CalendarClock className="w-5 h-5 shrink-0 text-secondary" />
                  <p>
                    {nextEligibleAt
                      ? `Your next DASS-21 check-in is available ${format(new Date(nextEligibleAt), "MMMM d, yyyy 'at' h:mm a")}.`
                      : 'DASS-21 availability is being checked.'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {latestEntry && (
            <section className="grid gap-4 sm:grid-cols-3" aria-label="Latest DASS-21 monitoring scores">
              {(['depression', 'anxiety', 'stress'] as DassScale[]).map((scale) => (
                <Card key={scale}>
                  <CardHeader className="pb-2">
                    <CardDescription>{scaleLabels[scale]}</CardDescription>
                    <CardTitle className="flex items-center justify-between text-3xl">
                      {latestEntry[scale]}
                      <SeverityBadge scale={scale} score={latestEntry[scale]} />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground">Latest monitoring score</CardContent>
                </Card>
              ))}
            </section>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="font-serif flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                Score trends
              </CardTitle>
              <CardDescription>
                Final scores from you{partnerName ? ` and ${partnerName}` : ''} over the last five months. Individual ratings are never included here.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {allTimeReportRows.length > 0 && (
                <div className="mb-5 flex flex-col gap-3 rounded-xl bg-muted/60 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground">
                    Sensitive report: it includes final DASS-21 scores for this partner space. Keep downloaded files private.
                  </p>
                  <div className="flex shrink-0 gap-2">
                    <Button type="button" variant="outline" onClick={exportCsv}>
                      <Download className="mr-2 h-4 w-4" />
                      Export CSV
                    </Button>
                    <Button type="button" variant="outline" onClick={() => exportPdf('last-5-months')}>
                      <FileText className="mr-2 h-4 w-4" />
                      PDF: Last 5 months
                    </Button>
                    <Button type="button" variant="outline" onClick={() => exportPdf('all-time')}>
                      <FileText className="mr-2 h-4 w-4" />
                      PDF: All time
                    </Button>
                  </div>
                </div>
              )}
              {chartData.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">
                  No DASS-21 entries fall within the last five months. Use the all-time PDF to include older history.
                </div>
              ) : (
                <ChartContainer config={chartConfig} className="min-h-[260px] w-full">
                  <LineChart data={chartData} margin={{ left: -16, right: 8, top: 10 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis domain={[0, 42]} tickLine={false} axisLine={false} width={34} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="depression" stroke="var(--color-depression)" strokeWidth={2.5} dot />
                    <Line type="monotone" dataKey="anxiety" stroke="var(--color-anxiety)" strokeWidth={2.5} dot />
                    <Line type="monotone" dataKey="stress" stroke="var(--color-stress)" strokeWidth={2.5} dot />
                  </LineChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
