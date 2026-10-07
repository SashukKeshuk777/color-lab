import unittest

from server import convert, source_to_rgb


class ColorConversionTests(unittest.TestCase):
    def assert_close(self, actual, expected):
        self.assertAlmostEqual(actual, expected, places=8)

    def test_red_from_rgb(self):
        result = convert("rgb", {"r": 255, "g": 0, "b": 0})
        self.assertEqual(result["hex"], "#FF0000")
        self.assertEqual(result["cmyk"], {"c": 0, "m": 100, "y": 100, "k": 0})
        self.assert_close(result["hsv"]["h"], 0)
        self.assert_close(result["hsv"]["s"], 100)
        self.assert_close(result["hls"]["l"], 50)

    def test_black_and_white_cmyk(self):
        black = convert("rgb", {"r": 0, "g": 0, "b": 0})
        white = convert("rgb", {"r": 255, "g": 255, "b": 255})
        self.assertEqual(black["cmyk"], {"c": 0, "m": 0, "y": 0, "k": 100})
        self.assertEqual(white["cmyk"], {"c": 0, "m": 0, "y": 0, "k": 0})

    def test_hue_360_is_same_as_zero(self):
        result = convert("hsv", {"h": 360, "s": 100, "v": 100})
        self.assertEqual(result["hex"], "#FF0000")
        self.assertEqual(result["hsv"]["h"], 360)

    def test_ineffective_components_stay_editable(self):
        gray = convert("hsv", {"h": 220, "s": 0, "v": 40})
        black = convert("cmyk", {"c": 34, "m": 22, "y": 11, "k": 100})
        self.assertEqual(gray["hsv"]["h"], 220)
        self.assertEqual(black["cmyk"]["c"], 34)
        self.assertEqual(black["hex"], "#000000")

    def test_round_trip_through_each_model(self):
        for r, g, b in ((0, 0, 0), (255, 255, 255), (10, 83, 196), (122, 122, 122), (245, 91, 22)):
            original = convert("rgb", {"r": r, "g": g, "b": b})
            for model in ("cmyk", "hsv", "hls"):
                restored = source_to_rgb(model, original[model])
                for actual, expected in zip(restored, (r / 255, g / 255, b / 255)):
                    self.assertAlmostEqual(actual, expected, places=8, msg=f"{model}: {(r, g, b)}")

    def test_invalid_values(self):
        with self.assertRaises(ValueError):
            convert("rgb", {"r": 256, "g": 0, "b": 0})
        with self.assertRaisesRegex(ValueError, "целым числом"):
            convert("rgb", {"r": 12.5, "g": 0, "b": 0})
        with self.assertRaises(ValueError):
            convert("hls", {"h": 10, "l": 50, "s": float("nan")})


if __name__ == "__main__":
    unittest.main()
