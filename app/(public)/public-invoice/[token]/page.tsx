import Link from "next/link";
import { Download, FileText, ShieldCheck, Clock, Ban, FileQuestion } from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import InvoiceKSDoc, { type KSInvoiceDocData } from "@/components/ksdoc/InvoiceKSDoc";

export const dynamic = "force-dynamic";

function n2(v: unknown) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function invoiceTypeLabel(v?: string | null) {
  const x = String(v ?? "").toUpperCase();
  if (x === "PRO_FORMA" || x === "PROFORMA") return "PRO FORMA INVOICE";
  if (x === "VAT_INVOICE" || x === "VAT") return "VAT INVOICE";
  return "STANDARD INVOICE";
}

function StatePage({
  icon: Icon,
  title,
  message,
}: {
  icon: React.ElementType;
  title: string;
  message: string;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 ring-1 ring-slate-200">
          <Icon className="size-6 text-slate-500" />
        </div>
        <h1 className="text-lg font-bold text-slate-900">{title}</h1>
        <p className="mt-2 text-sm text-slate-600">{message}</p>
      </div>
    </div>
  );
}

export default async function PublicInvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ pdf?: string }>;
}) {
  const { token } = await params;
  const sp = await searchParams;
  const isPdf = String(sp?.pdf ?? "") === "1";

  const admin = createSupabaseAdminClient();

  const { data: tokenRow, error: tokenErr } = await admin
    .from("invoice_share_tokens")
    .select("invoice_id, expires_at, revoked_at")
    .eq("token", token)
    .single();

  if (tokenErr || !tokenRow) {
    return (
      <StatePage
        icon={FileQuestion}
        title="Link not found"
        message="This invoice link doesn't exist or may have been mistyped. Please check the link and try again."
      />
    );
  }

  if (tokenRow.revoked_at) {
    return (
      <StatePage
        icon={Ban}
        title="Link revoked"
        message="This share link has been revoked and is no longer accessible. Please contact us for an updated link."
      />
    );
  }

  if (tokenRow.expires_at && new Date(tokenRow.expires_at) < new Date()) {
    return (
      <StatePage
        icon={Clock}
        title="Link expired"
        message="This share link has expired. Please contact us for a new link."
      />
    );
  }

  const { data: invoice, error: invoiceErr } = await admin
    .from("invoices")
    .select(`
      id,
      invoice_no,
      invoice_type,
      status,
      invoice_date,
      site_address,
      notes,
      subtotal,
      vat_amount,
      total_amount,
      paid_amount,
      credited_amount,
      balance_amount,
      customer_id,
      customer_name,
      customer_vat,
      customer_brn,
      customer_address
    `)
    .eq("id", tokenRow.invoice_id)
    .single();

  if (invoiceErr || !invoice) {
    return (
      <StatePage
        icon={FileQuestion}
        title="Invoice not found"
        message="We couldn't find the invoice for this link. Please contact us for assistance."
      />
    );
  }

  let customer: { id?: number | string | null; name?: string | null; brn?: string | null; vat_no?: string | null; address?: string | null } | null = null;

  if (invoice.customer_id) {
    const { data: cust } = await admin
      .from("customers")
      .select("id, name, brn, vat_no, address")
      .eq("id", invoice.customer_id)
      .maybeSingle();

    customer = cust ?? null;
  }

  const { data: items } = await admin
    .from("invoice_items")
    .select(`
      id,
      invoice_id,
      description,
      qty,
      unit_price_excl_vat,
      vat_rate,
      vat_amount,
      line_total
    `)
    .eq("invoice_id", invoice.id)
    .order("id", { ascending: true });

  const { data: companySettings } = await admin
    .from("company_settings")
    .select("company_name, brn, vat_no, address, phone, email")
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();

  const total = n2(invoice.total_amount);
  const subtotal = n2(invoice.subtotal);
  const vat = n2(invoice.vat_amount);
  const balance = n2(invoice.balance_amount);
  const credited = n2(invoice.credited_amount);
  const paid = n2(invoice.paid_amount);

  const companyAddressLines = [
    companySettings?.address || "MORCELLEMENT CARLOS, TAMARIN",
    [
      companySettings?.phone ? `Tel: ${companySettings.phone}` : "Tel: 5941 6756",
      companySettings?.email ? `Email: ${companySettings.email}` : "Email: ks.contracting@hotmail.com",
    ].join(" • "),
    `BRN: ${companySettings?.brn || "C18160190"} • VAT: ${companySettings?.vat_no || "27658608"}`,
  ];

  const doc: KSInvoiceDocData = {
    company: {
      name: companySettings?.company_name || "KS CONTRACTING LTD",
      logoSrc: "/kslogo.png",
      stampSrc: "/ks-stamp.png",
      signatureSrc: "/ks-signature.png",
      addressLines: companyAddressLines,
    },
    doc: {
      variant: "invoice",
      title: invoiceTypeLabel(invoice.invoice_type),
      numberLabel: "No.",
      currency: "MUR",
    },
    invoice: {
      id: invoice.id,
      number: invoice.invoice_no,
      status: String(invoice.status ?? ""),
      issueDate: invoice.invoice_date ?? "",
      dueDate: "",
    },
    billTo: {
      name: invoice.customer_name ?? customer?.name ?? "—",
      address: invoice.customer_address ?? customer?.address ?? "",
      brn: invoice.customer_brn ?? customer?.brn ?? "",
      vat: invoice.customer_vat ?? customer?.vat_no ?? "",
      siteAddress: invoice.site_address ?? "",
      lines: invoice.site_address ? [`Site Address: ${invoice.site_address}`] : [],
    },
    items: (items ?? []).map((it: { id: string | number; description?: string | null; qty?: number | null; unit_price_excl_vat?: number | null; vat_rate?: number | null; vat_amount?: number | null; line_total?: number | null }) => ({
      id: String(it.id),
      description: String(it.description ?? ""),
      qty: n2(it.qty),
      unitPrice: n2(it.unit_price_excl_vat),
      vatRate: n2(it.vat_rate || 0.15),
      vatAmount: n2(it.vat_amount),
      lineTotal: n2(it.line_total),
    })),
    totals: {
      subtotal,
      vat,
      total,
      paid,
      credited,
      balance,
    },
    notes: invoice.notes?.trim() || "",
    paymentTerms: "",
  };

  if (isPdf) {
    return (
      <div className="bg-white">
        <InvoiceKSDoc data={doc} variant="invoice" />
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-100 px-3 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto mb-4 flex w-full max-w-[980px] flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-700">
          <FileText className="h-4 w-4 shrink-0" />
          Invoice Viewer
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
            <ShieldCheck className="h-3.5 w-3.5" />
            Secure Share Link
          </span>
        </div>

        <Link
          href={`/api/public/invoice-pdf/${token}`}
          className="inline-flex items-center gap-2 rounded-xl bg-[#071b38] px-4 py-2 text-sm font-medium text-white hover:bg-[#06142b]"
        >
          <Download className="h-4 w-4" />
          Download PDF
        </Link>
      </div>

      <div className="mx-auto w-full max-w-[980px] overflow-x-auto rounded-2xl border bg-white p-3 shadow-sm">
        <div className="mx-auto w-fit">
          <InvoiceKSDoc data={doc} variant="invoice" />
        </div>
      </div>
    </div>
  );
}
