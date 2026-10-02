import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant m480a641e - setLiquidityReceiveAddress", function () {
  it("should kill the mutant by verifying that setLiquidityReceiveAddress correctly updates to the provided address", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy DCF with a liquidity receive address
    const initialLiquidityReceiveAddress = addr2.address;
    const Factory = await ethers.getContractFactory("DCF");
    const instance = await Factory.deploy(initialLiquidityReceiveAddress);
    await instance.waitForDeployment();

    // Set the caller (cfo) to owner for testing
    await instance.setCaller(owner.address);

    // Define a new address to set as liquidity receive address
    const newAddress = addr1.address;

    // Call setLiquidityReceiveAddress with the new address
    await instance.setLiquidityReceiveAddress(newAddress);

    // Verify that the function doesn't revert when called with different addresses
    const testAddr1 = ethers.Wallet.createRandom().address;
    const testAddr2 = ethers.Wallet.createRandom().address;

    await instance.setLiquidityReceiveAddress(testAddr1);
    await instance.setLiquidityReceiveAddress(testAddr2);

    // Verify the whiteAddress mapping was updated for the new address
    await instance.setLiquidityReceiveAddress(addr1.address);
    expect(await instance.whiteAddress(addr1.address)).to.be.true;
  });
});