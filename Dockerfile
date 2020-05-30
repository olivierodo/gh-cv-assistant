#FROM thomasweise/texlive
#FROM debian:buster-slim
FROM thomasweise/docker-texlive-thin

# Install XeTeX
RUN \
    echo "===> Update repositories" && \
    apt-get update && \
    echo "===> Install jq and curl" && \
    apt-get install -y curl jq && \
    echo "===> Clean up" && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

COPY fonts /usr/local/share/fonts

ADD entrypoint.sh /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]

