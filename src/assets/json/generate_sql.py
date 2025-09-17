import json
import os

# ---- CONFIG ----
INPUT_FILE = "products.json"   # must be in same folder as this script
OUTPUT_FILE = "insert_all.sql" # single SQL output file

# ---- LOAD DATA ----
with open(INPUT_FILE, "r", encoding="utf-8") as f:
    products = json.load(f)

def esc(text: str) -> str:
    """Escape single quotes for SQL"""
    return text.replace("'", "''")

# ---- SQL COLLECTIONS ----
insert_products = []
insert_images = []
insert_descriptions = []
insert_variants = []
insert_variant_options = []

# ---- ID counters for unique PKs ----
variant_id_counter = 1
option_id_counter = 1

# ---- GENERATE SQL ----
for p in products:
    pid = p["id"]

    # products
    labels = "{" + ",".join([f'"{l}"' for l in p.get("labels", [])]) + "}"
    insert_products.append(
        f"({pid}, '{esc(p['name'])}', {str(p.get('ispublished', True)).lower()}, "
        f"'{p.get('category', '')}', '{labels}', {p['price']}, NULL, NULL)"
    )

    # productimages
    for img in p.get("imageUrls", []):
        insert_images.append(f"(DEFAULT, {pid}, '{esc(img)}')")

    # productdescriptions
    for d in p.get("productdescriptions", []):
        insert_descriptions.append(
            f"(DEFAULT, {pid}, '{esc(d['title'])}', '{esc(d['content'])}')"
        )

    # productvariants
    for v in p.get("productvariants", []):
        vname = esc(v["name"])
        vid = variant_id_counter
        insert_variants.append(
            f"({vid}, {pid}, '{vname}', {str(v.get('ispublished', True)).lower()})"
        )
        variant_id_counter += 1

        # productvariantoptions
        for o in v.get("productvariantoptions", []):
            oname = esc(o["name"])
            oid = option_id_counter
            insert_variant_options.append(
                f"({oid}, {vid}, '{oname}', {o['price']}, "
                f"{str(o.get('ispublished', True)).lower()}, "
                f"{str(o.get('isoutofstock', False)).lower()}, "
                f"{str(o.get('isdefault', False)).lower()})"
            )
            option_id_counter += 1

# ---- COMBINE INTO ONE FILE ----
sql_output = """
-- Clean up existing data
TRUNCATE TABLE productvariantoptions RESTART IDENTITY CASCADE;
TRUNCATE TABLE productvariants RESTART IDENTITY CASCADE;
TRUNCATE TABLE productdescriptions RESTART IDENTITY CASCADE;
TRUNCATE TABLE productimages RESTART IDENTITY CASCADE;
TRUNCATE TABLE products RESTART IDENTITY CASCADE;

"""

sql_output += "INSERT INTO products (id, name, ispublished, category, labels, price, discount, tax) VALUES\n" + ",\n".join(insert_products) + ";\n\n"

sql_output += "INSERT INTO productimages (id, productid, url) VALUES\n" + ",\n".join(insert_images) + ";\n\n"

sql_output += "INSERT INTO productdescriptions (id, productid, title, content) VALUES\n" + ",\n".join(insert_descriptions) + ";\n\n"

sql_output += "INSERT INTO productvariants (id, productid, name, ispublished) VALUES\n" + ",\n".join(insert_variants) + ";\n\n"

sql_output += "INSERT INTO productvariantoptions (id, variantid, name, price, ispublished, isoutofstock, isdefault) VALUES\n" + ",\n".join(insert_variant_options) + ";\n\n"

# ---- SAVE TO ONE FILE ----
with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    f.write(sql_output)

print(f"✅ All data written to {OUTPUT_FILE}")
