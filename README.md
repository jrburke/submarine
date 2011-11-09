# Submarine

Location based experiment for mobile phones using phonegap.

## Setup

Run **npm install** in this directory to install the dependencies that
are listed in the package.json file.

Two symlinks need to be created once you pull the code:

* phonegap/ios/www should point to phonegap/www
* phonegap/android/assets/www should point to phonegap/www

The following environment variables need to be set too for the server to
know its info:

* export SUBMARINEPROTOCOL=http
* export SUBMARINEHOST=some.host-or-ipaddr.ocm
* export SUBMARINEPORT=8176

If you want to run a https server:

* export SUBMARINEPROTOCOL=https
* export SUBMARINEHOST=some.host-or-ipaddr.ocm
* export SUBMARINEPORT=8176
* export SUBMARINEKEY=/path/to/private/key
* export SUBMARINECERT=/path/to/cert
* export SUBMARINECA=/path/to/intermediate/certificate/ca

The websocket server is run on a different port due to weirdness with
node+https+static files.

* export SUBMARINESOCKETPROTOCOL=https
* export SUBMARINESOCKETHOST=some.host-or-ipaddr.ocm
* export SUBMARINESOCKETPORT=8176
* export SUBMARINESOCKETKEY=/path/to/private/key
* export SUBMARINESOCKETCERT=/path/to/cert
* export SUBMARINESOCKETCA=/path/to/intermediate/certificate/ca
