import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF - setWhiteBulk mutant test (mf155c2fe)", function () {
  it("should revert when accessing out-of-bounds array index in setWhiteBulk", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy DCF with constructor argument (liquidityReceiveAddress)
    const liquidityReceiveAddress = addr1.address;
    const Factory = await ethers.getContractFactory("DCF");
    const instance = await Factory.deploy(liquidityReceiveAddress);
    await instance.waitForDeployment();

    // Set the caller (cfo) to be the owner so we can call setWhiteBulk
    await instance.setCaller(owner.address);

    // Create an array with 3 addresses to test the off-by-one error
    const addresses = [
      ethers.Wallet.createRandom().address,
      ethers.Wallet.createRandom().address,
      ethers.Wallet.createRandom().address
    ];

    // The mutated code uses i <= _addr.length, which will try to access _addr[3] 
    // (out of bounds for a 3-element array), causing a revert
    await expect(
      instance.setWhiteBulk(addresses, true)
    ).to.be.reverted;
  });
});