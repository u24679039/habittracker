const { Parser: CsvParser } = require('json2csv');
const PDFDocument = require('pdfkit');

/**
 * ExportService
 * -------------
 * Implements the "export monthly analytics to PDF/CSV for personal
 * archiving" low-priority user story, and the "Export PDF" button shown
 * on the Analytics page (Fig. 24).
 *
 * Both methods are synchronous/stream-based and take plain data (already
 * fetched via AnalyticsService) rather than a userId, so this class has
 * no database dependency at all and is trivial to unit test.
 */
class ExportService {
  /**
   * toCsv(rows): string
   * Converts an array of flat objects (e.g. AnalyticsService.getConsistencyTrend
   * output) into a CSV string. Throws on empty input rather than returning
   * a header-less CSV, since an empty export is a symptom of an upstream bug.
   */
  static toCsv(rows) {
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new Error('Cannot export an empty dataset to CSV');
    }
    const parser = new CsvParser({ fields: Object.keys(rows[0]) });
    return parser.parse(rows);
  }

  /**
   * toPdf(reportData): Promise<Buffer>
   * Renders a simple one-page monthly analytics summary as a PDF buffer.
   * reportData = { userName, month, currentStreak, highestStreak, avgCompletion, perHabit }
   */
  static async toPdf(reportData) {
    // Marked `async` (rather than returning the Promise directly) so that a
    // synchronous validation error becomes a rejected promise, not a thrown
    // exception - callers can always `await`/`.catch()` consistently.
    ExportService.assertValidReport(reportData);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(20).text('HabitTracker - Monthly Analytics', { align: 'left' });
      doc.moveDown(0.5);
      doc.fontSize(11).fillColor('#555').text(`${reportData.userName} - ${reportData.month}`);
      doc.moveDown(1);

      doc.fillColor('#000').fontSize(13).text('Summary');
      doc.fontSize(11).text(`Current streak: ${reportData.currentStreak} days`);
      doc.text(`Highest streak: ${reportData.highestStreak} days`);
      doc.text(`Average completion: ${reportData.avgCompletion}%`);
      doc.moveDown(1);

      doc.fontSize(13).text('Per-habit breakdown');
      if (reportData.perHabit.length === 0) {
        doc.fontSize(11).fillColor('#777').text('No active habits this period.');
      } else {
        for (const habit of reportData.perHabit) {
          doc.fontSize(11).fillColor('#000').text(`${habit.habitName}: ${habit.completionRate}%`);
        }
      }

      doc.end();
    });
  }

  static assertValidReport(reportData) {
    if (!reportData || typeof reportData !== 'object') {
      throw new Error('toPdf requires a report data object');
    }
    const requiredFields = ['userName', 'month', 'currentStreak', 'highestStreak', 'avgCompletion', 'perHabit'];
    for (const field of requiredFields) {
      if (!(field in reportData)) {
        throw new Error(`toPdf report data is missing required field "${field}"`);
      }
    }
    if (!Array.isArray(reportData.perHabit)) {
      throw new Error('toPdf report data "perHabit" must be an array');
    }
  }
}

module.exports = ExportService;
