const express = require('express');
const router = express.Router();
const {
  getContacts,
  createContact,
  updateContact,
  deleteContact,
  importContactsCSV,
  exportContactsCSV,
  toggleOptOut
} = require('../controllers/contactController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(getContacts)
  .post(createContact);

router.post('/import', importContactsCSV);
router.get('/export', exportContactsCSV);

router.route('/:id')
  .put(updateContact)
  .delete(deleteContact);

router.put('/:id/toggle-opt-out', toggleOptOut);

module.exports = router;
