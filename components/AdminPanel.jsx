'use client';

import { useEffect, useState, useRef } from 'react';
import {
  fetchAdminStatus,
  adminUploadData,
  adminUploadLocalData,
  adminUploadScorecard,
  adminDeleteData,
  adminDeleteLocalData,
  adminDeleteScorecard,
} from '@/lib/api';

const FILE_TYPES  = ['wbr', 'loyalty', 'catering'];
const GRANS       = ['weekly', 'period', 'quarter'];

// ── small UI atoms ─────────────────────────────────────────────────────────────

function Badge({ color, children }) {
  const bg = { green: ['#dcfce7', '#15803d'], blue: ['#dbeafe', '#1d4ed8'], gray: ['#f3f4f6', '#6b7280'] }[color] || ['#f3f4f6', '#6b7280'];
  return (
    <span style={{ background: bg[0], color: bg[1], fontSize: 11, fontWeight: 700, borderRadius: 4, padding: '2px 7px' }}>
      {children}
    </span>
  );
}

function DelBtn({ onClick, title }) {
  return (
    <button onClick={onClick} title={title}
      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 14, padding: '0 2px', lineHeight: 1 }}>
      ✕
    </button>
  );
}

function UploadInlineBtn({ onClick }) {
  return (
    <button onClick={onClick}
      style={{ background: 'none', border: '1px solid #7c3aed', cursor: 'pointer', color: '#7c3aed', fontSize: 11, fontWeight: 700, borderRadius: 4, padding: '2px 8px' }}>
      Upload
    </button>
  );
}

// Cell showing Local + Blob state for one file type in a week row
function FileCell({ ft, local, blob, onDelLocal, onDelBlob, onUploadLocal, onUploadBlob }) {
  const rowStyle = { display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'space-between', padding: '3px 0' };
  const delBtnStyle = (c) => ({
    background: c, color: '#fff', border: 'none', borderRadius: 5,
    padding: '2px 8px', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
  });
  const upBtnStyle = {
    background: 'none', border: '1px solid #7c3aed', color: '#7c3aed',
    borderRadius: 5, padding: '2px 8px', fontSize: 11, fontWeight: 700, cursor: 'pointer',
  };

  return (
    <div style={{ minWidth: 160 }}>
      {/* Local row */}
      <div style={rowStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Badge color={local ? 'green' : 'gray'}>Local</Badge>
          {local ? <span style={{ fontSize: 11, color: '#15803d' }}>✓</span>
                 : <span style={{ fontSize: 11, color: '#d1d5db' }}>—</span>}
        </div>
        {local
          ? <button style={delBtnStyle('#dc2626')} onClick={onDelLocal}>Delete</button>
          : <button style={upBtnStyle} onClick={onUploadLocal}>Upload</button>
        }
      </div>
      {/* Blob row */}
      <div style={rowStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Badge color={blob ? 'blue' : 'gray'}>Blob</Badge>
          {blob  ? <span style={{ fontSize: 11, color: '#1d4ed8' }}>✓</span>
                 : <span style={{ fontSize: 11, color: '#d1d5db' }}>—</span>}
        </div>
        {blob
          ? <button style={delBtnStyle('#1d4ed8')} onClick={onDelBlob}>Delete</button>
          : <button style={upBtnStyle} onClick={onUploadBlob}>Upload</button>
        }
      </div>
    </div>
  );
}

// ── Upload modal (inline drawer) ───────────────────────────────────────────────

function UploadModal({ prefillWeek, prefillType, prefillDest, onClose, onDone }) {
  const [weekName, setWeekName] = useState(prefillWeek || '');
  const [fileType, setFileType] = useState(prefillType || 'wbr');
  const [dest,     setDest]     = useState(prefillDest || 'local');
  const [file,     setFile]     = useState(null);
  const [busy,     setBusy]     = useState(false);
  const [msg,      setMsg]      = useState('');
  const fileRef = useRef();

  async function submit(e) {
    e.preventDefault();
    if (!weekName.trim() || !file) return;
    setBusy(true); setMsg('');
    try {
      if (dest === 'local') await adminUploadLocalData(weekName.trim(), fileType, file);
      else                  await adminUploadData(weekName.trim(), fileType, file);
      setMsg('Uploaded!');
      setTimeout(() => { onDone(); onClose(); }, 700);
    } catch (err) {
      setMsg('Error: ' + err.message);
      setBusy(false);
    }
  }

  const inp = { background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' };
  const lbl = { fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', display: 'block', marginBottom: 4 };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: 16, padding: 28, width: 420, boxShadow: '0 8px 40px rgba(0,0,0,0.18)', fontFamily: "'Montserrat',sans-serif" }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 18 }}>Upload WBR Data File</div>
        <form onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
          <div>
            <label style={lbl}>Week Name</label>
            <input style={inp} value={weekName} onChange={e => setWeekName(e.target.value)} placeholder="e.g. Week of June 15" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lbl}>File Type</label>
              <select style={inp} value={fileType} onChange={e => setFileType(e.target.value)}>
                {FILE_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Destination</label>
              <select style={inp} value={dest} onChange={e => setDest(e.target.value)}>
                <option value="local">Local (server folder)</option>
                <option value="blob">Blob (Vercel)</option>
              </select>
            </div>
          </div>
          <div>
            <label style={lbl}>Excel File (.xlsx)</label>
            <input ref={fileRef} type="file" accept=".xlsx" style={{ ...inp, padding: '6px 12px' }}
              onChange={e => setFile(e.target.files[0] || null)} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button type="submit" disabled={busy || !weekName.trim() || !file}
              style={{ background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              {busy ? 'Uploading…' : 'Upload'}
            </button>
            <button type="button" onClick={onClose}
              style={{ background: '#e5e7eb', color: '#374151', border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              Cancel
            </button>
            {msg && <span style={{ fontSize: 13, color: msg.startsWith('Error') ? '#dc2626' : '#15803d' }}>{msg}</span>}
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function AdminPanel() {
  const [status,     setStatus]     = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [section,    setSection]    = useState('data');

  // Scorecard upload
  const [gran,       setGran]       = useState('weekly');
  const [scFile,     setScFile]     = useState(null);
  const [scUploading,setScUploading]= useState(false);
  const [scMsg,      setScMsg]      = useState('');
  const scFileRef = useRef();

  // Upload modal
  const [modal, setModal] = useState(null); // { week, type, dest }

  const load = () => {
    setLoading(true);
    fetchAdminStatus()
      .then(d => { setStatus(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  };
  useEffect(load, []);

  async function delLocal(weekName, ft) {
    if (!confirm(`Delete local ${ft} file for "${weekName}"?`)) return;
    try { await adminDeleteLocalData(weekName, ft); load(); }
    catch (err) { alert('Delete failed: ' + err.message); }
  }
  async function delBlob(weekName, ft) {
    if (!confirm(`Delete blob ${ft} file for "${weekName}"?`)) return;
    try { await adminDeleteData(weekName, ft); load(); }
    catch (err) { alert('Delete failed: ' + err.message); }
  }
  async function handleScorecardUpload(e) {
    e.preventDefault();
    if (!scFile) return;
    setScUploading(true); setScMsg('');
    try {
      await adminUploadScorecard(gran, scFile);
      setScMsg('Uploaded!');
      setScFile(null);
      if (scFileRef.current) scFileRef.current.value = '';
      load();
    } catch (err) {
      setScMsg('Error: ' + err.message);
    } finally {
      setScUploading(false);
    }
  }
  async function delBlobScorecard(g, filename) {
    if (!confirm(`Delete "${filename}" from blob?`)) return;
    try { await adminDeleteScorecard(g, filename); load(); }
    catch (err) { alert('Delete failed: ' + err.message); }
  }

  const card = { background: 'var(--card)', borderRadius: 12, padding: '20px 24px', border: '1px solid var(--border)', marginBottom: 20 };
  const btn  = (c = '#7c3aed') => ({ background: c, color: c === '#e5e7eb' ? '#374151' : '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Montserrat',sans-serif" });

  return (
    <div>
      {modal && (
        <UploadModal
          prefillWeek={modal.week}
          prefillType={modal.type}
          prefillDest={modal.dest}
          onClose={() => setModal(null)}
          onDone={load}
        />
      )}

      {/* Section tabs */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        {['data', 'scorecard'].map(s => (
          <button key={s} onClick={() => setSection(s)} style={btn(section === s ? '#7c3aed' : '#e5e7eb')}>
            {s === 'data' ? 'WBR Data' : 'Scorecard'}
          </button>
        ))}
        <button onClick={() => setModal({ week: '', type: 'wbr', dest: 'local' })} style={{ ...btn('#059669'), marginLeft: 'auto' }}>
          + Upload New Week
        </button>
        <button onClick={load} style={btn('#6b7280')}>Refresh</button>
      </div>

      {loading && <div style={{ color: 'var(--muted)', padding: 20 }}>Loading…</div>}
      {error   && <div style={{ color: '#dc2626', padding: 10 }}>{error}</div>}

      {/* ── DATA SECTION ──────────────────────────────────────────────────── */}
      {!loading && section === 'data' && (
        <>
          {/* Legend */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 14, alignItems: 'center', fontSize: 12, color: 'var(--muted)', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Badge color="green">✓</Badge> Local (server data/ folder)</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Badge color="blue">✓</Badge> Blob (Vercel storage)</div>
            <div style={{ color: '#9ca3af' }}>Local takes priority over Blob when both exist.</div>
          </div>

          {!status?.weeks?.length ? (
            <div style={{ ...card, color: 'var(--muted)' }}>No weeks found.</div>
          ) : (
            <div style={card}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>
                All Weeks ({status.weeks.length})
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)' }}>
                    {['Week', 'WBR', 'Loyalty', 'Catering'].map(h => (
                      <th key={h} style={{ textAlign: h === 'Week' ? 'left' : 'center', padding: '6px 10px', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {status.weeks.map(w => (
                    <tr key={w.weekName} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 10px', fontWeight: 600, verticalAlign: 'middle' }}>{w.weekName}</td>
                      {FILE_TYPES.map(ft => (
                        <td key={ft} style={{ padding: '10px 10px', verticalAlign: 'middle' }}>
                          <FileCell
                            ft={ft}
                            local={w.local[ft]}
                            blob={w.blob[ft]}
                            onDelLocal={() => delLocal(w.weekName, ft)}
                            onDelBlob={() => delBlob(w.weekName, ft)}
                            onUploadLocal={() => setModal({ week: w.weekName, type: ft, dest: 'local' })}
                            onUploadBlob={() => setModal({ week: w.weekName, type: ft, dest: 'blob' })}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── SCORECARD SECTION ─────────────────────────────────────────────── */}
      {!loading && section === 'scorecard' && (
        <>
          {/* Upload form */}
          <div style={card}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>Upload Scorecard to Blob</div>
            <form onSubmit={handleScorecardUpload} style={{ display: 'grid', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Granularity</label>
                  <select style={{ background: '#f3f4f6', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 13, width: '100%', fontFamily: 'inherit' }}
                    value={gran} onChange={e => setGran(e.target.value)}>
                    {GRANS.map(g => <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Excel File (.xlsx)</label>
                  <input ref={scFileRef} type="file" accept=".xlsx"
                    style={{ background: '#f3f4f6', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', fontSize: 13, width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' }}
                    onChange={e => setScFile(e.target.files[0] || null)} />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button type="submit" disabled={scUploading || !scFile} style={btn()}>
                  {scUploading ? 'Uploading…' : 'Upload to Blob'}
                </button>
                {scMsg && <span style={{ fontSize: 13, color: scMsg.startsWith('Error') ? '#dc2626' : '#15803d' }}>{scMsg}</span>}
              </div>
            </form>
          </div>

          {GRANS.map(g => {
            const files = status?.scorecards?.[g] || [];
            return (
              <div key={g} style={card}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, textTransform: 'capitalize' }}>
                  {g} Scorecards ({files.length})
                </div>
                {!files.length ? (
                  <div style={{ color: 'var(--muted)', fontSize: 13 }}>None found.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {files.map(f => (
                      <div key={f.filename} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f9fafb', borderRadius: 8, padding: '8px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {(f.source === 'local' || f.source === 'both') && <Badge color="green">Local</Badge>}
                          {(f.source === 'blob'  || f.source === 'both') && <Badge color="blue">Blob</Badge>}
                          <span style={{ fontSize: 13 }}>{f.filename}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {(f.source === 'blob' || f.source === 'both') && (
                            <button onClick={() => delBlobScorecard(g, f.filename)}
                              style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                              Delete Blob
                            </button>
                          )}
                          {f.source === 'local' && (
                            <span style={{ color: '#9ca3af', fontSize: 12, padding: '4px 0' }}>read-only</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
