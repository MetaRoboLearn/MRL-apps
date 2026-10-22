import math

# Saved tasks store enum KEY names (e.g. "BIRD"). This dict maps them to their
# simulation-recognisable type string, matching the values in sticker_whitelist.
enum_key_to_type = {
  # ZOO
  'PERSON': 'person', 'BIRD': 'bird', 'BEAR': 'bear', 'BENCH': 'bench',
  'DONUT': 'donut', 'HORSE': 'horse', 'ZEBRA': 'zebra', 'GIRAFFE': 'giraffe',
  'ELEPHANT': 'elephant', 'DOG': 'dog', 'CAT': 'cat', 'COW': 'cow',
  'SHEEP': 'sheep', 'RESTAURANT_ZOO': 'zoo restaurant', 'CELLPHONE': 'cellphone',
  # Grad
  'HOUSE_RED': 'red house', 'HOUSE_YELLOW': 'yellow house',
  'HOUSE_GREEN': 'green house', 'HOUSE_BLUE': 'blue house',
  'WAREHOUSE': 'warehouse', 'POST_OFFICE': 'post office', 'RESTAURANT': 'restaurant',
  # General
  'TREES': 'trees', 'LAKE': 'lake', 'FOUNTAIN': 'fountain',
}

sticker_whitelist = [
  'person', 'bird', 'bear', 'bench', 'donut', 'horse', 'zebra', 'giraffe', 'elephant', 'dog', 'cat', 'cow', 'sheep', 'zoo restaurant', 'cellphone',
  'red house', 'yellow house', 'green house', 'blue house', 'warehouse', 'post office', 'restaurant', 'trees', 'lake', 'fountain',
  # Svemir pack
  'Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'package', 'astronaut', 'Saturn', 'Uranus', 'Neptune',
  'Sun', 'tools', 'spaceship', 'space station', 'asteroid', 'rocket', 'present',
  # Farma pack
  'carrots', 'peppers', 'pears', 'apples', 'plums', 'strawberries', 'cabbage', 'onions', 'cow', 'house', 'farmer',
]

# Maps pack sticker keys (e.g. "Svemir/Svemir_mapa-11") to their simulation type.
# Pack stickers not listed here are decorative and return "" in the simulation.
pack_sticker_types = {
  # --- Svemir ---
  'Svemir/Svemir_mapa-01': 'Sun',
  'Svemir/Svemir_mapa-05': 'tools',
  'Svemir/Svemir_mapa-08': 'spaceship',
  'Svemir/Svemir_mapa-11': 'Mercury',
  'Svemir/Svemir_mapa-17': 'space station',
  'Svemir/Svemir_mapa-19': 'Venus',
  'Svemir/Svemir_mapa-21': 'asteroid',
  'Svemir/Svemir_mapa-23': 'Earth',
  'Svemir/Svemir_mapa-31': 'Mars',
  'Svemir/Svemir_mapa-34': 'Jupiter',
  'Svemir/Svemir_mapa-36': 'package',
  'Svemir/Svemir_mapa-37': 'astronaut',
  'Svemir/Svemir_mapa-42': 'Saturn',
  'Svemir/Svemir_mapa-47': 'Uranus',
  'Svemir/Svemir_mapa-51': 'asteroid',
  'Svemir/Svemir_mapa-53': 'rocket',
  'Svemir/Svemir_mapa-55': 'Neptune',
  'Svemir/Svemir_mapa-57': 'present',
  # --- ZOO ---
  'ZOO/bird':       'bird',
  'ZOO/bear':       'bear',
  'ZOO/bench':      'bench',
  'ZOO/cat':        'cat',
  'ZOO/cellphone':  'cellphone',
  'ZOO/cow':        'cow',
  'ZOO/dog':        'dog',
  'ZOO/donut':      'donut',
  'ZOO/elephant':   'elephant',
  'ZOO/giraffe':    'giraffe',
  'ZOO/horse':      'horse',
  'ZOO/person':     'person',
  'ZOO/restaurant': 'zoo restaurant',
  'ZOO/sheep':      'sheep',
  'ZOO/zebra':      'zebra',
  # --- Grad ---
  'Grad/house_blue':   'blue house',
  'Grad/house_green':  'green house',
  'Grad/house_red':    'red house',
  'Grad/house_yellow': 'yellow house',
  'Grad/post_office':  'post office',
  'Grad/restoraunt':   'restaurant',
  'Grad/warehouse':    'warehouse',
  # --- Farma ---
  'Farma/mrkva':          'carrots',
  'Farma/mrkva_naziv_mn': 'carrots',
  'Farma/paprike':        'peppers',
  'Farma/paprike_naziv_mn': 'peppers',
  'Farma/kruške':         'pears',
  'Farma/jabuke':         'apples',
  'Farma/sljive':          'plums',
  'Farma/jagode':         'strawberries',
  'Farma/jagode_naziv':    'strawberries',
  'Farma/kupus':          'cabbage',
  'Farma/luk':            'onions',
  'Farma/krave':          'cow',
  'Farma/krave_naziv':    'cow',
  'Farma/kuca':           'house',
  'Farma/farmer':         'farmer',
}

class SimState:
  def __init__(self, grid):
    self.size_x = grid["size_x"]
    self.size_z = grid["size_z"]
    self.finish = grid.get("finish")
    self.barriers = set(grid.get("barriers", []))
    self.stickers = {s["index"]: s["sticker"] for s in grid.get("stickers", [])}

    start = grid.get("start", 0)
    self.x = math.trunc(start / self.size_z)
    self.z = start % self.size_z
    self.direction = grid.get("start_rotation", 0)

  def _delta(self):
    return {
      0: (0, 1),
      90: (1, 0),
      180: (0, -1),
      270: (-1, 0),
    }[self.direction]

  def move_forward(self):
    dx, dz = self._delta()
    nx, nz = self.x + dx, self.z + dz
    if self._is_valid(nx, nz):
      self.x, self.z = nx, nz
      return True
    return False

  def move_backward(self):
    dx, dz = self._delta()
    nx, nz = self.x - dx, self.z - dz
    if self._is_valid(nx, nz):
      self.x, self.z = nx, nz
      return True
    return False

  def rotate_left(self):
    self.direction = (self.direction + 90) % 360

  def rotate_right(self):
    self.direction = (self.direction - 90) % 360

  def get_tile_ahead(self):
    dx, dz = self._delta()
    ahead_x, ahead_z = self.x + dx, self.z + dz
    if not self._in_bounds(ahead_x, ahead_z):
      # return {"type": "out_of_bounds"}
      return ""
    index = ahead_x * self.size_z + ahead_z
    if index in self.barriers:
      return {"type": "barrier"}
    if index in self.stickers:
      sticker = self.stickers[index]
      # Pack sticker key (e.g. "Svemir/Svemir_mapa-11")
      if '/' in str(sticker):
        return pack_sticker_types.get(sticker, "")
      # Enum sticker value (e.g. 'bird') — for forward-compat if format ever changes
      if sticker in sticker_whitelist:
        return sticker
      # Enum sticker key (e.g. 'BIRD') — the format used by TaskSaveButton
      if sticker in enum_key_to_type:
        return enum_key_to_type[sticker]
    # return {"type": "empty"}
    return ""

  def current_index(self):
    return self.x * self.size_z + self.z

  def is_finished(self):
    return self.current_index() == self.finish

  def _in_bounds(self, x, z):
    return 0 <= x < self.size_x and 0 <= z < self.size_z

  def _is_valid(self, x, z):
    if not self._in_bounds(x, z):
      return False
    return (x * self.size_z + z) not in self.barriers