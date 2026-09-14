import { db } from "@/database/db";
import { registerShifts, users } from "@/database/schema";
import { desc, isNotNull, eq } from "drizzle-orm";
import { PageHeader } from "@/components/shared/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/rbac";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function RegisterHistoryPage() {
  const session = await getSession();
  if (!hasPermission(session, "finance", "read")) {
    return (
      <div className="p-8">
        <Alert variant="destructive" className="rounded-none">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Restricted</AlertTitle>
          <AlertDescription>
            You do not have permission to view the Register History.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const shifts = await db
    .select({
      id: registerShifts.id,
      openedAt: registerShifts.openedAt,
      closedAt: registerShifts.closedAt,
      startingFloat: registerShifts.startingFloat,
      expectedCash: registerShifts.expectedCash,
      actualCash: registerShifts.actualCash,
      variance: registerShifts.variance,
      closedByName: users.name,
    })
    .from(registerShifts)
    .leftJoin(users, eq(users.id, registerShifts.closedById))
    .where(isNotNull(registerShifts.closedAt))
    .orderBy(desc(registerShifts.closedAt));

  return (
    <div className="space-y-6">
      <PageHeader
        heading="Register History"
        description="Audit log of all closed register shifts."
      />

      <div className="border border-border">
        <Table className="rounded-none">
          <TableHeader>
            <TableRow>
              <TableHead>Opened At</TableHead>
              <TableHead>Closed At</TableHead>
              <TableHead>Starting Float</TableHead>
              <TableHead>Expected Cash</TableHead>
              <TableHead>Actual Cash</TableHead>
              <TableHead>Variance</TableHead>
              <TableHead>Closed By</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shifts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No historical shifts found.
                </TableCell>
              </TableRow>
            ) : (
              shifts.map((shift) => (
                <TableRow key={shift.id}>
                  <TableCell>
                    {shift.openedAt ? format(new Date(shift.openedAt), "MMM d, yyyy h:mm a") : "N/A"}
                  </TableCell>
                  <TableCell>
                    {shift.closedAt ? format(new Date(shift.closedAt), "MMM d, yyyy h:mm a") : "N/A"}
                  </TableCell>
                  <TableCell>Rs. {(shift.startingFloat || 0).toLocaleString()}</TableCell>
                  <TableCell>Rs. {(shift.expectedCash || 0).toLocaleString()}</TableCell>
                  <TableCell>
                    {shift.actualCash !== null ? `Rs. ${shift.actualCash.toLocaleString()}` : "N/A"}
                  </TableCell>
                  <TableCell>
                    {shift.variance !== null ? (
                      <span
                        className={
                          shift.variance < 0
                            ? "text-red-600 font-bold"
                            : shift.variance > 0
                            ? "text-green-600 font-bold"
                            : "text-muted-foreground"
                        }
                      >
                        {shift.variance > 0 ? "+" : ""}
                        Rs. {shift.variance.toLocaleString()}
                      </span>
                    ) : (
                      "N/A"
                    )}
                  </TableCell>
                  <TableCell>{shift.closedByName || "Unknown"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
