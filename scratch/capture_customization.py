import os
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
    driver.get('https://192.168.1.23/')
    time.sleep(2)
    print('Login Page URL:', driver.current_url)

    # 1. Login screenshot
    login_shot = r'C:\Users\azamb\Desktop\Custom Customization Test\01_cyber_glass_login.png'
    driver.save_screenshot(login_shot)
    print('Saved login screenshot to:', login_shot)

    # Find credentials inputs
    user_elem = driver.find_element(By.CSS_SELECTOR, 'input[name="username"], input#username, input[type="text"]')
    pass_elem = driver.find_element(By.CSS_SELECTOR, 'input[name="password"], input#password, input[type="password"]')
    user_elem.clear()
    user_elem.send_keys('admin')
    pass_elem.clear()
    pass_elem.send_keys('pnet')

    submit_btn = driver.find_element(By.CSS_SELECTOR, 'button[type="submit"], input[type="submit"], .btn-primary')
    submit_btn.click()
    time.sleep(4)

    print('Dashboard URL:', driver.current_url)
    print('Dashboard Title:', driver.title)

    # 2. OLED Dark theme dashboard
    dash_shot = r'C:\Users\azamb\Desktop\Custom Customization Test\02_oled_dark_theme.png'
    driver.save_screenshot(dash_shot)
    print('Saved dashboard screenshot to:', dash_shot)

    # 3. Sliding keepalive / System Settings
    driver.get('https://192.168.1.23/#/system')
    time.sleep(3)
    sys_shot = r'C:\Users\azamb\Desktop\Custom Customization Test\03_sliding_keepalive.png'
    driver.save_screenshot(sys_shot)
    print('Saved system settings / theme engine screenshot to:', sys_shot)

    # 4. Open Network settings to verify pnet0 is clean
    driver.get('https://192.168.1.23/#/network')
    time.sleep(3)
    net_shot = r'C:\Users\azamb\Desktop\Custom Customization Test\05_network_pnet0_clean.png'
    driver.save_screenshot(net_shot)
    print('Saved network pnet0 clean screenshot to:', net_shot)

finally:
    driver.quit()

