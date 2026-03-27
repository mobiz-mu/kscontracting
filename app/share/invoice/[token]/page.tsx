import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, FileText, ShieldCheck } from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import InvoiceKSDoc, { type KSInvoiceDocData } from "@/components/ksdoc/InvoiceKSDoc";

export const dynamic = "force-dynamic";

function n2(v: any) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function invoiceTypeLabel(v?: string | null) {
  const x = String(v ?? "").toUpperCase();
  if (x === "PRO_FORMA" || x === "PROFORMA") return "PRO FORMA INVOICE";
  if (x === "VAT_INVOICE" || x === "VAT") return "VAT INVOICE";
  return "STANDARD INVOICE";
}

export default async function PublicInvoiceSharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const admin = createSupabaseAdminClient();

  const { data: tokenRow, error: tokenErr } = await admin
    .from("invoice_share_tokens")
    .select("invoice_id, expires_at, revoked_at")
    .eq("token", token)
    .single();

  if (tokenErr || !tokenRow) notFound();
  if (tokenRow.revoked_at) notFound();
  if (tokenRow.expires_at && new Date(tokenRow.expires_at) < new Date()) notFound();

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
      balance_amount,
      customer_id
    `)
    .eq("id", tokenRow.invoice_id)
    .single();

  if (invoiceErr || !invoice) notFound();

  let customer: any = null;

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

  const total = n2(invoice.total_amount);
  const subtotal = n2(invoice.subtotal);
  const vat = n2(invoice.vat_amount);
  const balance = n2(invoice.balance_amount);
  const paid =
    typeof invoice.paid_amount === "number" && Number.isFinite(invoice.paid_amount)
      ? n2(invoice.paid_amount)
      : Math.max(0, total - balance);

  const doc: KSInvoiceDocData = {
    company: {
      name: "KS CONTRACTING LTD",
      logoSrc: "/kslogo.png",
      stampSrc: "/ks-stamp.png",
      signatureSrc: "/ks-signature.png",
      addressLines: [
        "MORCELLEMENT CARLOS, TAMARIN",
        "Tel: 5941 6756 • Email: ks.contracting@hotmail.com",
        "BRN: C18160190 • VAT: 27658608",
      ],
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
      name: customer?.name ?? "—",
      address: customer?.address ?? "",
      brn: customer?.brn ?? "",
      vat: customer?.vat_no ?? "",
      siteAddress: invoice.site_address ?? "",
      lines: invoice.site_address ? [`Site Address: ${invoice.site_address}`] : [],
    },
    items: (items ?? []).map((it: any) => ({
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
      balance,
    },
    notes: invoice.notes?.trim() || "",
    paymentTerms: "",
  };

  return (
    <div className="min-h-screen bg-slate-100 px-3 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto mb-4 flex w-full max-w-[980px] items-center justify-between rounded-2xl border bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <FileText className="h-4 w-4" />
          Invoice Viewer
          <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
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

      <div className="mx-auto w-fit rounded-2xl border bg-white p-3 shadow-sm">
        <InvoiceKSDoc data={doc} variant="invoice" />
      </div>
    </div>
  );
}