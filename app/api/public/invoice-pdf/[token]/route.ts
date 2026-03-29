import { NextResponse } from "next/server";
import chromium from "@sparticuz/chromium-min";
import { chromium as playwright } from "playwright-core";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ token: string }> };

const REMOTE_CHROMIUM_PACK =
  "https://github.com/Sparticuz/chromium/releases/download/v138.0.2/chromium-v138.0.2-pack.x64.tar";

export async function GET(req: Request, ctx: RouteContext) {
  const { token } = await ctx.params;
  const safeToken = String(token ?? "").trim();

  if (!safeToken) {
    return NextResponse.json(
      { ok: false, error: "Missing token" },
      { status: 400 }
    );
  }

  const reqUrl = new URL(req.url);
  const appUrl = reqUrl.origin;

  let browser: Awaited<ReturnType<typeof playwright.launch>> | null = null;

  try {
    const executablePath = await chromium.executablePath(REMOTE_CHROMIUM_PACK);

    browser = await playwright.launch({
      executablePath,
      args: chromium.args,
      headless: true,
    });

    const page = await browser.newPage();

    const publicInvoiceUrl = `${appUrl}/public-invoice/${safeToken}?pdf=1`;

    const response = await page.goto(publicInvoiceUrl, {
      waitUntil: "networkidle",
      timeout: 60000,
    });

    if (!response) {
      throw new Error("No response received while opening public invoice page");
    }

    if (!response.ok()) {
      throw new Error(`Public invoice page returned HTTP ${response.status()}`);
    }

    const finalUrl = page.url();
    if (finalUrl.includes("/login")) {
      throw new Error("Public invoice URL redirected to login");
    }

    await page.emulateMedia({ media: "print" });

    await page.waitForLoadState("networkidle");

    await page.evaluate(async () => {
      const images = Array.from(document.images);
      await Promise.all(
        images.map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise<void>((resolve) => {
            const done = () => resolve();
            img.addEventListener("load", done, { once: true });
            img.addEventListener("error", done, { once: true });
          });
        })
      );
    });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: "0mm",
        right: "0mm",
        bottom: "0mm",
        left: "0mm",
      },
    });

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="invoice-${safeToken}.pdf"`,
        "Cache-Control": "private, no-store, no-cache, must-revalidate",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to generate public invoice PDF",
        details: error?.message ?? String(error),
      },
      { status: 500 }
    );
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}