
import { cn } from "@/lib/utils";
import { Badge } from "@flowconsole/ui/components/ui/badge";
import { Button } from "@flowconsole/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@flowconsole/ui/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@flowconsole/ui/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@flowconsole/ui/components/ui/tabs";
import { Icons } from "@flowconsole/ui/components/shared/icons";

type DriftSeverity = "error" | "warning" | "info";
type ValidationResult = "pass" | "fail";

type DriftEntry = {
  id: string;
  element: string;
  expected: string;
  actual: string;
  source: "InfraScan" | "CodeScan";
  severity: DriftSeverity;
};

type ValidationEntry = {
  id: string;
  rule: string;
  target: string;
  result: ValidationResult;
  message: string;
};

type DriftSummary = {
  totalElements: number;
  driftDetected: number;
  validationPassed: number;
  violations: number;
};

const summary: DriftSummary = {
  totalElements: 32,
  driftDetected: 3,
  validationPassed: 8,
  violations: 4,
};

const driftEntries: DriftEntry[] = [
  {
    id: "d1",
    element: "payment-service",
    expected: "Image: payment-svc:v2.3.8",
    actual: "Image: payment-svc:v2.4.1",
    source: "InfraScan",
    severity: "warning",
  },
  {
    id: "d2",
    element: "geo-tracker",
    expected: "Not in model",
    actual: "geo-tracker:1.2.0",
    source: "InfraScan",
    severity: "warning",
  },
  {
    id: "d3",
    element: "notification-service",
    expected: "replicaCount: 3",
    actual: "replicaCount: 1",
    source: "InfraScan",
    severity: "error",
  },
];

const validationEntries: ValidationEntry[] = [
  {
    id: "v1",
    rule: "No sync calls to external services",
    target: "payment-gateway",
    result: "pass",
    message: "All external calls use async messaging",
  },
  {
    id: "v2",
    rule: "Database in same namespace",
    target: "orders-db",
    result: "fail",
    message: 'orders-db is in namespace "shared", expected "orders"',
  },
  {
    id: "v3",
    rule: "Max 3 hops to database",
    target: "analytics-pipeline",
    result: "pass",
    message: "Longest path: 2 hops via api-gateway \u2192 analytics-service",
  },
  {
    id: "v4",
    rule: "No circular dependencies",
    target: "order-service",
    result: "fail",
    message:
      "Cycle detected: order-service \u2192 inventory-service \u2192 order-service",
  },
  {
    id: "v5",
    rule: "All services have health check",
    target: "Global",
    result: "pass",
    message: "32/32 services expose /health endpoint",
  },
  {
    id: "v6",
    rule: "Single point of failure check",
    target: "api-gateway",
    result: "fail",
    message: "api-gateway has no redundancy \u2014 12 services depend on it",
  },
  {
    id: "v7",
    rule: "Connection pool limit",
    target: "orders-db",
    result: "pass",
    message: "Connection pool at 45/100, within threshold",
  },
  {
    id: "v8",
    rule: "Circuit breaker configured",
    target: "payment-gateway",
    result: "pass",
    message: "Circuit breaker enabled with 5s timeout, 3 retries",
  },
  {
    id: "v9",
    rule: "Service mesh sidecar present",
    target: "delivery-service",
    result: "fail",
    message: "No Envoy sidecar detected in delivery-service pod",
  },
  {
    id: "v10",
    rule: "Response time SLO",
    target: "search-service",
    result: "pass",
    message: "p99 latency 142ms, within 200ms SLO",
  },
  {
    id: "v11",
    rule: "Event schema validation",
    target: "order-events",
    result: "pass",
    message: "All events conform to schema registry v3.2",
  },
  {
    id: "v12",
    rule: "Cross-domain dependency limit",
    target: "rating-service",
    result: "pass",
    message: "2 cross-domain dependencies, within limit of 3",
  },
];

function DriftLevelIcon({ severity }: { severity: DriftSeverity }) {
  const config: Record<
    DriftSeverity,
    {
      icon: typeof Icons.warning;
      className: string;
      label: string;
    }
  > = {
    error: {
      icon: Icons.close,
      className:
        "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300",
      label: "Error",
    },
    warning: {
      icon: Icons.warning,
      className:
        "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300",
      label: "Warning",
    },
    info: {
      icon: Icons.activity,
      className:
        "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300",
      label: "Info",
    },
  };
  const { icon: Icon, className, label } = config[severity];
  return (
    <div
      className={cn(
        "flex size-8 items-center justify-center rounded-md border",
        className,
      )}
      aria-label={`${label} level`}
      title={label}
    >
      <Icon className="size-4" />
    </div>
  );
}

function SourceBadge({ source }: { source: DriftEntry["source"] }) {
  const config = {
    InfraScan: {
      label: "Infra",
      className: "text-sky-700 dark:text-sky-300",
    },
    CodeScan: {
      label: "Code",
      className: "text-violet-700 dark:text-violet-300",
    },
  } as const;

  return (
    <span className={cn("text-sm font-medium", config[source].className)}>
      {config[source].label}
    </span>
  );
}

function ResultBadge({ result }: { result: ValidationResult }) {
  return result === "pass" ? (
    <Badge
      variant="outline"
      className="gap-1 border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
    >
      <span className="text-xs">{"\u2713"}</span>
      Pass
    </Badge>
  ) : (
    <Badge variant="destructive" className="gap-1">
      <span className="text-xs">{"\u2717"}</span>
      Fail
    </Badge>
  );
}

function DriftHeader() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3" data-testid="drift-header">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-2xl font-bold tracking-tight">MSA Platform</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <Icons.gitBranch className="size-3" />
            main
          </Badge>
          <Badge variant="secondary" className="gap-1 text-muted-foreground">
            <Icons.refresh className="size-3" />
            2 minutes ago
          </Badge>
          <Button variant="outline" disabled className="gap-2">
            <Icons.refresh className="size-4" />
            Run Scan
          </Button>
        </div>
      </div>
    </div>
  );
}

function SummaryCards() {
  const cards = [
    {
      title: "Total Elements",
      value: summary.totalElements,
      description: "Tracked in model",
      icon: Icons.explorer,
    },
    {
      title: "Drift Detected",
      value: summary.driftDetected,
      description: "Model vs infrastructure",
      icon: Icons.drift,
      highlight:
        summary.driftDetected > 0
          ? "text-amber-600 dark:text-amber-400"
          : undefined,
    },
    {
      title: "Validation Passed",
      value: summary.validationPassed,
      description: "Fitness functions",
      icon: Icons.validations,
      highlight: "text-emerald-600 dark:text-emerald-400",
    },
    {
      title: "Violations",
      value: summary.violations,
      description: "Rules failed",
      icon: Icons.warning,
      highlight:
        summary.violations > 0
          ? "text-red-600 dark:text-red-400"
          : undefined,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {card.title}
            </CardTitle>
            <card.icon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", card.highlight)}>
              {card.value}
            </div>
            <p className="text-xs text-muted-foreground">{card.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function DriftTable() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Drift Results</CardTitle>
        <CardDescription>
          Differences between the architecture model and live infrastructure
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Level</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Element</TableHead>
              <TableHead>Expected</TableHead>
              <TableHead>Actual</TableHead>
              <TableHead>Review</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {driftEntries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>
                  <DriftLevelIcon severity={entry.severity} />
                </TableCell>
                <TableCell>
                  <SourceBadge source={entry.source} />
                </TableCell>
                <TableCell className="font-medium">{entry.element}</TableCell>
                <TableCell className="text-muted-foreground">
                  {entry.expected}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {entry.actual}
                </TableCell>
                <TableCell>
                  <Button variant="outline" size="sm">
                    Review
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function ValidationTable() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Validation Results</CardTitle>
        <CardDescription>
          Fitness function checks against architectural rules
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rule</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Result</TableHead>
              <TableHead>Message</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {validationEntries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="font-medium">{entry.rule}</TableCell>
                <TableCell>
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                    {entry.target}
                  </code>
                </TableCell>
                <TableCell>
                  <ResultBadge result={entry.result} />
                </TableCell>
                <TableCell className="max-w-[300px] text-muted-foreground">
                  {entry.message}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export default function DriftView() {
  return (
    <div className="flex flex-col gap-6">
      <DriftHeader />

      <SummaryCards />

      <Tabs defaultValue="drift" className="w-full">
        <TabsList>
          <TabsTrigger value="drift">Drift Detection</TabsTrigger>
          <TabsTrigger value="validation">Validations</TabsTrigger>
        </TabsList>
        <TabsContent value="drift">
          <DriftTable />
        </TabsContent>
        <TabsContent value="validation">
          <ValidationTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}
