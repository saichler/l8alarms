set -e
rm -rf demo
mkdir -p demo
cd alm/vnet
echo "Building vnet"
go build -o ../../demo/vnet_demo
cd ../main
echo "Building ALM"
go build -o ../../demo/alm_demo
cd ../ui/main
echo "Building ui"
go build -o ../../../demo/ui_demo
cd ..
cp -r ./web ../../demo/.
cd ../../demo
./vnet_demo &
sleep 1
./alm_demo &
./ui_demo

pkill demo
cd ..
rm -rf demo
