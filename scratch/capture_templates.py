import time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By

opts = Options()
opts.add_argument('--headless=new')
opts.add_argument('--ignore-certificate-errors')
opts.add_argument('--no-sandbox')
opts.add_argument('--window-size=1920,1080')

driver = webdriver.Chrome(options=opts)
try:
    # 1. Login
    driver.get('https://192.168.1.23/')
    time.sleep(2)
    user_elem = driver.find_element(By.CSS_SELECTOR, 'input[name="username"], input#username, input[type="text"]')
    pass_elem = driver.find_element(By.CSS_SELECTOR, 'input[name="password"], input#password, input[type="password"]')
    user_elem.clear()
    user_elem.send_keys('admin')
    pass_elem.clear()
    pass_elem.send_keys('pnet')
    driver.find_element(By.CSS_SELECTOR, 'button[type="submit"], input[type="submit"], .btn-primary').click()
    time.sleep(3)

    # 2. Navigate to System -> Nodes / Images
    driver.get('https://192.168.1.23/main/#/devices')
    time.sleep(3)
    tmpl_shot = r'C:\Users\azamb\Desktop\Custom Customization Test\04_templates_ai_builder.png'
    driver.save_screenshot(tmpl_shot)
    print('Saved Templates / Device definitions screenshot to:', tmpl_shot)

finally:
    driver.quit()

