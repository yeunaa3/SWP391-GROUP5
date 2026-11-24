import urllib.request
import json
import http.cookiejar

passwords = ['Demo@12345', 'swp391group5thepluse', 'Password123@']
accounts = ['admin.demo', 'manager.demo', 'business.demo', 'reader.demo']

for acc in accounts:
    matched = False
    for pwd in passwords:
        cj = http.cookiejar.CookieJar()
        opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
        try:
            req_csrf = urllib.request.Request('http://localhost:8080/api/auth/csrf')
            with opener.open(req_csrf) as resp:
                csrf_data = json.loads(resp.read().decode('utf-8'))
                csrf_token = csrf_data.get('token')
            
            payload = json.dumps({'login': acc, 'password': pwd}).encode('utf-8')
            req_login = urllib.request.Request('http://localhost:8080/api/auth/login', data=payload, headers={
                'Content-Type': 'application/json',
                'X-XSRF-TOKEN': csrf_token
            })
            with opener.open(req_login) as resp_login:
                user_info = json.loads(resp_login.read().decode('utf-8'))
                print(f"SUCCESS login {acc} with password '{pwd}'! User: {user_info.get('username')}, Roles: {user_info.get('roles')}")
                matched = True
                break
        except urllib.error.HTTPError as e:
            pass
        except Exception as e:
            pass
    if not matched:
        print(f"FAILED to find password for {acc}")
