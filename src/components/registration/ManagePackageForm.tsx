import React, { useState } from "react";
import { Save, X, Plus, Trash2 } from "lucide-react";
import { StyledInput } from "../ui/FormComponents";

export interface CustomField {
  id: string;
  label: string;
  value: string;
}

export interface PackageItem {
  id: string;
  name: string;
  description: string;
  price: string; // Added Price
  customFields: CustomField[];
}

interface ManagePackageFormProps {
  packageToEdit: PackageItem | null;
  onSave: (pkg: PackageItem) => void;
  onClose: () => void;
  disabled: boolean;
}

export const ManagePackageForm: React.FC<ManagePackageFormProps> = ({
  packageToEdit,
  onSave,
  onClose,
  disabled,
}) => {
  const isEditing = !!packageToEdit;
  const [name, setName] = useState(packageToEdit?.name || "");
  const [description, setDescription] = useState(
    packageToEdit?.description || ""
  );
  const [price, setPrice] = useState(packageToEdit?.price || "");
  const [customFields, setCustomFields] = useState<CustomField[]>(
    packageToEdit?.customFields || []
  );

  const addCustomField = () => {
    setCustomFields([
      ...customFields,
      { id: Date.now().toString(), label: "", value: "" },
    ]);
  };

  const updateCustomField = (
    id: string,
    key: "label" | "value",
    val: string
  ) => {
    setCustomFields(
      customFields.map((f) => (f.id === id ? { ...f, [key]: val } : f))
    );
  };

  const removeCustomField = (id: string) => {
    setCustomFields(customFields.filter((f) => f.id !== id));
  };

  const handleSave = () => {
    if (name && description && price) {
      const finalPackage: PackageItem = {
        id: isEditing ? packageToEdit.id : Date.now().toString(),
        name: name.trim(),
        description: description.trim(),
        price: price.trim(),
        customFields: customFields.filter((f) => f.label && f.value),
      };
      onSave(finalPackage);
    } else {
      alert("Please fill in Name, Description, and Price.");
    }
  };

  return (
    <div className="p-4 border border-green-300 rounded-lg bg-green-50 mt-4 space-y-3 animate-fade-in">
      <h4 className="text-md font-bold text-green-800 flex justify-between items-center">
        {isEditing ? "Edit Package" : "Add New Package"}
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-gray-500 hover:text-gray-800 rounded-full hover:bg-gray-200"
        >
          <X className="w-4 h-4" />
        </button>
      </h4>

      <StyledInput
        type="text"
        placeholder="Package Name (e.g., General Checkup)"
        value={name}
        onChange={(e: any) => setName(e.target.value)}
        disabled={disabled}
        required
      />

      <StyledInput
        type="number"
        placeholder="Price (₹)"
        value={price}
        onChange={(e: any) => setPrice(e.target.value)}
        disabled={disabled}
        required
      />

      <textarea
        rows={2}
        placeholder="Description (Hover info)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white focus:ring-1 focus:ring-[#1a4b7a] focus:border-[#1a4b7a] transition-all duration-200 text-md resize-none"
        disabled={disabled}
      />

      {/* Custom Fields Section */}
      <div className="space-y-2 pt-2 border-t border-green-200">
        <div className="flex items-center justify-between">
          <label className="text-md font-semibold text-green-800 uppercase tracking-wider">
            Custom Details
          </label>
          <button
            type="button"
            onClick={addCustomField}
            className="text-md flex items-center text-green-700 hover:text-green-900 font-medium"
          >
            <Plus className="w-3 h-3 mr-1" /> Add Field
          </button>
        </div>

        {customFields.map((field) => (
          <div key={field.id} className="flex space-x-2 items-center">
            <input
              type="text"
              placeholder="Label"
              value={field.label}
              onChange={(e) =>
                updateCustomField(field.id, "label", e.target.value)
              }
              className="w-1/3 px-2 py-1.5 border border-gray-300 rounded text-md focus:outline-none focus:border-green-500"
            />
            <input
              type="text"
              placeholder="Value"
              value={field.value}
              onChange={(e) =>
                updateCustomField(field.id, "value", e.target.value)
              }
              className="w-1/2 px-2 py-1.5 border border-gray-300 rounded text-md focus:outline-none focus:border-green-500"
            />
            <button
              type="button"
              onClick={() => removeCustomField(field.id)}
              className="p-1 text-red-500 hover:text-red-700"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={disabled || !name || !description || !price}
        className="w-full flex items-center justify-center space-x-1.5 px-3 py-2 bg-[#012e58] text-white rounded-lg hover:bg-[#1a4b7a] transition-colors text-md font-medium disabled:opacity-50 mt-2"
      >
        <Save className="w-4 h-4" />
        <span>{isEditing ? "Update Package" : "Save Package"}</span>
      </button>
    </div>
  );
};
