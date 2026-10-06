export default function DemoNotice({ show }) {
  return show ? <div className="demo-notice">Backend unavailable — showing local demo data.</div> : null;
}
