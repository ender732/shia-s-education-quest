-- Align subjects + tasks to NYC DOE / NYS Grade 5 (P.S./I.S. 187 Hudson Cliffs)

UPDATE public.subjects SET description = 'NYS Next Generation Grade 5: multi-digit operations, decimals, fractions, and volume'
WHERE id = '11111111-1111-4111-8111-111111111111';

UPDATE public.subjects SET description = 'NYS Grade 5 ELA skills: narrative analysis, vocabulary roots, main idea, and RACECE writing'
WHERE id = '22222222-2222-4222-8222-222222222222';

UPDATE public.subjects SET description = 'NYSSLS Grade 5: matter, conservation of mass, Earth''s systems, ecosystems, and stars'
WHERE id = '33333333-3333-4333-8333-333333333333';

UPDATE public.subjects SET description = 'NYC Passport Grade 5: Western Hemisphere geography, exploration, and country case studies'
WHERE id = '44444444-4444-4444-8444-444444444444';

UPDATE public.subjects SET description = 'Independent reading practice with RACECE book reports (AI-graded)'
WHERE id = '55555555-5555-4555-8555-555555555555';

-- Refresh titles/descriptions on existing core tasks (keep ids/progress links)
UPDATE public.tasks SET
  title = 'Multi-Digit Multiplication',
  description = 'NY-5.NBT.5: multiply multi-digit whole numbers using the standard algorithm.'
WHERE unit_tag = '187_MATH_WHOLE_NUM';

UPDATE public.tasks SET
  title = 'Decimals to Thousandths',
  description = 'NY-5.NBT.3–4: read, write, compare, and round decimals to thousandths.'
WHERE unit_tag = '187_MATH_DECIMALS';

UPDATE public.tasks SET
  title = 'Fractions with Unlike Denominators',
  description = 'NY-5.NF.1–2: add and subtract fractions with unlike denominators.'
WHERE unit_tag = '187_MATH_FRACTIONS';

UPDATE public.tasks SET
  title = 'Volume of Rectangular Prisms',
  description = 'NY-5.MD.3–5: understand volume and use V = l × w × h.'
WHERE unit_tag = '187_MATH_VOLUME';

UPDATE public.tasks SET
  title = 'Narrative Analysis: Character Change',
  description = 'Explain how a character changes using text evidence.'
WHERE unit_tag = '187_ELA_UNIT1';

UPDATE public.tasks SET
  title = 'Greek & Latin Root Words',
  description = 'Use Greek and Latin roots to unlock word meanings.'
WHERE unit_tag = '187_ELA_ROOTS';

UPDATE public.tasks SET
  title = 'RACECE Constructed Response',
  description = 'Write using Restate, Answer, Cite, Explain, Cite, Explain.'
WHERE unit_tag = '187_RACECE_FORMAT';

UPDATE public.tasks SET
  title = 'Properties of Matter',
  description = 'NYSSLS 5-PS1: classify matter by observable and measurable properties.'
WHERE unit_tag = '187_SCI_MATTER';

UPDATE public.tasks SET
  title = 'Conservation of Mass',
  description = 'NYSSLS 5-PS1-2: show that mass is conserved in a closed system.'
WHERE unit_tag = '187_SCI_MASS';

UPDATE public.tasks SET
  title = 'Earth''s Four Spheres',
  description = 'NYSSLS 5-ESS2-1: geosphere, hydrosphere, atmosphere, and biosphere interactions.'
WHERE unit_tag = '187_SCI_SPHERES';

UPDATE public.tasks SET
  title = 'Geography of the Western Hemisphere',
  description = 'Passport Unit 1: map skills and major features of the Americas.'
WHERE unit_tag = '187_SS_MAPS';

UPDATE public.tasks SET
  title = 'Early Societies: Maya, Aztec, Inca',
  description = 'Passport Unit 1: compare early civilizations of the Western Hemisphere.'
WHERE unit_tag = '187_SS_HISTORY';

-- Insert new Grade 5 lessons if the unit_tag is not already present
INSERT INTO public.tasks (subject_id, title, description, unit_tag, xp_reward)
SELECT v.subject_id, v.title, v.description, v.unit_tag, v.xp_reward
FROM (VALUES
  ('11111111-1111-4111-8111-111111111111'::uuid, 'Powers of 10 & Place Value', 'NY-5.NBT.1–2: place-value patterns and powers of 10.', '187_MATH_POWERS10', 120),
  ('11111111-1111-4111-8111-111111111111'::uuid, 'Decimal Operations to Hundredths', 'NY-5.NBT.7: add, subtract, multiply, and divide decimals to hundredths.', '187_MATH_DECIMAL_OPS', 140),
  ('11111111-1111-4111-8111-111111111111'::uuid, 'Multiply & Divide Fractions', 'NY-5.NF: multiply fractions; limited fraction division cases.', '187_MATH_FRAC_MULT', 150),
  ('11111111-1111-4111-8111-111111111111'::uuid, 'Division with 2-Digit Divisors', 'NY-5.NBT.6: whole-number quotients with 2-digit divisors.', '187_MATH_DIV_2DIGIT', 140),
  ('22222222-2222-4222-8222-222222222222'::uuid, 'Main Idea & Text Evidence', 'Determine main idea and support it with text evidence.', '187_ELA_MAIN_IDEA', 120),
  ('33333333-3333-4333-8333-333333333333'::uuid, 'Matter & Energy in Ecosystems', 'NYSSLS 5-LS: producers, consumers, decomposers, and matter cycles.', '187_SCI_ECOSYSTEMS', 130),
  ('33333333-3333-4333-8333-333333333333'::uuid, 'Stars & Relative Brightness', 'NYSSLS 5-ESS1: stars, distance, and apparent brightness.', '187_SCI_STARS', 120),
  ('33333333-3333-4333-8333-333333333333'::uuid, 'Water on Earth', 'NYSSLS 5-ESS2-2: distribution of salt and fresh water on Earth.', '187_SCI_WATER', 120),
  ('44444444-4444-4444-8444-444444444444'::uuid, 'European Exploration', 'Passport Unit 2: exploration, contact, and multiple perspectives.', '187_SS_EXPLORATION', 140),
  ('44444444-4444-4444-8444-444444444444'::uuid, 'Case Study: United States', 'Passport case study: U.S. geography, government, and diversity.', '187_SS_US', 130),
  ('44444444-4444-4444-8444-444444444444'::uuid, 'Case Study: Dominican Republic', 'Passport case study: Caribbean geography, history, and culture.', '187_SS_DR', 130),
  ('44444444-4444-4444-8444-444444444444'::uuid, 'Case Study: Mexico', 'Passport case study: Mexico''s geography, Indigenous heritage, and nationhood.', '187_SS_MEXICO', 130),
  ('44444444-4444-4444-8444-444444444444'::uuid, 'Case Study: Canada', 'Passport case study: Canadian geography, government, and peoples.', '187_SS_CANADA', 130),
  ('44444444-4444-4444-8444-444444444444'::uuid, 'The Western Hemisphere Today', 'Passport Unit 4: trade, migration, environment, and citizenship today.', '187_SS_TODAY', 140)
) AS v(subject_id, title, description, unit_tag, xp_reward)
WHERE NOT EXISTS (
  SELECT 1 FROM public.tasks t WHERE t.unit_tag = v.unit_tag
);
