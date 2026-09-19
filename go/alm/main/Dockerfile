FROM saichler/builder:latest AS build

COPY main.go /home/src/github.com/saichler/build/
RUN go mod init
RUN GOPROXY=direct GOPRIVATE=github.com go mod tidy
RUN go build -o alm

FROM saichler/alm-postgres:latest AS final

COPY --from=build /home/src/github.com/saichler/build/alm /home/run/alm

ENTRYPOINT ["/home/run/alm"]
