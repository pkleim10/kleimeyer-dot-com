INSERT INTO recipes (
  id,
  name,
  description,
  ingredients,
  instructions,
  prep_time,
  cook_time,
  servings,
  category_id,
  user_id,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'Classic Meatloaf',
  'A hearty, traditional meatloaf with a sweet and tangy glaze',
  '[
    {"amount": 2, "unit": "pounds", "item": "ground beef"},
    {"amount": 1, "unit": "cup", "item": "breadcrumbs"},
    {"amount": 0.5, "unit": "cup", "item": "milk"},
    {"amount": 2, "unit": "whole", "item": "eggs"},
    {"amount": 1, "unit": "whole", "item": "onion, finely chopped"},
    {"amount": 2, "unit": "cloves", "item": "garlic, minced"},
    {"amount": 1, "unit": "tablespoon", "item": "Worcestershire sauce"},
    {"amount": 1, "unit": "teaspoon", "item": "salt"},
    {"amount": 0.5, "unit": "teaspoon", "item": "black pepper"},
    {"amount": 0.5, "unit": "cup", "item": "ketchup"},
    {"amount": 2, "unit": "tablespoons", "item": "brown sugar"},
    {"amount": 1, "unit": "tablespoon", "item": "mustard"}
  ]',
  ARRAY[
    'Preheat oven to 350°F (175°C)',
    'In a large bowl, combine ground beef, breadcrumbs, milk, eggs, onion, garlic, Worcestershire sauce, salt, and pepper',
    'Mix ingredients thoroughly with your hands until well combined',
    'Transfer mixture to a 9x5 inch loaf pan and shape into a loaf',
    'In a small bowl, mix ketchup, brown sugar, and mustard to make the glaze',
    'Spread the glaze evenly over the meatloaf',
    'Bake for 1 hour or until internal temperature reaches 160°F (71°C)',
    'Let rest for 10 minutes before slicing and serving'
  ],
  20,
  70,
  8,
  '1a5b735e-2485-42fb-8cc2-ca992e687f04',
  'ed03e845-8538-4efa-bed3-3671ed081bb0',
  NOW(),
  NOW()
); 