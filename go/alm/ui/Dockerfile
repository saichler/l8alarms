FROM saichler/builder:latest AS build

COPY ./main/main.go /home/src/github.com/saichler/build/

RUN go mod init
RUN GOPROXY=direct GOPRIVATE=github.com go mod tidy
RUN go build -o almweb

FROM saichler/alm-security:latest AS final
COPY --from=build /home/src/github.com/saichler/build/almweb /home/run/almweb
COPY ./web /home/run/web

ENTRYPOINT ["/home/run/almweb"]
