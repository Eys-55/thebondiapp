import { useState, useCallback, useMemo } from 'react';
import { toast } from 'react-toastify'; // Optional: for warnings if no items found

/**
 * Custom hook to manage item selection from a data source.
 * @param {Object} itemsData - The data source for items.
 *   Expected structure: { categoryName1: { items: [item1, item2, ...], ...otherCategoryData }, ... }
 *   Or a flat array: [item1, item2, ...] (treated as a single default category)
 * @param {Object} [options] - Configuration options.
 * @param {string} [options.defaultCategory] - The default category to use if itemsData is categorical.
 * @param {boolean} [options.allowPlayerChoice=false] - If true, allows manually setting an item (e.g., player chooses their own).
 * @param {Object} [options.playerChoiceDefaultData={}] - Default data to merge when a player choice is set.
 * @param {string} [options.itemKey='items'] - The key in each category object that holds the array of items (e.g., 'words' in Charades).
 * @returns {Object} - {
 *   selectedItem: Object | null - The currently selected item, including category data.
 *                                  Structure: { rawItem: any, categoryName: string, ...otherCategoryData }
 *                                  If player choice: { ...playerChoiceDefaultData, isPlayerChoice: true }
 *   currentCategory: string | null - The name of the currently selected category.
 *   availableCategories: string[] - List of category names from itemsData.
 *   selectCategory: function(categoryName: string) => void - Sets the current category.
 *   drawItem: function() => void - Selects an item from the current category.
 *   setPlayerChosenItem: function(chosenItemData: Object) => void - Manually sets item for player choice mode.
 *   resetSelection: function() => void - Clears selected item and category.
 * }
 */
function useItemSelector({
  itemsData,
  options = {},
}) {
  const {
    defaultCategory = null,
    allowPlayerChoice = false,
    playerChoiceDefaultData = {},
    itemKey = 'items', // Default key for items array within a category
  } = options;

  const [currentCategory, setCurrentCategory] = useState(defaultCategory);
  const [selectedItem, setSelectedItem] = useState(null);
  // const [previouslyDrawnIndices, setPreviouslyDrawnIndices] = useState({}); // For avoiding immediate repeats per category - future enhancement

  const availableCategories = useMemo(() => {
    if (itemsData && typeof itemsData === 'object' && !Array.isArray(itemsData)) {
      return Object.keys(itemsData);
    }
    return [];
  }, [itemsData]);

  const selectCategory = useCallback((categoryName) => {
    if (availableCategories.includes(categoryName)) {
      setCurrentCategory(categoryName);
      setSelectedItem(null); // Reset item when category changes
      // setPreviouslyDrawnIndices(prev => ({ ...prev, [categoryName]: new Set() })); // Reset for new category - future
    } else if (!categoryName && Array.isArray(itemsData)) { // Allow unsetting category if data is flat array
      setCurrentCategory(null);
      setSelectedItem(null);
    }
    else {
      console.warn(`useItemSelector: Category "${categoryName}" not found in itemsData.`);
    }
  }, [availableCategories, itemsData]);

  const drawItem = useCallback(() => {
    // --- Start Enhanced Logging ---
    if (process.env.NODE_ENV === 'development') {
      console.log('[useItemSelector] Attempting to draw item.');
      console.log('[useItemSelector] Current category:', currentCategory);
      console.log('[useItemSelector] itemKey:', itemKey);
      console.log('[useItemSelector] itemsData available:', !!itemsData);
      if (itemsData && currentCategory) {
        console.log(`[useItemSelector] Data for category itemsData["${currentCategory}"]:`, itemsData[currentCategory]);
        if (itemsData[currentCategory]) {
          console.log(`[useItemSelector] Items array at itemsData["${currentCategory}"]["${itemKey}"]:`, itemsData[currentCategory][itemKey]);
        } else {
          console.log(`[useItemSelector] No data found for category "${currentCategory}" in itemsData.`);
        }
      }
    }
    // --- End Enhanced Logging ---

    if (!itemsData) {
      toast.warn("useItemSelector: No itemsData provided.");
      setSelectedItem(null);
      return;
    }

    let itemsToDrawFrom = [];
    let categoryDataForSelectedItem = {};
    let categoryNameForSelectedItem = currentCategory;

    if (Array.isArray(itemsData)) { // Flat array of items
      itemsToDrawFrom = itemsData;
      categoryNameForSelectedItem = null; // No specific category name
      if (process.env.NODE_ENV === 'development') {
        console.log('[useItemSelector] itemsData is a flat array. Using it directly. Length:', itemsToDrawFrom.length);
      }
    } else if (currentCategory && itemsData[currentCategory]) {
      if (Array.isArray(itemsData[currentCategory][itemKey])) {
        itemsToDrawFrom = itemsData[currentCategory][itemKey];
        categoryDataForSelectedItem = { ...itemsData[currentCategory] };
        delete categoryDataForSelectedItem[itemKey]; // Remove the items array itself from category data
        if (process.env.NODE_ENV === 'development') {
          console.log(`[useItemSelector] Successfully accessed items array for category "${currentCategory}" using itemKey "${itemKey}". Length:`, itemsToDrawFrom.length);
          if (itemsToDrawFrom.length === 0) {
            console.warn(`[useItemSelector] DIAGNOSTIC: The items array for category "${currentCategory}" (key "${itemKey}") is EMPTY.`);
          }
        }
      } else {
        // This case means itemsData[currentCategory] exists, but itemsData[currentCategory][itemKey] is not an array.
        if (process.env.NODE_ENV === 'development') {
          console.warn(`[useItemSelector] For category "${currentCategory}", itemKey "${itemKey}" does not point to an array. Value:`, itemsData[currentCategory][itemKey]);
        }
        toast.warn(`useItemSelector: No items array found for category "${currentCategory}" with key "${itemKey}".`);
        setSelectedItem(null);
        return;
      }
    } else {
      // This case means currentCategory is not set, or itemsData[currentCategory] does not exist.
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[useItemSelector] Category "${currentCategory}" not found in itemsData or category not selected.`);
      }
      toast.warn(`useItemSelector: No data found for category "${currentCategory}" or category not selected.`);
      setSelectedItem(null);
      return;
    }

    if (itemsToDrawFrom.length > 0) {
      const randomIndex = Math.floor(Math.random() * itemsToDrawFrom.length);
      const rawDrawnItem = itemsToDrawFrom[randomIndex];

      setSelectedItem({
        rawItem: rawDrawnItem,
        categoryName: categoryNameForSelectedItem,
        ...categoryDataForSelectedItem,
      });
      if (process.env.NODE_ENV === 'development') {
        console.log('[useItemSelector] Successfully drew item:', rawDrawnItem, 'from category:', categoryNameForSelectedItem);
      }
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[useItemSelector] Final check: No items to draw from in category "${categoryNameForSelectedItem || 'default'}" (itemsToDrawFrom array was empty).`);
      }
      toast.warn(`useItemSelector: No items to draw in category "${categoryNameForSelectedItem || 'default'}".`);
      setSelectedItem(null);
    }
  }, [itemsData, currentCategory, itemKey]);

  const setPlayerChosenItem = useCallback((chosenItemData = {}) => {
    if (allowPlayerChoice) {
      setSelectedItem({
        ...playerChoiceDefaultData,
        ...chosenItemData,
        isPlayerChoice: true,
      });
      setCurrentCategory(null); // Player choice typically means no system category is active
    } else {
      console.warn("useItemSelector: Setting player chosen item is not allowed by current options.");
    }
  }, [allowPlayerChoice, playerChoiceDefaultData]);

  const resetSelection = useCallback(() => {
    setCurrentCategory(defaultCategory);
    setSelectedItem(null);
    // setPreviouslyDrawnIndices({}); // Reset all - future
  }, [defaultCategory]);

  return {
    selectedItem,
    currentCategory,
    availableCategories,
    selectCategory,
    drawItem,
    setPlayerChosenItem,
    resetSelection,
  };
}

export default useItemSelector;