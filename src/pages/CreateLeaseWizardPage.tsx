import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { listMasterCourses } from "@/lib/api/courses";
import { useToastStore } from "@/lib/store/toastStore";
import { LEASE_BILLING_LABELS, DELIVERY_METHOD_LABELS, type LeaseBillingModel, type DeliveryMethod } from "@/contracts";
import { Check } from "lucide-react";

const leaseFormSchema = z.object({
  masterCourseId: z.string().min(1, "Choose a course to lease"),
  customerName: z.string().min(2, "Customer name is required"),
  contactPersonName: z.string().min(2, "Contact person is required"),
  billingModel: z.custom<LeaseBillingModel>(),
  price: z.number({ error: "Enter a price" }).positive("Price must be greater than 0"),
  licencesTotal: z.number({ error: "Enter a licence count" }).int().positive("Must be at least 1 licence"),
  startDate: z.string().min(1, "Start date required"),
  endDate: z.string().optional(),
  deliveryMethod: z.custom<DeliveryMethod>(),
  allowedCountries: z.string().min(1, "List at least one allowed country"),
  allowedDomains: z.string().optional(),
  allowedIps: z.string().optional(),
  certificatesEnabled: z.boolean(),
  autoUpdateVersions: z.boolean(),
  hasClientOverlay: z.boolean(),
  progressReports: z.boolean(),
  reportFrequency: z.enum(["weekly", "monthly", "on_demand"]),
  inviteEmail: z.string().email("Enter a valid email").or(z.literal("")),
  inviteNote: z.string().optional(),
});
type LeaseFormValues = z.infer<typeof leaseFormSchema>;

const STEPS = ["Course & Customer", "Commercial Terms", "Access & Restrictions", "Reporting", "Invite Customer", "Review"] as const;

export function CreateLeaseWizardPage() {
  const navigate = useNavigate();
  const push = useToastStore((s) => s.push);
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const { data: courses } = useQuery({ queryKey: ["master-courses"], queryFn: listMasterCourses });

  const {
    register,
    handleSubmit,
    watch,
    trigger,
    formState: { errors },
  } = useForm<LeaseFormValues>({
    resolver: zodResolver(leaseFormSchema),
    defaultValues: {
      billingModel: "per_seat",
      deliveryMethod: "hosted_launch",
      certificatesEnabled: true,
      autoUpdateVersions: false,
      hasClientOverlay: false,
      progressReports: true,
      reportFrequency: "monthly",
      licencesTotal: 50,
      inviteEmail: "",
    },
  });

  const values = watch();
  const selectedCourse = courses?.find((c) => c.id === values.masterCourseId);

  const stepFields: Record<number, (keyof LeaseFormValues)[]> = {
    0: ["masterCourseId", "customerName", "contactPersonName"],
    1: ["billingModel", "price", "licencesTotal", "startDate"],
    2: ["deliveryMethod", "allowedCountries"],
    3: ["reportFrequency"],
    4: ["inviteEmail"],
    5: [],
  };

  async function next() {
    const valid = await trigger(stepFields[step]);
    if (valid) setStep((s) => Math.min(STEPS.length - 1, s + 1));
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success-soft text-[color:#079455]">
          <Check className="h-7 w-7" />
        </div>
        <h2 className="text-lg font-semibold text-ink">Lease sent for approval</h2>
        <p className="mt-1 text-sm text-muted">
          {values.customerName} will receive an invitation{values.inviteEmail ? ` at ${values.inviteEmail}` : ""}. Deployment auto-configures once payment clears.
        </p>
        <Button className="mt-6" onClick={() => navigate("/distribution-hub")}>Back to Distribution Hub</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Create Lease" description="A lease is a contract object checked on every launch — terms, limits and a pinned version." />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                i <= step ? "bg-primary text-white" : "bg-gray-200 text-muted"
              }`}
            >
              {i + 1}
            </div>
            <span className={`text-xs ${i === step ? "font-semibold text-ink" : "text-muted"}`}>{label}</span>
            {i < STEPS.length - 1 && <div className="h-px w-4 bg-line" />}
          </div>
        ))}
      </div>

      <Card>
        <CardBody className="space-y-4">
          {step === 0 && (
            <>
              <div>
                <Label>Course to lease</Label>
                <Select {...register("masterCourseId")}>
                  <option value="">Select a master course…</option>
                  {courses?.filter((c) => !c.bypassAiConversion).map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </Select>
                {errors.masterCourseId && <p className="mt-1 text-xs text-danger">{errors.masterCourseId.message}</p>}
              </div>
              <div>
                <Label>Customer name</Label>
                <Input placeholder="e.g. Northfield Retail Group" {...register("customerName")} />
                {errors.customerName && <p className="mt-1 text-xs text-danger">{errors.customerName.message}</p>}
              </div>
              <div>
                <Label>Contact person</Label>
                <Input placeholder="e.g. James Whitfield" {...register("contactPersonName")} />
                {errors.contactPersonName && <p className="mt-1 text-xs text-danger">{errors.contactPersonName.message}</p>}
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div>
                <Label>Billing model</Label>
                <Select {...register("billingModel")}>
                  {(Object.keys(LEASE_BILLING_LABELS) as LeaseBillingModel[]).map((m) => (
                    <option key={m} value={m}>{LEASE_BILLING_LABELS[m]}</option>
                  ))}
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Price (£)</Label>
                  <Input type="number" step="0.01" {...register("price", { valueAsNumber: true })} />
                  {errors.price && <p className="mt-1 text-xs text-danger">{errors.price.message}</p>}
                </div>
                <div>
                  <Label>Total licences</Label>
                  <Input type="number" {...register("licencesTotal", { valueAsNumber: true })} />
                  {errors.licencesTotal && <p className="mt-1 text-xs text-danger">{errors.licencesTotal.message}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Start date</Label>
                  <Input type="date" {...register("startDate")} />
                  {errors.startDate && <p className="mt-1 text-xs text-danger">{errors.startDate.message}</p>}
                </div>
                <div>
                  <Label>End date (optional)</Label>
                  <Input type="date" {...register("endDate")} />
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <Label>Delivery method</Label>
                <Select {...register("deliveryMethod")}>
                  {(Object.keys(DELIVERY_METHOD_LABELS) as DeliveryMethod[]).map((m) => (
                    <option key={m} value={m}>{DELIVERY_METHOD_LABELS[m]}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Allowed countries (comma-separated ISO codes)</Label>
                <Input placeholder="GB, IE" {...register("allowedCountries")} />
                {errors.allowedCountries && <p className="mt-1 text-xs text-danger">{errors.allowedCountries.message}</p>}
              </div>
              <div>
                <Label>Allowed domains (optional — comma-separated)</Label>
                <Input placeholder="@northfieldretail.com" {...register("allowedDomains")} />
              </div>
              <div>
                <Label>Allowed IP ranges (optional — comma-separated CIDR)</Label>
                <Input placeholder="203.0.113.0/24" {...register("allowedIps")} />
              </div>
              <label className="flex items-center gap-2 text-sm text-ink-soft">
                <input type="checkbox" {...register("certificatesEnabled")} /> Enable certificates for this customer's learners
              </label>
              <label className="flex items-center gap-2 text-sm text-ink-soft">
                <input type="checkbox" {...register("autoUpdateVersions")} /> Auto-apply master course updates (otherwise requires customer approval)
              </label>
              <label className="flex items-center gap-2 text-sm text-ink-soft">
                <input type="checkbox" {...register("hasClientOverlay")} /> Client-specific branding/policy overlay on top of the master
              </label>
            </>
          )}

          {step === 3 && (
            <>
              <label className="flex items-center gap-2 text-sm text-ink-soft">
                <input type="checkbox" {...register("progressReports")} /> Give this customer progress reports for their learners
              </label>
              <div>
                <Label>Report frequency</Label>
                <Select {...register("reportFrequency")}>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="on_demand">On demand only</option>
                </Select>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <div>
                <Label>Customer contact email</Label>
                <Input type="email" placeholder="admin@customer.com" {...register("inviteEmail")} />
                {errors.inviteEmail && <p className="mt-1 text-xs text-danger">{errors.inviteEmail.message}</p>}
              </div>
              <div>
                <Label>Note (optional)</Label>
                <textarea
                  {...register("inviteNote")}
                  className="h-20 w-full rounded-[10px] border border-line bg-white p-3 text-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
                  placeholder="A short note included in the invitation email"
                />
              </div>
            </>
          )}

          {step === 5 && (
            <div className="space-y-3 text-sm">
              <Row label="Course" value={selectedCourse?.title ?? "—"} />
              <Row label="Customer" value={values.customerName} />
              <Row label="Contact person" value={values.contactPersonName} />
              <Row label="Billing" value={`${LEASE_BILLING_LABELS[values.billingModel]} — £${values.price || 0}`} />
              <Row label="Licences" value={String(values.licencesTotal)} />
              <Row label="Delivery" value={DELIVERY_METHOD_LABELS[values.deliveryMethod]} />
              <Row label="Countries" value={values.allowedCountries || "—"} />
              <Row label="Domains" value={values.allowedDomains || "Not restricted"} />
              <Row label="IP ranges" value={values.allowedIps || "Not restricted"} />
              <Row label="Certificates" value={values.certificatesEnabled ? "Enabled" : "Disabled"} />
              <Row label="Reports" value={values.progressReports ? `Progress reports — ${values.reportFrequency.replace("_", " ")}` : "Disabled"} />
              <Row label="Invite" value={values.inviteEmail || "Not sent"} />
              <div className="flex flex-wrap gap-2 pt-2">
                <Badge tone="info">Pinned to current published version — updates {values.autoUpdateVersions ? "apply automatically" : "require approval"}</Badge>
                {values.hasClientOverlay && <Badge tone="brand">Client-specific overlay</Badge>}
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      <div className="mt-5 flex justify-between">
        <Button variant="ghost" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>
          Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={next}>Continue</Button>
        ) : (
          <Button
            onClick={handleSubmit(() => {
              setSubmitted(true);
              push(`Lease created for ${values.customerName}`);
            })}
          >
            Send lease for approval
          </Button>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-line pb-2">
      <span className="text-muted">{label}</span>
      <span className="font-medium text-ink">{value}</span>
    </div>
  );
}
