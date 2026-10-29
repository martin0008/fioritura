#!/bin/zsh
# Doppio clic su questo file per avviare Fioritura con la classifica condivisa.
cd "$(dirname "$0")" || exit 1
exec python3 server.py --open
