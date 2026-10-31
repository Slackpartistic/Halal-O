"""Build the halal ingredient reference from the Open Food Facts additives taxonomy
plus hand-reviewed overrides and non-E-number ("hidden") ingredients."""
import csv, json, re, sys

OFF_JSON, OUT_DIR = sys.argv[1], sys.argv[2]
# Date the hand-reviewed rulings were last checked. Bump it when you change OVR or HIDDEN,
# so the monthly Open Food Facts refresh only produces a diff when the taxonomy changes.
REVIEWED = "2026-10-31"

REFS = {
    "off": ("Open Food Facts additives taxonomy (origin / vegan / vegetarian flags)",
            "https://github.com/openfoodfacts/openfoodfacts-server/blob/main/taxonomies/additives.txt"),
    "patel_ecodes": ("Muslim Food Guide E-code list, answered by Mufti Abdullah Patel (Darul Uloom London; chairs Mustakshif's Shariah board)",
                     "https://islamqa.org/hanafi/muftisays/9412/can-you-provide-a-list-of-halal-doubtful-and-haram-e-codes-for-food-ingredients/"),
    "dib_carmine": ("Darul Ifta Birmingham: ruling on carmine / cochineal",
                    "https://islamqa.org/hanafi/daruliftaa-birmingham/244749/what-is-the-ruling-of-carmine-cochineal-insects/"),
    "dib_shellac": ("Darul Ifta Birmingham: is shellac permissible",
                    "https://islamqa.org/hanafi/daruliftaa-birmingham/171701/confused-as-to-whether-or-not-shellac-is-permissible/"),
    "dib_e471": ("Darul Ifta Birmingham: is E471 halal or haram",
                 "https://islamqa.org/hanafi/daruliftaa-birmingham/136408/is-e471-halal-or-haram/"),
    "dib_alcohol": ("Darul Ifta Birmingham: alcohol in flavourings and extracts (khamr vs non-khamr)",
                    "https://daruliftabirmingham.co.uk/does-alcohol-in-food-flavouring-or-extracts-need-to-be-of-a-certain-percentage-to-be-consumable/"),
    "fatwaca_cheese": ("Fatwa.ca: guideline for assessing cheese (rennet)",
                       "https://islamqa.org/hanafi/fatwa-ca/121507/could-you-give-an-easy-to-understand-guideline-for-assessing-suitability-of-cheese/"),
    "cou_whey": ("Council of Ulama: whey in cheese follows the rennet ruling",
                 "https://islamqa.org/hanafi/councilofulama/242308/whey-in-cheese/"),
    "mustakshif": ("Mustakshif: how it works (Halal / Haram / Mushbooh, Shariah board review)",
                   "https://www.mustakshif.com/how-mustakshif-work"),
}

H, X, M = "halal", "haram", "mushbooh"

# Per-origin verdicts under the owner's rules: animal = non-halal unless halal-certified,
# no istihala (transformation) exception.
ORIGIN_VERDICT = {
    "plant": H, "mineral": H, "synthetic": H, "microbial": H,
    "dairy": H, "egg": H, "bee": H, "wool": H, "fish": H,
    "animal_halal_certified": H,
    "animal": X, "pork": X, "insect": X, "human": X, "shellfish": X,
    "khamr": X, "alcohol_non_khamr": X,
}

def base_from_flags(vegan, veg):
    """Map Open Food Facts vegan/vegetarian flags to possible origins + verdict."""
    if vegan == "yes":
        return ["plant", "mineral", "synthetic", "microbial"], H, "high", "Never animal-derived according to Open Food Facts."
    if veg == "yes":
        return ["plant", "synthetic", "dairy", "egg", "bee"], H, "medium", "Can be dairy, egg or bee-derived but never from slaughtered animals or insects."
    if vegan == "maybe":
        return ["plant", "synthetic", "animal"], M, "medium", "Can be plant-based or made from animal fat or tissue; the label rarely says which."
    return None

# Hand-reviewed overrides of E-numbers (keyed by E-code as in OFF).
OVR = {
    "E120": dict(origins=["insect"], verdict=X, conf="high", refs=["dib_carmine", "patel_ecodes"],
                 extra_aliases=["carmine", "cochineal extract", "crimson lake", "natural red 4", "CI 75470"],
                 why="Made from crushed cochineal insects. Hanafi, Shafi'i and Hanbali schools prohibit insects (except locusts).",
                 contested="Some Maliki scholars permit it."),
    "E904": dict(origins=["insect"], verdict=X, conf="medium", refs=["dib_shellac", "patel_ecodes"],
                 extra_aliases=["confectioner's glaze", "confectioners glaze", "lac resin", "glazing agent (shellac)"],
                 why="Resin secreted by the lac insect. Darul Ifta Birmingham rules it impermissible to eat.",
                 contested="Mufti Abdullah Patel's list marks it 'under investigation'; some scholars treat it like honey (an insect secretion) and permit it."),
    "E428": dict(origins=["pork", "animal", "fish", "animal_halal_certified"], verdict=X, conf="high", refs=["patel_ecodes"],
                 extra_aliases=["pork gelatin", "beef gelatin", "bovine gelatin", "porcine gelatin", "gelatine (pork)", "gelatine (beef)"],
                 why="Almost always from pig or non-zabiha cattle skin/bones. Halal only if fish gelatin or halal-certified bovine."),
    "E441": dict(why="Hydrogenated rapeseed oil (plant). Note: older lists use E441 for gelatine, which is now E428."),
    "E542": dict(origins=["animal"], verdict=X, conf="high", refs=["off"], why="Made from animal bones."),
    "E1000": dict(origins=["animal"], verdict=X, conf="high", refs=["off"], why="Extracted from ox bile; non-zabiha animal source and no istihala exception."),
    "E626": dict(origins=["animal", "fish", "microbial"], verdict=M, conf="medium", refs=["off", "patel_ecodes"], why="Flavour enhancer; made by fermentation or from meat/fish."),
    "E630": dict(origins=["animal", "fish", "microbial"], verdict=M, conf="medium", refs=["off", "patel_ecodes"], why="Flavour enhancer; made by fermentation or from meat/fish."),
    "E632": dict(origins=["animal", "fish", "microbial"], verdict=M, conf="medium", refs=["off", "patel_ecodes"], why="Flavour enhancer; made by fermentation or from meat/fish."),
    "E633": dict(origins=["animal", "fish", "microbial"], verdict=M, conf="medium", refs=["off", "patel_ecodes"], why="Flavour enhancer; made by fermentation or from meat/fish."),
    "E634": dict(origins=["animal", "fish", "microbial"], verdict=M, conf="medium", refs=["off", "patel_ecodes"], why="Flavour enhancer; made by fermentation or from meat/fish."),
    "E910": dict(origins=["animal", "plant", "wool"], verdict=M, conf="medium", refs=["off"], why="Wax esters can come from animal fats or plants."),
    "E963": dict(origins=["dairy", "plant"], verdict=H, conf="medium", refs=["off"],
                 why="Low-calorie sugar made from lactose or plant sugars. Owner ruled Halal (31 Oct), like lactose.",
                 contested="Lactose is usually extracted from cheese whey; owner treats lactose and its derivatives as Halal."),
    "E170(I)": dict(origins=["mineral"], verdict=H, conf="medium", refs=["off", "patel_ecodes"],
                    why="Calcium carbonate is mined chalk/limestone in food use (e.g. UK flour fortification). Not on Mufti Abdullah Patel's exception list."),
    "E913": dict(why="Grease from the wool of live sheep; wool is pure in Hanafi fiqh."),
    "E322": dict(origins=["plant", "egg"], verdict=H, conf="medium", refs=["off", "patel_ecodes"],
                 why="Lecithin is made from soya, sunflower or egg yolk, all halal. Not on Mufti Abdullah Patel's exception list."),
    "E375": dict(origins=["synthetic", "animal"], verdict=H, conf="medium", refs=["off", "patel_ecodes"],
                 why="Niacin is produced synthetically for food use. Not on Mufti Abdullah Patel's exception list."),
    "E476": dict(origins=["plant", "animal"], verdict=M, conf="medium", refs=["patel_ecodes"],
                 why="Castor oil esterified with polyglycerol; the glycerol may be animal-derived. Listed as an exception by Mufti Abdullah Patel."),
    "E1510": dict(origins=["alcohol_non_khamr", "khamr"], verdict=X, conf="high", refs=["dib_alcohol"], alcohol=True,
                  extra_aliases=["alcohol", "ethyl alcohol", "spirit"],
                  why="Ethanol. Wine/date-derived alcohol (khamr) is haram in any amount; Hanafi scholars differ on non-khamr (e.g. synthetic or grain) alcohol in non-intoxicating amounts.",
                  contested="Owner ruled Haram (31 Oct). Darul Ifta Birmingham permits non-khamr alcohol in non-intoxicating amounts."),
    "E920": dict(origins=["human", "animal", "microbial", "synthetic"], verdict=M, conf="medium", refs=["off", "patel_ecodes"],
                 why="L-cysteine can come from human hair, duck/hen feathers, or fermentation. Haram if from human hair."),
    "E921": dict(origins=["human", "animal", "microbial", "synthetic"], verdict=M, conf="medium", refs=["off", "patel_ecodes"],
                 why="L-cysteine can come from human hair, duck/hen feathers, or fermentation. Haram if from human hair."),
}
# Synthetic additives Open Food Facts hasn't flagged.
SYNTHETIC_UNFLAGGED = {"E246", "E586", "E960b", "E960c", "E960d", "E969", "E1206", "E1207", "E1208", "E1209", "E1210"}

# Non-E-number ingredients that commonly hide non-halal content.
def hidden(name, aliases, origins, verdict, conf, why, refs=(), contested=None, alcohol=False, category="ingredient"):
    return dict(name=name, aliases=aliases, origins=origins, verdict=verdict, conf=conf, why=why,
                refs=list(refs), contested=contested, alcohol=alcohol, category=category)

ALC_CONT = "Darul Ifta Birmingham permits non-khamr alcohol in non-intoxicating amounts; the stricter view (owner's default) avoids it."
VINEGAR_CONT = "Owner's rule rejects transformation (istihala), but Hanafi fiqh widely accepts wine that has turned into vinegar as pure. Owner ruled Mushbooh (31 Oct)."
HIDDEN = [
    # pork and meat
    hidden("pork", ["pork", "pig", "swine", "porcine", "pork fat", "pork rind", "crackling"], ["pork"], X, "high", "Pig and all pig products are haram.", category="meat"),
    hidden("lard", ["lard", "saindoux", "schmalz", "manteca de cerdo", "strutto"], ["pork"], X, "high", "Rendered pig fat.", category="fat"),
    hidden("bacon / ham", ["bacon", "ham", "gammon", "pancetta", "prosciutto", "speck", "lardons", "jamón"], ["pork"], X, "high", "Pork products.", category="meat"),
    hidden("pork-based sausage meats", ["chorizo", "salami", "pepperoni", "mortadella", "nduja"], ["pork", "animal_halal_certified"], X, "medium",
           "Traditionally pork; halal only when the product is halal-certified (halal versions exist).", category="meat"),
    hidden("meat (non-halal)", ["beef", "chicken", "lamb", "mutton", "turkey", "duck", "veal", "goat", "meat"], ["animal", "animal_halal_certified"], X, "high",
           "Meat from animals not slaughtered Islamically is haram in Hanafi fiqh; halal only with a halal certification.", category="meat"),
    hidden("meat stock / extract", ["beef stock", "chicken stock", "beef extract", "chicken extract", "meat extract", "bone broth", "chicken fat", "chicken powder", "beef powder", "bouillon (meat)"],
           ["animal", "animal_halal_certified"], X, "high", "Made from non-halal-slaughtered animals unless certified.", category="meat"),
    hidden("animal fat", ["animal fat", "tallow", "beef fat", "suet", "dripping", "animal shortening", "mutton fat"], ["animal", "pork", "animal_halal_certified"], X, "high",
           "Rendered fat from non-zabiha animals; no istihala exception.", category="fat"),
    hidden("blood", ["blood", "blood plasma", "black pudding", "blood sausage", "plasma protein"], ["animal"], X, "high", "Blood is haram (Qur'an 5:3).", category="meat"),
    hidden("bone / bone char", ["bone", "bone meal", "bone char", "bone phosphate"], ["animal"], X, "high", "From non-zabiha animal bones.", category="animal"),
    hidden("collagen", ["collagen", "hydrolysed collagen", "collagen peptides", "collagen casing"], ["pork", "animal", "fish", "animal_halal_certified"], M, "medium",
           "From pig, cattle or fish skin/bones. Halal only if marine or halal-certified.", category="animal"),
    hidden("fish gelatin", ["fish gelatin", "fish gelatine", "marine gelatin"], ["fish"], H, "high", "Fish are halal, so fish gelatin is halal.", category="gelling agent"),
    # enzymes, cheese, dairy by-products
    hidden("animal rennet", ["animal rennet", "calf rennet", "rennet (animal)", "chymosin (animal)", "lab-ferment"], ["animal", "pork", "animal_halal_certified"], X, "high",
           "Owner's rule: animal rennet is non-halal unless the pack has a halal stamp (follows the Saahibayn / cautious Hanafi view).",
           refs=["fatwaca_cheese", "cou_whey"], contested="Imam Abu Hanifah held rennet from non-zabiha cattle permissible; some fatwas allow such cheese while recommending abstention.", category="enzyme"),
    hidden("rennet (unspecified)", ["rennet", "rennin", "chymosin", "coagulant", "présure"], ["animal", "microbial", "animal_halal_certified"], X, "medium",
           "Owner's rule (31 Oct): rennet is Haram unless the label says microbial/vegetable or the pack has a halal stamp.", refs=["fatwaca_cheese"], category="enzyme"),
    hidden("microbial / vegetable rennet", ["microbial rennet", "vegetable rennet", "non-animal rennet", "fermentation-produced chymosin", "vegetarian rennet"], ["microbial", "plant"], H, "high",
           "Non-animal coagulant.", refs=["fatwaca_cheese"], category="enzyme"),
    hidden("pepsin", ["pepsin"], ["pork", "animal"], X, "high", "Digestive enzyme usually taken from pig stomachs.", category="enzyme"),
    hidden("enzymes (unspecified)", ["enzymes", "enzyme", "lipase (animal)", "pancreatin", "trypsin"], ["animal", "pork", "microbial", "plant"], M, "medium",
           "Enzymes can be animal (including pork), microbial or plant-derived.", category="enzyme"),
    hidden("microbial enzymes", ["microbial enzymes", "non-animal enzymes", "fungal enzymes", "bacterial enzymes"], ["microbial"], H, "high", "Non-animal enzymes.", category="enzyme"),
    hidden("cheese", ["cheese", "parmesan", "parmigiano reggiano", "grana padano", "pecorino", "gruyère", "emmental", "cheddar", "mozzarella", "cheese powder"],
           ["dairy", "animal", "microbial"], X, "medium", "Haram unless made with microbial/vegetable rennet or halal-certified (owner's rule, 31 Oct). Parmesan, Grana Padano and Pecorino are always made with animal rennet.",
           refs=["fatwaca_cheese"], contested="See 'animal rennet'.", category="dairy"),
    hidden("whey", ["whey", "whey powder", "whey protein", "whey permeate", "sweet whey", "lactoserum", "molkenpulver"], ["dairy", "animal", "microbial"], X, "medium",
           "By-product of cheese-making; follows the ruling of the rennet. Owner's rule (31 Oct): Haram unless the rennet is microbial/vegetable or the pack is halal-stamped.", refs=["cou_whey"],
           contested="Owner ruled Haram (31 Oct). Many Hanafi fatwas permit whey under Imam Abu Hanifah's view.", category="dairy"),
    hidden("dairy (no rennet)", ["milk", "milk powder", "skimmed milk powder", "cream", "butter", "ghee", "yoghurt", "yogurt", "lactose", "milk protein", "buttermilk", "casein", "caseinate", "sodium caseinate"],
           ["dairy"], H, "medium", "Milk and its products made without rennet are halal. (Rennet casein is rare.)", category="dairy"),
    hidden("egg", ["egg", "egg white", "egg yolk", "egg powder", "albumen", "ovalbumin"], ["egg"], H, "high", "Eggs are halal.", category="egg"),
    hidden("honey / bee products", ["honey", "royal jelly", "propolis", "beeswax"], ["bee"], H, "high", "Bee products are explicitly halal.", category="bee"),
    # insects and seafood
    hidden("insects", ["insect protein", "cricket flour", "cricket powder", "mealworm", "insect flour", "acheta domesticus", "tenebrio molitor"], ["insect"], X, "high",
           "Hanafi fiqh prohibits insects except locusts.", refs=["dib_carmine"], category="insect"),
    hidden("fish", ["fish", "fish oil", "anchovy", "anchovies", "tuna", "salmon", "cod", "sardine", "fish sauce", "isinglass", "omega-3 (fish)"], ["fish"], H, "high",
           "All fish are halal in Hanafi fiqh. (Check fish sauce for added alcohol.)", category="seafood"),
    hidden("shrimp / prawn", ["shrimp", "prawn", "prawns", "shrimp paste"], ["fish"], H, "medium",
           "Owner ruled Halal (31 Oct): prawns are treated as fish, following Hanafi scholars such as Mufti Taqi Usmani.", contested="Some Hanafi scholars call prawns makruh; owner follows the permissive view.", category="seafood"),
    hidden("shellfish / other seafood", ["crab", "lobster", "mussel", "mussels", "oyster", "oysters", "clam", "clams", "scallop", "scallops", "squid", "calamari", "octopus", "crayfish", "oyster sauce"],
           ["shellfish"], X, "high", "Hanafi fiqh permits only fish from the sea.", contested="Shafi'i, Maliki and Hanbali schools permit them.", category="seafood"),
    # alcohol
    hidden("alcoholic drinks (khamr)", ["wine", "red wine", "white wine", "beer", "ale", "lager", "stout", "rum", "brandy", "cognac", "whisky", "whiskey", "vodka", "gin", "sherry", "port", "liqueur", "cider", "sake", "mirin", "cooking wine", "marsala", "champagne", "kirsch", "amaretto", "baileys", "rice wine"],
           ["khamr"], X, "high", "Intoxicating drinks are haram in any amount.", refs=["dib_alcohol"], alcohol=True, category="alcohol"),
    hidden("alcohol-based extracts", ["vanilla extract", "natural vanilla extract", "almond extract", "extract (alcohol)", "tincture"], ["alcohol_non_khamr", "plant"], X, "high",
           "Extracts are usually made with ethanol. Owner ruled Haram (31 Oct); buy alcohol-free versions.", refs=["dib_alcohol"], contested=ALC_CONT, alcohol=True, category="alcohol"),
    hidden("flavourings", ["flavouring", "flavourings", "flavoring", "flavorings", "natural flavouring", "natural flavourings", "natural flavor", "natural flavors", "natural flavour", "artificial flavouring", "aroma", "arôme", "aroma naturale"],
           ["plant", "synthetic", "animal", "alcohol_non_khamr"], M, "low",
           "Flavourings may use an alcohol carrier or contain animal-derived parts, and labels don't say which.", refs=["dib_alcohol"], contested=ALC_CONT, alcohol=True, category="flavouring"),
    hidden("smoke flavouring", ["smoke flavouring", "smoke flavour", "liquid smoke"], ["plant"], H, "medium", "Made from burning wood.", category="flavouring"),
    hidden("vinegar from alcohol", ["wine vinegar", "red wine vinegar", "white wine vinegar", "balsamic vinegar", "sherry vinegar", "cider vinegar", "apple cider vinegar", "malt vinegar", "rice wine vinegar"],
           ["khamr"], M, "medium", "Made by fermenting an alcoholic drink into vinegar.", contested=VINEGAR_CONT, alcohol=True, category="condiment"),
    hidden("vinegar (spirit / plain)", ["vinegar", "spirit vinegar", "distilled vinegar", "white vinegar", "acetic acid"], ["synthetic", "plant"], H, "medium",
           "Vinegar is halal; spirit vinegar comes from grain or synthetic alcohol that has fully turned into acetic acid.", contested=VINEGAR_CONT, category="condiment"),
    # catch-all labels
    hidden("emulsifier (unspecified)", ["emulsifier", "emulsifiers", "emulsifying agent"], ["plant", "animal"], M, "medium",
           "Emulsifiers such as E471 can be animal-derived; the label doesn't say which.", refs=["dib_e471"], category="additive"),
    hidden("glycerides / fatty acids (named)", ["mono and diglycerides", "monoglycerides", "diglycerides", "stearic acid", "stearate", "magnesium stearate", "calcium stearate", "palmitic acid"],
           ["plant", "animal"], M, "medium", "Can be made from plant oils or animal fat.", refs=["dib_e471", "patel_ecodes"], category="additive"),
    hidden("vitamin D3", ["vitamin d3", "cholecalciferol"], ["wool", "fish", "plant"], M, "low",
           "Usually from lanolin (wool) or fish, which are fine, but often coated with gelatin.", category="vitamin"),
    hidden("vegetable shortening / oils", ["vegetable oil", "vegetable fat", "sunflower oil", "rapeseed oil", "palm oil", "coconut oil", "olive oil", "vegetable shortening", "margarine"],
           ["plant"], H, "high", "Plant-based fats.", category="fat"),
]


def norm_code(code):
    return code.replace(" ", "")


def main():
    off = json.load(open(OFF_JSON, encoding="utf-8"))
    by_code = {norm_code(x["names_en"][0]).upper(): x for x in off}
    entries, contested = [], []

    for x in off:
        code = norm_code(x["names_en"][0])
        key = code.upper()
        p = x["props"]
        vegan, veg = p.get("vegan"), p.get("vegetarian")
        basis = "open_food_facts_flags"
        if vegan is None:
            # Sub-entries such as E331(i) inherit from their parent E331.
            parent = re.sub(r"\(.*\)$", "", key)
            pp = by_code.get(parent, {}).get("props", {}) if parent != key else {}
            if not pp.get("vegan") and len(parent) > 2 and parent[-1].isalpha():
                pp = by_code.get(parent[:-1], {}).get("props", {})
            vegan, veg = pp.get("vegan"), pp.get("vegetarian")
            basis = "inherited_from_parent"
        if vegan is None and code in SYNTHETIC_UNFLAGGED:
            vegan, veg, basis = "yes", "yes", "manual"
        res = base_from_flags(vegan, veg)
        o = OVR.get(code.upper()) or OVR.get(code) or {}
        if res is None and "verdict" not in o:
            origins, verdict, conf, why = ["unknown"], M, "low", "Origin not recorded; needs review."
        elif res is None:
            origins, verdict, conf, why = [], M, "low", ""
        else:
            origins, verdict, conf, why = res
        refs = ["off"]
        if o:
            basis = "manual_review" if "verdict" in o else basis
            origins = o.get("origins", origins)
            verdict = o.get("verdict", verdict)
            conf = o.get("conf", conf)
            why = o.get("why", why)
            refs = o.get("refs", refs)
        # Parent overrides apply to sub-entries (E120 -> E120(i) etc.)
        parent = re.sub(r"\(.*\)$", "", code)
        if parent != code and parent in OVR and "verdict" in OVR[parent] and not o:
            po = OVR[parent]
            origins, verdict, conf, why, refs = po["origins"], po["verdict"], po["conf"], po["why"], po["refs"]
            o, basis = po, "manual_review"
        if "animal" in origins and "animal_halal_certified" not in origins:
            origins = origins + ["animal_halal_certified"]
        if verdict == M and refs == ["off"]:
            refs = ["off", "patel_ecodes", "dib_e471"] if code.startswith(("E47", "E48", "E49", "E43", "E57")) else ["off", "patel_ecodes"]
        aliases = {"en": x["names_en"] + o.get("extra_aliases", [])}
        for lang, names in x["names"].items():
            if lang not in ("en", "xx"):
                aliases[lang] = names
        e = dict(
            id=code.lower().replace("(", "_").replace(")", ""),
            e_number=code,
            name=x["names_en"][1] if len(x["names_en"]) > 1 else code,
            aliases=aliases,
            category=[c.replace("en:", "") for c in p.get("additives_classes", "").split(", ") if c],
            possible_origins=origins,
            verdict_by_origin={k: ORIGIN_VERDICT[k] for k in origins if k in ORIGIN_VERDICT},
            default_verdict=verdict,
            alcohol_related=bool(o.get("alcohol")),
            vegan_label_upgrades=(verdict == M and not o.get("alcohol") and "insect" not in origins and "human" not in origins),
            madhab="hanafi",
            rationale=why,
            contested=o.get("contested"),
            confidence=conf,
            basis=basis,
            references=refs,
            last_reviewed=REVIEWED,
        )
        entries.append(e)
        if e["contested"] and parent == code:
            contested.append(e)

    for h in HIDDEN:
        e = dict(
            id=re.sub(r"[^a-z0-9]+", "_", h["name"].lower()).strip("_"),
            e_number=None,
            name=h["name"],
            aliases={"en": h["aliases"]},
            category=[h["category"]],
            possible_origins=h["origins"],
            verdict_by_origin={k: ORIGIN_VERDICT[k] for k in h["origins"] + (["animal_halal_certified"] if "animal" in h["origins"] and "animal_halal_certified" not in h["origins"] else [])},
            default_verdict=h["verdict"],
            alcohol_related=h["alcohol"],
            vegan_label_upgrades=(h["verdict"] == M and not h["alcohol"] and not {"insect", "human", "shellfish"} & set(h["origins"])),
            madhab="hanafi",
            rationale=h["why"],
            contested=h["contested"],
            confidence=h["conf"],
            basis="manual_review",
            references=h["refs"],
            last_reviewed=REVIEWED,
        )
        entries.append(e)
        if e["contested"]:
            contested.append(e)

    data = dict(
        schema_version=1,
        generated=REVIEWED,
        madhab_default="hanafi",
        verdicts=[H, X, M],
        rules=[
            "A halal certification on the product overrides every ingredient verdict.",
            "Any haram ingredient makes the product haram.",
            "Otherwise any mushbooh ingredient makes the product mushbooh.",
            "A 'vegan' label upgrades mushbooh ingredients whose vegan_label_upgrades is true to halal. It never upgrades alcohol-related ones.",
            "A 'vegetarian' label upgrades nothing.",
            "Animal-derived ingredients are haram unless halal-certified; chemical transformation (istihala) does not make them halal.",
            "An ingredient whose origin is unknown is mushbooh.",
        ],
        references={k: dict(title=t, url=u, accessed=REVIEWED) for k, (t, u) in REFS.items()},
        entries=entries,
    )
    json.dump(data, open(f"{OUT_DIR}/ingredients.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    with open(f"{OUT_DIR}/ingredients.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["id", "e_number", "name", "default_verdict", "possible_origins", "alcohol_related", "vegan_label_upgrades",
                    "confidence", "contested", "rationale", "english_aliases", "references"])
        for e in entries:
            w.writerow([e["id"], e["e_number"] or "", e["name"], e["default_verdict"], ";".join(e["possible_origins"]),
                        e["alcohol_related"], e["vegan_label_upgrades"], e["confidence"], e["contested"] or "", e["rationale"],
                        ";".join(e["aliases"]["en"]), ";".join(REFS[r][1] for r in e["references"])])


    from collections import Counter
    print(len(entries), Counter(e["default_verdict"] for e in entries), Counter(e["basis"] for e in entries), len(contested))


main()
