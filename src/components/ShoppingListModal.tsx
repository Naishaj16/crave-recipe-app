import { useState, useEffect } from "react";
import type { ShoppingItem } from "../services/plannerService";
import {
  getShoppingList,
  addShoppingItem,
  toggleShoppingItem,
  deleteShoppingItem,
  clearShoppingList,
} from "../services/plannerService";

interface ShoppingListModalProps {
  onClose: () => void;
  onSelectRecipe?: (id: number) => void;
}

export default function ShoppingListModal({
  onClose,
  onSelectRecipe,
}: ShoppingListModalProps) {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newItemText, setNewItemText] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    loadList();
  }, []);

  const loadList = async () => {
    try {
      setLoading(true);
      const data = await getShoppingList();
      setItems(data);
    } catch (err) {
      console.error("Failed to load shopping list:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemText.trim()) return;

    setIsAdding(true);
    try {
      const created = await addShoppingItem(newItemText.trim());
      setItems((prev) => [created, ...prev]);
      setNewItemText("");
    } catch (err) {
      alert("Failed to add item to shopping list");
    } finally {
      setIsAdding(false);
    }
  };

  const handleToggle = async (id: number) => {
    try {
      const updated = await toggleShoppingItem(id);
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, is_checked: updated.is_checked } : item))
      );
    } catch (err) {
      console.error("Failed to toggle item:", err);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteShoppingItem(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      alert("Failed to delete item");
    }
  };

  const handleClear = async (onlyChecked: boolean) => {
    try {
      await clearShoppingList(onlyChecked);
      if (onlyChecked) {
        setItems((prev) => prev.filter((item) => !item.is_checked));
      } else {
        setItems([]);
      }
    } catch (err) {
      alert("Failed to clear shopping list");
    }
  };

  const checkedCount = items.filter((i) => i.is_checked).length;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="shopping-modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header-row">
          <div>
            <span className="eyebrow">INGREDIENT CHECKLIST</span>
            <h2>Shopping List</h2>
            <p>
              {items.length === 0
                ? "Your shopping list is empty. Add items below or directly from recipes."
                : `${checkedCount} of ${items.length} items collected.`}
            </p>
          </div>
          <button className="close-modal" onClick={onClose}>
            ×
          </button>
        </div>

        {/* Input to add grocery item */}
        <form onSubmit={handleAddItem} className="shopping-add-form">
          <input
            type="text"
            placeholder="Add grocery item (e.g., 2 tbsp olive oil, mozzarella)"
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
          />
          <button type="submit" className="primary-action-btn small" disabled={isAdding}>
            {isAdding ? "Adding..." : "+ Add Item"}
          </button>
        </form>

        {/* Shopping list actions */}
        {items.length > 0 && (
          <div className="shopping-bulk-actions">
            <span className="list-status-text">
              {items.length - checkedCount} pending, {checkedCount} checked
            </span>
            <div className="bulk-btn-group">
              {checkedCount > 0 && (
                <button
                  type="button"
                  className="link-button"
                  onClick={() => handleClear(true)}
                >
                  Clear Checked
                </button>
              )}
              <button
                type="button"
                className="link-button danger"
                onClick={() => handleClear(false)}
              >
                Clear All
              </button>
            </div>
          </div>
        )}

        {/* List items */}
        {loading ? (
          <div className="empty-state">
            <p>Loading ingredients...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <h3>No items yet</h3>
            <p>
              Click "Add to Shopping List" inside any recipe detail modal to automatically populate
              all ingredients!
            </p>
          </div>
        ) : (
          <ul className="shopping-items-list">
            {items.map((item) => (
              <li
                key={item.id}
                className={`shopping-item-row ${item.is_checked ? "completed" : ""}`}
                onClick={() => handleToggle(item.id)}
              >
                <div className="item-checkbox-wrapper">
                  <input
                    type="checkbox"
                    checked={item.is_checked}
                    onChange={() => handleToggle(item.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="item-label">{item.item_text}</span>
                </div>

                <div className="item-actions-side" onClick={(e) => e.stopPropagation()}>
                  {item.recipe_name && item.recipe_id && (
                    <button
                      type="button"
                      className="origin-recipe-tag"
                      onClick={() => {
                        onClose();
                        onSelectRecipe?.(item.recipe_id!);
                      }}
                      title={`View recipe: ${item.recipe_name}`}
                    >
                      {item.recipe_name}
                    </button>
                  )}
                  <button
                    type="button"
                    className="item-delete-btn"
                    onClick={() => handleDelete(item.id)}
                    title="Remove item"
                  >
                    ×
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
