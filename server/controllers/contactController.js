const Contact = require('../models/Contact');

// GET /api/contacts
const getContacts = async (req, res) => {
  try {
    const { search, optOut, page = 1, limit = 50 } = req.query;
    const query = { userId: req.user.id };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    if (optOut !== undefined) {
      query.optOutStatus = optOut === 'true';
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await Contact.countDocuments(query);
    const contacts = await Contact.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    res.json({
      success: true,
      count: contacts.length,
      total,
      page: parseInt(page, 10),
      pages: Math.ceil(total / parseInt(limit, 10)),
      contacts
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/contacts
const createContact = async (req, res) => {
  try {
    const { name, phone, email, tags, notes, consentStatus, optOutStatus } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Name and Phone number are required' });
    }

    const existing = await Contact.findOne({ userId: req.user.id, phone: phone.trim() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Contact with this phone number already exists' });
    }

    const contact = await Contact.create({
      userId: req.user.id,
      name: name.trim(),
      phone: phone.trim(),
      email: email ? email.trim() : '',
      tags: Array.isArray(tags) ? tags : [],
      notes: notes || '',
      consentStatus: consentStatus !== undefined ? Boolean(consentStatus) : true,
      optOutStatus: optOutStatus !== undefined ? Boolean(optOutStatus) : false
    });

    res.status(201).json({ success: true, contact });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/contacts/:id
const updateContact = async (req, res) => {
  try {
    const contact = await Contact.findOne({ _id: req.params.id, userId: req.user.id });
    if (!contact) {
      return res.status(404).json({ success: false, message: 'Contact not found' });
    }

    const updated = await Contact.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, contact: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/contacts/:id
const deleteContact = async (req, res) => {
  try {
    const contact = await Contact.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!contact) {
      return res.status(404).json({ success: false, message: 'Contact not found' });
    }
    res.json({ success: true, message: 'Contact deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/contacts/import
const importContactsCSV = async (req, res) => {
  try {
    const { contacts } = req.body; // array of { name, phone, email }
    if (!Array.isArray(contacts) || contacts.length === 0) {
      return res.status(400).json({ success: false, message: 'No contacts provided for import' });
    }

    let createdCount = 0;
    let duplicateCount = 0;
    const errors = [];

    for (const c of contacts) {
      if (!c.name || !c.phone) {
        errors.push(`Missing required fields for entry: ${JSON.stringify(c)}`);
        continue;
      }

      const existing = await Contact.findOne({ userId: req.user.id, phone: c.phone.trim() });
      if (existing) {
        duplicateCount++;
        continue;
      }

      await Contact.create({
        userId: req.user.id,
        name: c.name.trim(),
        phone: c.phone.trim(),
        email: c.email ? c.email.trim() : '',
        tags: c.tags ? c.tags.split(',') : ['CSV Import'],
        consentStatus: true,
        optOutStatus: false
      });
      createdCount++;
    }

    res.json({
      success: true,
      message: `Import completed: ${createdCount} created, ${duplicateCount} duplicates skipped.`,
      createdCount,
      duplicateCount,
      errors
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/contacts/export
const exportContactsCSV = async (req, res) => {
  try {
    const contacts = await Contact.find({ userId: req.user.id }).sort({ name: 1 });
    let csv = 'name,phone,email,optOutStatus,createdAt\n';
    contacts.forEach((c) => {
      csv += `"${c.name}","${c.phone}","${c.email}","${c.optOutStatus}","${c.createdAt.toISOString()}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="talkpilot_contacts.csv"');
    res.status(200).send(csv);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/contacts/:id/toggle-opt-out
const toggleOptOut = async (req, res) => {
  try {
    const contact = await Contact.findOne({ _id: req.params.id, userId: req.user.id });
    if (!contact) {
      return res.status(404).json({ success: false, message: 'Contact not found' });
    }

    contact.optOutStatus = !contact.optOutStatus;
    await contact.save();

    res.json({ success: true, contact, message: `Contact opt-out status updated to ${contact.optOutStatus}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getContacts,
  createContact,
  updateContact,
  deleteContact,
  importContactsCSV,
  exportContactsCSV,
  toggleOptOut
};
