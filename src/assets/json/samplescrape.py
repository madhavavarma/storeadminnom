import requests
from bs4 import BeautifulSoup

url = 'https://vegetablemarketprice.com/market/andhrapradesh/today'
print(f"Fetching data from: {url}")

response = requests.get(url)
response.raise_for_status()
soup = BeautifulSoup(response.text, 'html.parser')

print(f"Page Title: {soup.title.string}")

table = soup.find('table')
if not table:
    print("No table found on the page. The data might be loaded dynamically via JavaScript.")
    exit()

rows = table.find_all('tr')
print(f"Number of rows found in table (including header): {len(rows)}")

vegetables = []

for i, row in enumerate(rows[1:], start=2):  # Starting from row 2 (skip header)
    columns = row.find_all(['td', 'th'])  # include th in case some rows use th for data
    print(f"Row {i} has {len(columns)} columns")
    
    # Adjust based on observed number of columns; trying 4 or 5
    if len(columns) >= 4:
        name = columns[0].get_text(strip=True)
        wholesale_price = columns[1].get_text(strip=True)
        retail_price = columns[2].get_text(strip=True)
        shopping_mall_price = columns[3].get_text(strip=True)
        units = columns[4].get_text(strip=True) if len(columns) > 4 else ''

        vegetables.append({
            'name': name,
            'wholesale_price': wholesale_price,
            'retail_price': retail_price,
            'shopping_mall_price': shopping_mall_price,
            'units': units
        })

print(f"\nExtracted {len(vegetables)} vegetables:\n")
for veg in vegetables:
    print(veg)
