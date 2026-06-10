import { useState } from "react";
import type { Contact } from "@quantic/shared";
import { api, ApiException } from "../lib/api";
import { Modal } from "./Modal";

interface Props {
  contact: Contact | null; // null => création
  onClose: () => void;
  onSaved: () => void;
  onDeleted?: () => void;
}

export function ContactEditModal({ contact, onClose, onSaved, onDeleted }: Props) {
  const isNew = contact === null;
  const [name, setName] = useState(contact?.name ?? "");
  const [email, setEmail] = useState(contact?.email ?? "");
  const [phone, setPhone] = useState(contact?.phone ?? "");
  const [company, setCompany] = useState(contact?.company ?? "");
  const [type, setType] = useState(contact?.type ?? "");
  const [note, setNote] = useState(contact?.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const save = async () => {
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    const payload = {
      name: name.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      company: company.trim() || null,
      type: type.trim() || null,
      note: note.trim() || null,
    };
    try {
      if (isNew) await api.createContact(payload);
      else await api.updateContact(contact!.id, payload);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiException ? err.message : "Enregistrement impossible.");
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!contact) return;
    setBusy(true);
    setError(null);
    try {
      await api.deleteContact(contact.id);
      onDeleted?.();
    } catch (err) {
      setError(err instanceof ApiException ? err.message : "Suppression impossible.");
      setBusy(false);
    }
  };

  return (
    <Modal title={isNew ? "Nouveau contact" : "Modifier le contact"} onClose={onClose}>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="field">
        <label htmlFor="c-name">Nom</label>
        <input id="c-name" className="input full" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="row" style={{ gap: 12 }}>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="c-email">Email</label>
          <input id="c-email" className="input full" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="c-phone">Téléphone</label>
          <input id="c-phone" className="input full" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
      </div>
      <div className="row" style={{ gap: 12 }}>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="c-company">Entreprise</label>
          <input id="c-company" className="input full" value={company} onChange={(e) => setCompany(e.target.value)} />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="c-type">Type</label>
          <input id="c-type" className="input full" value={type} onChange={(e) => setType(e.target.value)} placeholder="client, ami…" />
        </div>
      </div>
      <div className="field">
        <label htmlFor="c-note">Note</label>
        <textarea id="c-note" className="textarea full" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>

      <div className="modal-actions">
        {!isNew ? (
          confirmDelete ? (
            <button className="btn btn-danger" onClick={remove} disabled={busy}>
              Confirmer la suppression
            </button>
          ) : (
            <button className="btn btn-danger" onClick={() => setConfirmDelete(true)} disabled={busy}>
              Supprimer
            </button>
          )
        ) : (
          <span />
        )}
        <div className="right">
          <button className="btn btn-ghost" onClick={onClose} disabled={busy}>
            Annuler
          </button>
          <button className="btn btn-primary" onClick={save} disabled={busy || !name.trim()}>
            Enregistrer
          </button>
        </div>
      </div>
    </Modal>
  );
}
