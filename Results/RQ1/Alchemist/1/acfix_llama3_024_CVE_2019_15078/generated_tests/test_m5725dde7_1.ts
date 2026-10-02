import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant test - withdrawForeignTokens without onlyOwner", function () {
  it("should revert when non-owner calls withdrawForeignTokens", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Use a dummy token address (any address works for the test)
    const dummyTokenAddress = ethers.Wallet.createRandom().address;

    // Expect revert when non-owner calls withdrawForeignTokens
    await expect(
      instance.connect(addr1).withdrawForeignTokens(dummyTokenAddress)
    ).to.be.reverted;
  });
});