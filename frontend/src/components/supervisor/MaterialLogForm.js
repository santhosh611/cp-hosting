// construction new/frontend/src/components/supervisor/MaterialLogForm.js
import React, { useState, useEffect } from 'react';
import API from '../../api/axios';
import { toast } from 'react-toastify';
import Modal from '../common/Modal'; // Assuming you have a Modal component

const MaterialLogForm = ({ siteId, entryToEdit, onClose, onMaterialLogAdded }) => {
  const [material, setMaterial] = useState('');
  const [brand, setBrand] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState(''); // Selected unit
  const [pricePerUnit, setPricePerUnit] = useState(''); // Now optional
  const [flightCharge, setFlightCharge] = useState(''); // New optional field
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // State for unit management
  const [units, setUnits] = useState(() => {
    const savedUnits = localStorage.getItem('materialUnits');
    // Default units for the first load if nothing in localStorage
    return savedUnits ? JSON.parse(savedUnits) : ['kg', 'gram', 'bag', 'roll', 'meter', 'feet', 'liter', 'piece', 'box', 'set'];
  });
  const [showUnitManagementModal, setShowUnitManagementModal] = useState(false);
  const [newUnitName, setNewUnitName] = useState('');

  // Effect to save units to local storage whenever 'units' state changes
  useEffect(() => {
    localStorage.setItem('materialUnits', JSON.stringify(units));
  }, [units]);

  // Effect to populate form fields when an entry is selected for editing
  useEffect(() => {
    if (entryToEdit) {
      setMaterial(entryToEdit.material || '');
      setBrand(entryToEdit.brand || '');
      setQuantity(entryToEdit.quantity || '');
      setUnit(entryToEdit.unit || '');
      setPricePerUnit(entryToEdit.pricePerUnit !== null ? entryToEdit.pricePerUnit : ''); // Handle optional, show empty string for null
      setFlightCharge(entryToEdit.flightCharge !== null ? entryToEdit.flightCharge : ''); // Handle optional, show empty string for null
      setDate(entryToEdit.date ? new Date(entryToEdit.date).toISOString().split('T')[0] : '');
    } else {
      // Reset form for new entry
      setMaterial('');
      setBrand('');
      setQuantity('');
      setUnit('');
      setPricePerUnit('');
      setFlightCharge('');
      setDate(new Date().toISOString().split('T')[0]); // Default to today for new entries
    }
  }, [entryToEdit]); // Dependency on entryToEdit

  const handleAddUnit = () => {
    if (newUnitName.trim() && !units.includes(newUnitName.trim())) {
      setUnits([...units, newUnitName.trim()]);
      setNewUnitName('');
      toast.success(`Unit '${newUnitName.trim()}' added!`);
    } else if (units.includes(newUnitName.trim())) {
      toast.warn('Unit already exists!');
    } else {
      toast.error('Unit name cannot be empty.');
    }
  };

  const handleRemoveUnit = (unitToRemove) => {
    if (unit === unitToRemove) {
      toast.error(`Cannot remove unit '${unitToRemove}' while it is selected.`);
      return;
    }
    const updatedUnits = units.filter(u => u !== unitToRemove);
    setUnits(updatedUnits);
    toast.info(`Unit '${unitToRemove}' removed.`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!material || !quantity || !unit || !date) {
      setError('Please fill in material, quantity, unit, and date.');
      setLoading(false);
      return;
    }

    try {
      const materialData = {
        siteId,
        material,
        brand,
        quantity: parseFloat(quantity),
        unit,
        pricePerUnit: pricePerUnit === '' || isNaN(parseFloat(pricePerUnit)) ? null : parseFloat(pricePerUnit),
        flightCharge: flightCharge === '' || isNaN(parseFloat(flightCharge)) ? null : parseFloat(flightCharge),
        date,
      };

      let response;
      if (entryToEdit) {
        response = await API.put(`/materials/${entryToEdit._id}`, materialData);
        toast.success('Material entry updated successfully!');
      } else {
        response = await API.post('/materials', materialData);
        toast.success('Material entry added successfully!');
      }

      onMaterialLogAdded(response.data);
      onClose();
    } catch (err) {
      console.error('Error logging material:', err);
      const errorMessage = err.response?.data?.message || 'Failed to save material entry. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg">
      <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-6 text-center">
        {entryToEdit ? 'Edit Material Entry' : 'Add New Material Entry'}
      </h2>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Error! </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      {/* MODIFIED: Wrapped form in a main div and applied grid classes to field groups */}
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700" htmlFor="material">Material <span className="text-red-500">*</span></label>
              <input type="text" id="material" value={material} onChange={(e) => setMaterial(e.target.value)} className="mt-1 input input-bordered w-full p-2 border rounded-lg" placeholder="e.g., Cement" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700" htmlFor="brand">Brand (Optional)</label>
              <input type="text" id="brand" value={brand} onChange={(e) => setBrand(e.target.value)} className="mt-1 input input-bordered w-full p-2 border rounded-lg" placeholder="e.g., UltraTech" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700" htmlFor="quantity">Quantity <span className="text-red-500">*</span></label>
              <input type="number" id="quantity" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="mt-1 input input-bordered w-full p-2 border rounded-lg" placeholder="e.g., 50" required min="0" step="any" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700" htmlFor="unit">Unit <span className="text-red-500">*</span></label>
              <div className="flex items-center space-x-2">
                <select id="unit" value={unit} onChange={(e) => setUnit(e.target.value)} className="mt-1 select select-bordered w-full p-2 border rounded-lg" required>
                  <option value="" disabled>Select Unit</option>
                  {units.map((u) => (<option key={u} value={u}>{u}</option>))}
                </select>
                <button type="button" onClick={() => setShowUnitManagementModal(true)} className="mt-1 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 shadow-sm">Manage</button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700" htmlFor="pricePerUnit">Price/Unit (Optional)</label>
              <input type="number" id="pricePerUnit" value={pricePerUnit} onChange={(e) => setPricePerUnit(e.target.value)} className="mt-1 input input-bordered w-full p-2 border rounded-lg" placeholder="e.g., 500" min="0" step="any" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700" htmlFor="flightCharge">Flight Charge (Optional)</label>
              <input type="number" id="flightCharge" value={flightCharge} onChange={(e) => setFlightCharge(e.target.value)} className="mt-1 input input-bordered w-full p-2 border rounded-lg" placeholder="e.g., 100" min="0" step="any" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700" htmlFor="date">Date <span className="text-red-500">*</span></label>
              <input type="date" id="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 input input-bordered w-full p-2 border rounded-lg" required />
            </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400">
            Cancel
          </button>
          <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50" disabled={loading}>
            {loading ? 'Saving...' : (entryToEdit ? 'Update Entry' : 'Add Entry')}
          </button>
        </div>
      </form>

      <Modal isOpen={showUnitManagementModal} onClose={() => setShowUnitManagementModal(false)} title="Manage Units">
        <div className="p-4">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Add New Unit</h3>
          <div className="flex space-x-2 mb-6">
            <input type="text" className="input input-bordered flex-grow px-3 py-2 border rounded-lg" placeholder="Enter new unit name" value={newUnitName} onChange={(e) => setNewUnitName(e.target.value)} />
            <button onClick={handleAddUnit} className="btn bg-green-500 text-white hover:bg-green-600 px-4 py-2 rounded-lg shadow-md">
              Add
            </button>
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Current Units</h3>
          <ul className="space-y-2 max-h-60 overflow-y-auto border border-gray-200 p-3 rounded-lg bg-gray-50">
            {units.length > 0 ? (
              units.map((u) => (
                <li key={u} className="flex items-center justify-between p-2 border-b">
                  <span>{u}</span>
                  <button onClick={() => handleRemoveUnit(u)} className="text-red-500 hover:text-red-700">Remove</button>
                </li>
              ))
            ) : (
              <li className="p-2 text-center text-gray-500">No units added yet.</li>
            )}
          </ul>
        </div>
      </Modal>
    </div>
  );
};

export default MaterialLogForm;