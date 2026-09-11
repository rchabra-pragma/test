import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { reportFileName, reportHTML } from '../lib/report';
import type { Period, Tx } from '../lib/logic';

/** Download/share the current period as a PDF. Browser print-to-PDF on web, expo-print + share sheet on device. */
export async function exportPDF(txs: Tx[], period: Period, ref: string) {
  const html = reportHTML(txs, period, ref);

  if (Platform.OS === 'web') {
    // ponytail: the browser's own print dialog is the PDF writer. Swap in a JS pdf lib only if silent download is required.
    const frame = document.createElement('iframe');
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
    document.body.appendChild(frame);
    const doc = frame.contentDocument;
    if (!doc) throw new Error('Could not open the print view.');
    doc.open();
    doc.write(html);
    doc.close();
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    setTimeout(() => frame.remove(), 60000);
    return;
  }

  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { UTI: 'com.adobe.pdf', mimeType: 'application/pdf', dialogTitle: reportFileName(period, ref) });
  } else {
    await Print.printAsync({ html });
  }
}
