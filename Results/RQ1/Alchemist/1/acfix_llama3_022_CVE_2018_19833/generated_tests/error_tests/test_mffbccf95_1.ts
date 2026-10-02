import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken - kill mutant mffbccf95 (removed zero address check)", function () {
  it("should revert when transferring to zero address", async function () {
    const [owner] = await ethers.getSigners();
    const initialSupply = 1000;
    const tokenName = "TestToken";
    const tokenSymbol = "TST";
    
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, tokenName, tokenSymbol);
    await instance.waitForDeployment();

    // Try to transfer to zero address - should revert in original, but mutant would allow it
    await expect(
      instance.transfer(ethers.ZeroAddress, 100)
    ).to.be.reverted;
  });
});