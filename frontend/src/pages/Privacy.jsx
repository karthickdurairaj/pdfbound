import { Link } from 'react-router-dom';

// Keep this page in sync with what the site actually does.
// If you add analytics, accounts, cookies or ads, update the sections below.
const EFFECTIVE_DATE = 'November 11, 2026';
const CONTACT_EMAIL = 'privacy@pdfbound.com';

export default function Privacy() {
  return (
    <div className="tool-page legal">
      <h1>Privacy Policy</h1>
      <p className="lede">Effective date: {EFFECTIVE_DATE}</p>

      <div className="panel">
        <h2>The short version</h2>
        <ul>
          <li>You don't need an account, and we don't ask for your name, email or any other personal details.</li>
          <li>Files you upload are used only to do what you asked (merge, split, convert and so on) and are deleted as soon as your result has been sent back.</li>
          <li>We never sell, rent, trade or intentionally share your documents with anyone.</li>
          <li>We don't use cookies, analytics, advertising or tracking of any kind.</li>
          <li>You use PDFBound at your own risk, and you are responsible for what you choose to upload (see <a href="#responsibility">Your responsibility</a>).</li>
        </ul>

        <h2>Who we are</h2>
        <p>
          PDFBound (<strong>pdfbound.com</strong>) is a free set of online PDF tools. In this policy, “PDFBound”, “we”
          and “us” mean the operator of pdfbound.com, and “you” means anyone using the site.
        </p>

        <h2>What we collect, and why</h2>
        <h3>1. The files you upload</h3>
        <p>
          When you use a tool, your files are sent to our server over an encrypted (HTTPS) connection. The server
          processes them, sends the result straight back to your browser, and then deletes both the uploaded files and
          the result. We do not open, read, review, copy or keep your documents, and we don't use them for any other
          purpose, such as training software or building profiles.
        </p>
        <p>
          Uploaded files normally exist on the server only for the few seconds it takes to process your request. If a
          request is interrupted (for example, the server restarts mid-request), a temporary file may remain briefly
          until it is cleaned up.
        </p>

        <h3>2. Technical logs</h3>
        <p>Like almost every website, our servers keep basic logs so we can keep the service running and fix problems. These logs contain:</p>
        <ul>
          <li>your IP address, and the date and time of each request</li>
          <li>the page or tool address requested (for example <code>/api/pdf/merge</code>), the result code, and the size of the response</li>
          <li>your browser type and the page you came from, as reported by your browser</li>
          <li>error messages if something goes wrong, which may occasionally include the name of a file you uploaded</li>
        </ul>
        <p>
          Logs never contain the contents of your documents. We use them only for operating, securing and
          troubleshooting PDFBound, and we delete them automatically, normally within about four weeks.
        </p>

        <h3>3. What we don't collect</h3>
        <p>
          No accounts, no email addresses, no payment details, no cookies, no analytics or advertising trackers, and no
          tracking across other websites.
        </p>

        <h2>We do not share your documents</h2>
        <p>
          We will never sell, rent, trade or otherwise intentionally share your documents or files with any other
          person, company or organisation, for any reason, including for money or advertising.
        </p>
        <p>To be fully transparent, the only other parties involved in running the site are:</p>
        <ul>
          <li>
            <strong>Our network and security provider (Cloudflare)</strong>, which carries traffic between your
            browser and our server, protects the site from attacks, and may process connection data such as your IP
            address under its own privacy policy.
          </li>
          <li><strong>Our hosting provider</strong>, which runs the server that processes your files.</li>
        </ul>
        <p>
          Neither of these providers is given access to your documents by us. Separately, if we ever receive a legal
          demand that the law requires us to obey, we would only ever have the limited technical logs described above
          to provide, because we don't keep your documents.
        </p>

        <h2 id="responsibility">Your responsibility, and limits on ours</h2>
        <p>
          We take reasonable steps to protect the service, including encrypted connections and deleting files right
          after processing. However, no website, server or internet transmission can be guaranteed to be completely
          secure.
        </p>
        <p>
          <strong>
            By using PDFBound, you accept that you use it entirely at your own risk and that you are fully responsible
            for the files you choose to upload.
          </strong>{' '}
          Please don't upload documents that are highly sensitive or confidential, or that you are not allowed to
          share, unless you have decided that this risk is acceptable for you. You are also responsible for making
          sure you have the right to process any document you upload, and for keeping your own copies of your files.
        </p>
        <p>
          To the maximum extent permitted by law, PDFBound and its operator are not responsible or liable for any loss,
          damage, disclosure or other harm arising from data security incidents, including unauthorised access to,
          interception of, or loss of any files or information, whether caused by attackers, by third-party providers,
          or by failures of hardware, software or networks. PDFBound is provided “as is” and “as available”, without
          warranties of any kind.
        </p>
        <p>
          Nothing in this policy limits any rights you have, or any responsibility we have, that cannot be limited
          under the law that applies to you.
        </p>

        <h2>Your choices and rights</h2>
        <p>
          Because we don't keep your documents and don't collect personal details, there is usually nothing about you
          for us to look up, correct or delete. If you'd like to ask about the technical logs, or exercise a privacy
          right you have under the law where you live, email us at{' '}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. We may need the date, time and IP address of your
          visit to find the relevant log entries.
        </p>

        <h2>Children</h2>
        <p>
          PDFBound is not directed at children under 13, and we do not knowingly collect personal information from
          them.
        </p>

        <h2>Changes to this policy</h2>
        <p>
          If we change how PDFBound handles your data, we will update this page and its effective date. Material changes
          will be clearly noted here. Continuing to use the site after a change means you accept the updated policy.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about this policy? Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>

        <p className="legal-back"><Link to="/">← Back to all tools</Link></p>
      </div>
    </div>
  );
}
