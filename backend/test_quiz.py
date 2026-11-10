import unittest

import main


class QuizValidationTests(unittest.TestCase):
    def test_normalizes_options_with_attached_explanations(self):
        item = {
            "topic": "Quantifiers",
            "question": "What does ∀ mean?",
            "options": [
                {"text": "For every element.", "explanation": "This denotes universal scope."},
                {"text": "There exists an element.", "explanation": "This denotes existential scope."},
                {"text": "No elements exist.", "explanation": "This is not the universal symbol."},
                {"text": "The set is empty.", "explanation": "This describes a set property."},
            ],
            "correctIndex": 0,
        }
        normalized, reason = main.normalize_quiz_item(item)
        self.assertIsNone(reason)
        self.assertEqual(normalized["options"][0], "For every element.")
        self.assertEqual(normalized["explanations"][0], "This denotes universal scope.")

    def test_normalizes_legacy_parallel_option_and_explanation_arrays(self):
        item = {
            "topic": "Quantifiers",
            "question": "What does ∀ mean?",
            "options": ["For every element.", "There exists an element.", "No elements exist.", "The set is empty."],
            "explanations": ["Universal scope.", "Existential scope.", "Not universal.", "Set property."],
            "correctIndex": 0,
        }
        normalized, reason = main.normalize_quiz_item(item)
        self.assertIsNone(reason)
        self.assertEqual(normalized["explanations"], item["explanations"])

    def test_rejects_letter_references_and_all_of_the_above(self):
        base = {
            "topic": "Sets", "question": "Which is true?", "correctIndex": 0,
            "options": [
                {"text": "x ∈ A", "explanation": "Membership relation."},
                {"text": "x ⊆ A", "explanation": "Subset relation."},
                {"text": "A = ∅", "explanation": "An empty set."},
                {"text": "x ∩ A", "explanation": "An intersection."},
            ],
        }
        option_reference = {**base, "options": list(base["options"])}
        option_reference["options"][1] = {"text": "Option A is correct", "explanation": "A reference."}
        normalized, reason = main.normalize_quiz_item(option_reference)
        self.assertIsNone(normalized)
        self.assertIn("letter/position", reason)

        all_above = {**base, "options": list(base["options"])}
        all_above["options"][1] = {"text": "All of the above", "explanation": "Combined answer."}
        normalized, reason = main.normalize_quiz_item(all_above)
        self.assertIsNone(normalized)
        self.assertIn("all/none of the above", reason)

    def test_balance_and_shuffle_preserves_option_explanations_and_spreads_positions(self):
        questions = []
        originals = {}
        for question_index in range(10):
            options = [f"q{question_index}-option{option_index}" for option_index in range(4)]
            explanations = [f"explanation-q{question_index}-option{option_index}" for option_index in range(4)]
            correct_index = question_index % 4
            originals[question_index] = list(zip(options, explanations))
            questions.append({
                "topic": f"Topic {question_index}", "question": f"Question {question_index}",
                "options": options, "correctIndex": correct_index,
                "explanations": explanations, "points": 10,
            })

        shuffled = main.balance_and_shuffle(questions)
        distribution = [0, 0, 0, 0]
        for question_index, result in enumerate(shuffled):
            correct_index = result["correctIndex"]
            distribution[correct_index] += 1
            self.assertEqual(
                result["options"][correct_index],
                originals[question_index][question_index % 4][0],
            )
            self.assertEqual(
                result["explanations"][correct_index],
                originals[question_index][question_index % 4][1],
            )
            self.assertEqual(
                set(zip(result["options"], result["explanations"])),
                set(originals[question_index]),
            )
        self.assertEqual(sorted(distribution), [2, 2, 3, 3])
        self.assertTrue(all(position_count > 0 for position_count in distribution))


if __name__ == "__main__":
    unittest.main()
