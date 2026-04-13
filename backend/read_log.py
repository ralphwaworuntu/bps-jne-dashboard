with open('e:\\BPS JNE DASHBOARD\\backend\\backend_global_error.log', 'r') as f:
    lines = f.readlines()
    for line in lines[-50:]:
        print(line, end='')
