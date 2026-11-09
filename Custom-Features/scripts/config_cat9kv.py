#!/usr/bin/env python3

# scripts/config_csr1000v.py
#
# Import/Export script for vIOS.
#
# @author Andrea Dainese <andrea.dainese@gmail.com>
# @author Alain Degreffe <eczema@ecze.com>
# @copyright 2014-2016 Andrea Dainese
# @copyright 2017-2018 Alain Degreffe
# @license BSD-3-Clause https://github.com/dainok/unetlab/blob/master/LICENSE
# @link http://www.eve-ng.net/
# @version 20181203

import getopt, multiprocessing, os, pexpect, re, sys, time

username = 'cisco'
password = 'cisco'
secret = 'cisco'
conntimeout = 3     # Maximum time for console connection
expctimeout = 3     # Maximum time for each short expect
longtimeout = 30    # Maximum time for each long expect
timeout = 60        # Maximum run time (conntimeout is included)

LAB_PASSWORDS = ['cisco', 'admin', 'pnet', 'eve', 'Eve1234567', '']
LAB_USERS = ['cisco', 'admin', 'root']

def node_login(handler):
    start_time = time.time()
    max_login_sec = 25
    logged_in = False

    # Send an initial newline to wake the console
    handler.sendline('\r\n')

    while time.time() - start_time < max_login_sec:
        try:
            idx = handler.expect([
                'Username:',
                'Password:',
                r'\(config[^\)]*\)#',
                '--More--',
                '>',
                '#',
                'Would you like to enter the',
                'Press RETURN to get started',
                'Enter enable secret:',
                'without saving this config'
            ], timeout=3)
        except Exception:
            handler.sendline('\r\n')
            continue

        if idx == 0:
            # Username prompt (AAA login or local user)
            success = False
            for user in LAB_USERS:
                handler.sendline(user)
                try:
                    p_idx = handler.expect(['Password:', 'Username:'], timeout=2)
                    if p_idx == 0:
                        for pwd in LAB_PASSWORDS:
                            handler.sendline(pwd)
                            try:
                                r_idx = handler.expect(['>', '#', 'Password:', 'Username:', 'Login invalid'], timeout=2)
                                if r_idx in (0, 1):
                                    success = True
                                    if r_idx == 0:
                                        handler.sendline('enable')
                                    break
                            except Exception:
                                pass
                    if success:
                        break
                except Exception:
                    pass
            if not success:
                print('ERROR: Console password is not a lab default.')
                node_quit(handler)
                return False

        elif idx == 1:
            # Direct console password prompt without username
            success = False
            for pwd in LAB_PASSWORDS:
                handler.sendline(pwd)
                try:
                    r_idx = handler.expect(['>', '#', 'Password:', 'Username:', 'Login invalid'], timeout=2)
                    if r_idx in (0, 1):
                        success = True
                        if r_idx == 0:
                            handler.sendline('enable')
                        break
                except Exception:
                    pass
            if not success:
                print('ERROR: Console password is not a lab default.')
                node_quit(handler)
                return False

        elif idx == 2:
            # In config mode: exit back to privileged exec
            handler.sendline('end\r\n')
            time.sleep(0.5)

        elif idx == 3:
            # Stuck at open pager: break out
            handler.send('\x03')
            time.sleep(0.3)
            handler.sendline('\r\n')

        elif idx == 4:
            # Unprivileged exec mode ('>'), escalate to enable
            handler.sendline('enable')
            try:
                e_idx = handler.expect(['Password:', '#'], timeout=expctimeout)
                if e_idx == 0:
                    pw_ok = False
                    for sec in LAB_PASSWORDS:
                        handler.sendline(sec)
                        try:
                            res = handler.expect(['#', 'Password:'], timeout=2)
                            if res == 0:
                                pw_ok = True
                                break
                        except Exception:
                            pass
                    if not pw_ok:
                        print('ERROR: Enable secret is not a lab default.')
                        node_quit(handler)
                        return False
            except Exception:
                pass

        elif idx == 5:
            # Privileged exec mode ('#') reached
            logged_in = True
            break

        elif idx == 6:
            # First boot setup dialog detected: bypass without configuring secret
            handler.sendline('no\r\n')
            try:
                handler.expect(['Press RETURN to get started', 'Enter enable secret:', 'without saving this config'], timeout=longtimeout)
            except Exception:
                pass
            handler.send('\x03')
            handler.sendline('\r\n')

        elif idx == 7:
            # Press RETURN to get started
            handler.sendline('\r\n')

        elif idx == 8:
            # Setup asking for enable secret: abort setup to prevent setting a secret
            handler.send('\x03')
            time.sleep(0.5)
            handler.sendline('\r\n')

        elif idx == 9:
            # "without saving this config"
            handler.sendline('0\r\n')

    if logged_in:
        return True

    # Check if we can get prompt '#' now
    handler.sendline('\r\n')
    try:
        handler.expect('#', timeout=2)
        return True
    except Exception:
        print('ERROR: Could not reach privileged exec prompt.')
        node_quit(handler)
        return False

def node_quit(handler):
    if handler.isalive() == True:
        handler.sendline('quit\n')
    handler.close()

def config_get(handler):
    # Clearing all "expect" buffer
    while True:
        try:
            handler.expect('#', timeout = 0.1)
        except:
            break

    # Disable paging
    handler.sendline('terminal length 0')
    try:
        handler.expect('#', timeout = expctimeout)
    except:
        print('ERROR: error waiting for "#" prompt.')
        node_quit(handler)
        return False

    # Getting the config
    handler.sendline('more system:running-config')
    try:
        handler.expect('#', timeout = longtimeout)
    except:
        print('ERROR: error waiting for "#" prompt.')
        node_quit(handler)
        return False
    config = handler.before.decode()

    # Manipulating the config
    config = re.sub('\r', '', config, flags=re.DOTALL)                                      # Unix style
    config = re.sub('.*Using [0-9]+ out of [0-9]+ bytes\n', '', config, flags=re.DOTALL)    # Header
    config = re.sub('.*more system:running-config\n', '', config, flags=re.DOTALL)          # Header
    config = re.sub('!\nend.*', '!\nend\n', config, flags=re.DOTALL)                        # Footer

    return config

def config_put(handler):
    i = -1
    while i == -1:
        try:
            handler.sendline('\r\n')
            i = handler.expect(
                'Would you like to enter the', timeout = 5)
        except:
            i = -1
    handler.sendline('no')
    try:
       j  = handler.expect(['Press RETURN to get started','Enter enable secret:'], timeout = longtimeout)
    except:
        print('ERROR: error waiting for "Press RETURN to get started" prompt.')
        node_quit(handler)
        return False
    if j == 0:
        handler.sendline('\r\n')
        try:
            handler.expect('Router>', timeout = expctimeout)
        except:
            print('ERROR: error waiting for "Router> prompt.')
            node_quit(handler)
            return False
        handler.sendline('enable')
        try:
            handler.expect('Router#', timeout = expctimeout)
        except:
            print('ERROR: error waiting for "Router# prompt.')
            node_quit(handler)
            return False
        return True
    elif j == 1:
        handler.sendline('Eve1234567\n')
        try:
            handler.expect('Confirm enable secret', timeout = expctimeout)
        except:
            print('ERROR: error waiting for "Confirm enable prompt".')
            node_quit(handler)
            return False
        handler.sendline('Eve1234567\n')
        time.sleep(2)
        try:
            handler.expect('Press RETURN to get started', timeout = longtimeout)
        except:
            print('Error witing for Press RETURN to get started')
            return False
        print('Match RETURN')
        handler.sendline('\r\n')
        handler.sendline('\r\n')
        handler.sendline('\r\n')
        try:
            handler.expect('Switch>', timeout = longtimeout)
        except:
            print('ERROR: error waiting for "Switch> prompt.')
            return False
        handler.sendline('enable\n')
        handler.sendline('Eve1234567\n')
        handler.sendline('copy bootflash:iosxe_config.txt startup-config')
        try:
            handler.expect('Destination', timeout = longtimeout)
        except:
             print('ERROR: error waiting for Confirmation prompt.')
             return False
        handler.sendline('\n')
        try:
            handler.expect('#', timeout = longtimeout)
        except:
            print('ERROR: error waiting prompt #')
            return False
        handler.sendline('reload\n')
        try:
            handler.expect('confirm', timeout = expctimeout)
        except:
            print('ERROR: error waiting prompt #')
            return False
        handler.sendline('\n')
        try:
            handler.expect('confirm', timeout = longtimeout)
        except:
            print('ERROR: error waiting prompt #')
            return False
        handler.sendline('\n')
        return True


def usage():
    print('Usage: %s <standard options>' %(sys.argv[0]));
    print('Standard Options:');
    print('-a <s>    *Action can be:')
    print('           - get: get the startup-configuration and push it to a file')
    print('           - put: put the file as startup-configuration')
    print('-f <s>    *File');
    print('-p <n>    *Console port');
    print('-t <n>     Timeout (default = %i)' %(timeout));
    print('* Mandatory option')

def now():
    # Return current UNIX time in milliseconds
    return int(round(time.time() * 1000))

# 'filename' not the 'fiename' typo: main() runs in a multiprocessing child, and since
# Python 3.14 the Linux default start method is forkserver (was fork) -> the child does
# NOT inherit globals set in __main__, so the module global 'filename' is None there.
# Use the passed-in argument instead (correct under fork/forkserver/spawn).
def main(action, filename, port):
    try:
        # Connect to the device
        tmp = conntimeout
        while (tmp > 0):
            handler = pexpect.spawn('telnet 127.0.0.1 %i' %(port))
            time.sleep(0.1)
            tmp = tmp - 0.1
            if handler.isalive() == True:
                break

        if (handler.isalive() != True):
            print('ERROR: cannot connect to port "%i".' %(port))
            node_quit(handler)
            sys.exit(1)

        if action == 'get':
            # Login to the device and get a privileged prompt
            #print('Try login')
            rc = node_login(handler)
            if rc != True:
                print('ERROR: failed to login.')
                node_quit(handler)
                sys.exit(1)
            config = config_get(handler)
            if config in [False, None]:
                print('ERROR: failed to retrieve config.')
                node_quit(handler)
                sys.exit(1)

            try:
                fd = open(filename, 'a')
                fd.write(config)
                fd.close()
            except:
                print('ERROR: cannot write config to file.')
                node_quit(handler)
                sys.exit(1)
        elif action == 'put':
            #print('Try login')
            rc = config_put(handler)
            if rc != True:
                print('ERROR: failed to push config.')
                node_quit(handler)
                sys.exit(1)

            # Remove lock file
            lock = '%s/.lock' %(os.path.dirname(filename))

            if os.path.exists(lock):
                os.remove(lock)

            # Mark as configured
            configured = '%s/.configured' %(os.path.dirname(filename))
            if not os.path.exists(configured):
                open(configured, 'a').close()

        node_quit(handler)
        sys.exit(0)

    except Exception as e:
        print('ERROR: got an exception')
        print(type(e))  # the exception instance
        print(e.args)   # arguments stored in .args
        print(e)        # __str__ allows args to be printed directly,
        node_quit(handler)
        return False

if __name__ == "__main__":
    action = None
    filename = None
    port = None

    # Getting parameters from command line
    try:
        opts, args = getopt.getopt(sys.argv[1:], 'a:p:t:f:', ['action=', 'port=', 'timeout=', 'file='])
    except getopt.GetoptError as e:
        usage()
        sys.exit(3)

    for o, a in opts:
        if o in ('-a', '--action'):
            action = a
        elif o in ('-f', '--file'):
            filename = a
        elif o in ('-p', '--port'):
            try:
                port = int(a)
            except:
                port = -1
        elif o in ('-t', '--timeout'):
            try:
                timeout = int(a)
            except:
                timeout = -1
        else:
            print('ERROR: invalid parameter.')

    # Checking mandatory parameters
    if action == None or port == None or filename == None:
        usage()
        print('ERROR: missing mandatory parameters.')
        sys.exit(1)
    if action not in ['get', 'put']:
        usage()
        print('ERROR: invalid action.')
        sys.exit(1)
    if timeout < 0:
        usage()
        print('ERROR: timeout must be 0 or higher.')
        sys.exit(1)
    if port < 0:
        usage()
        print('ERROR: port must be 32768 or higher.')
        sys.exit(1)
    if action == 'get' and os.path.exists(filename):
        usage()
        print('ERROR: destination file already exists.')
        sys.exit(1)
    if action == 'put' and not os.path.exists(filename):
        usage()
        print('ERROR: source file does not already exist.')
        sys.exit(1)
    if action == 'put':
        try:
            fd = open(filename, 'r')
            config = fd.read()
            fd.close()
        except:
            usage()
            print('ERROR: cannot read from file.')
            sys.exit(1)

    # Backgrounding the script
    end_before = now() + timeout * 1000
    p = multiprocessing.get_context("fork").Process(target=main, name="Main", args=(action, filename, port))
    p.start()

    while (p.is_alive() and now() < end_before):
        # Waiting for the child process to end
        time.sleep(1)

    if p.is_alive():
        # Timeout occurred
        print('ERROR: timeout occurred.')
        p.terminate()
        sys.exit(127)

    if p.exitcode != 0:
        sys.exit(127)

    sys.exit(0)
