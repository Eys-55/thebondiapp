import { useState, useCallback, useEffect } from 'react';
import { toast } from 'react-toastify';

/**
 * Custom hook to manage item selection from a data source representing a single main category.
 * @param {Object} itemsData - The data source for items, structured with sub-categories.
 *   Expected structure: { subCategoryName1: { items: [item1, ...], baseScore: X, ... }, subCategoryName2: { ... } }
 *   Example: { easy: { words: ["Cat"], baseScore: 10 }, medium: { words: ["Elephant"], baseScore: 25 } }
 * @param {Object} [options] - Configuration options.
 * @param {string} [options.defaultCategory] - The default sub-category to use (e.g., "easy").
 * @param {boolean} [options.allowPlayerChoice=false] - If true, allows manually setting an item.
 * @param {Object} [options.playerChoiceDefaultData={}] - Default data for player-chosen items.
 * @param {string} [options.itemKey='items'] - Key in each sub-category object for the array of items (e.g., 'words').
 * @returns {Object} - {
 *   selectedItem: Object | null - The currently selected item.
 *                                  Structure: { rawItem: any, categoryName: string (sub-category), baseScore: number, ... }
 *                                  If player choice: { ...playerChoiceDefaultData, isPlayerChoice: true }
 *   currentCategory: string | null - The name of the currently selected sub-category (e.g., "easy").
 *   availableCategories: string[] - List of sub-category names from itemsData (e.g., ["easy", "medium", "hard"]).
 *   selectCategory: function(subCategoryName: string) => void - Sets the current sub-category.
 *   drawItem: function() => void - Selects an item from the current sub-category.
 *   setPlayerChosenItem: function(chosenItemData: Object) => void - Manually sets item for player choice mode.
 *   resetSelection: function() => void - Clears selected item and sub-category.
 * }
 */
function useItemSelector({
  itemsData, // Expected to be like: { easy: { words: [], baseScore: X }, medium: { ... } }
  options = {},
}) {
  const {
    defaultCategory = null, // This is now a default sub-category
    allowPlayerChoice = false,
    playerChoiceDefaultData = {},
    itemKey = 'items',
  } = options;

  const [currentCategory, setCurrentCategory] = useState(defaultCategory); // e.g., "easy", "medium"
  const [selectedItem, setSelectedItem] = useState(null);
  const [availableCategories, setAvailableCategories] = useState([]); // e.g., ["easy", "medium", "hard"]

  // Effect to react to changes in itemsData (e.g., when a new main category is loaded)
  useEffect(() => {
    if (itemsData && typeof itemsData === 'object' && !Array.isArray(itemsData)) {
      setAvailableCategories(Object.keys(itemsData));
    } else {
      setAvailableCategories([]);
    }
    // Reset currentCategory (sub-category) to the default or null if itemsData changes
    setCurrentCategory(defaultCategory || null);
    setSelectedItem(null);
    // console.log('[useItemSelector] itemsData changed. Resetting. New availableCategories:', Object.keys(itemsData || {}));
  }, [itemsData, defaultCategory]);

  const selectCategory = useCallback((subCategoryName) => {
    if (availableCategories.includes(subCategoryName)) {
      setCurrentCategory(subCategoryName);
      setSelectedItem(null); // Reset item when sub-category changes
    } else {
      console.warn(`useItemSelector: Sub-category "${subCategoryName}" not found in current itemsData. Available:`, availableCategories);
    }
  }, [availableCategories]);

  const drawItem = useCallback(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[useItemSelector] Attempting to draw item.');
      console.log('[useItemSelector] Current sub-category (currentCategory):', currentCategory);
      console.log('[useItemSelector] itemKey:', itemKey);
      console.log('[useItemSelector] itemsData available:', !!itemsData);
      if (itemsData && currentCategory && itemsData[currentCategory]) {
        console.log(`[useItemSelector] Data for sub-category itemsData["${currentCategory}"]:`, itemsData[currentCategory]);
        console.log(`[useItemSelector] Items array at itemsData["${currentCategory}"]["${itemKey}"]:`, itemsData[currentCategory]?.[itemKey]);
      }
    }

    if (!itemsData) {
      toast.warn("useItemSelector: No itemsData provided.");
      setSelectedItem(null);
      return;
    }
    if (!currentCategory) {
      toast.warn("useItemSelector: No sub-category selected (currentCategory is null).");
      setSelectedItem(null);
      return;
    }
    if (!itemsData[currentCategory]) {
      toast.warn(`useItemSelector: Data for sub-category "${currentCategory}" not found.`);
      setSelectedItem(null);
      return;
    }

    const subCategoryData = itemsData[currentCategory];
    const itemsToDrawFrom = subCategoryData[itemKey];

    if (Array.isArray(itemsToDrawFrom) && itemsToDrawFrom.length > 0) {
      const randomIndex = Math.floor(Math.random() * itemsToDrawFrom.length);
      const rawDrawnItem = itemsToDrawFrom[randomIndex];

      // Prepare data from the sub-category, excluding the items array itself
      const { [itemKey]: _, ...restOfSubCategoryData } = subCategoryData;

      setSelectedItem({
        rawItem: rawDrawnItem,
        categoryName: currentCategory, // This is the sub-category name
        ...restOfSubCategoryData,     // Includes baseScore, etc.
      });
      if (process.env.NODE_ENV === 'development') {
        console.log('[useItemSelector] Successfully drew item:', rawDrawnItem, 'from sub-category:', currentCategory, 'with data:', restOfSubCategoryData);
      }
    } else {
      toast.warn(`useItemSelector: No items to draw in sub-category "${currentCategory}" or items array (key: "${itemKey}") is missing/empty.`);
      if (process.env.NODE_ENV === 'development') {
          console.warn(`[useItemSelector] DIAGNOSTIC: itemsToDrawFrom for sub-category "${currentCategory}" (key: "${itemKey}"):`, itemsToDrawFrom);
      }
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
      setCurrentCategory(null); // Player choice means no system sub-category is active
    } else {
      console.warn("useItemSelector: Setting player chosen item is not allowed by current options.");
    }
  }, [allowPlayerChoice, playerChoiceDefaultData]);

  const resetSelection = useCallback(() => {
    setCurrentCategory(defaultCategory); // Reset to default sub-category or null
    setSelectedItem(null);
  }, [defaultCategory]);

  return {
    selectedItem,
    currentCategory, // This is the sub-category (e.g., "easy")
    availableCategories, // These are the sub-categories (e.g., ["easy", "medium"])
    selectCategory, // Selects a sub-category
    drawItem,
    setPlayerChosenItem,
    resetSelection,
  };
}

export default useItemSelector;