"use client";

import { useEffect, useRef } from "react";

type Props = {
  html: string;
  /** Scripts loaded in order before the main page script (e.g. asciinema). */
  preScripts?: string[];
  /** Main page script (the ported imperative logic). */
  scriptSrc: string;
};

/**
 * Renders a verbatim HTML partial (original <style> + body markup) and then
 * loads the original imperative scripts in the browser. Markup is server-
 * rendered via dangerouslySetInnerHTML so styles ship in the first paint;
 * inline on* handlers and the page script run in global scope as before.
 *
 * SECURITY — trust boundary:
 *   `html` is NOT user input. It is build-time content produced by
 *   scripts/extract.mjs from the author's own source HTML and committed under
 *   app/_content. There is no runtime/user-supplied path into this prop, so the
 *   dangerouslySetInnerHTML sink only ever receives trusted, static markup.
 *
 *   The one place external/file content becomes HTML at runtime is the Markdown
 *   walkthrough renderer (public/machines.page.js → mdToHtml), which escapes all
 *   text up-front and whitelists URL schemes before injecting via innerHTML.
 *   Keep untrusted content on that sanitised path — never feed it to `html`.
 */
export default function RawPage({ html, preScripts = [], scriptSrc }: Props) {
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const added: HTMLScriptElement[] = [];

    const loadSeq = (srcs: string[]): Promise<void> =>
      srcs.reduce(
        (p, src) =>
          p.then(
            () =>
              new Promise<void>((resolve) => {
                const s = document.createElement("script");
                s.src = src;
                s.async = false;
                s.onload = () => resolve();
                s.onerror = () => resolve();
                document.body.appendChild(s);
                added.push(s);
              })
          ),
        Promise.resolve()
      );

    loadSeq([...preScripts, scriptSrc]);

    return () => {
      added.forEach((s) => s.remove());
      document.body.style.overflow = "";
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
