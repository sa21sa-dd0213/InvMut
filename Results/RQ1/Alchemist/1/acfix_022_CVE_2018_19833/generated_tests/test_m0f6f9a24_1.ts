import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant m0f6f9a24 - mintToken without onlyOwner", function () {
  it("should revert when non-owner calls mintToken (mutant allows it, test kills mutant)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const initialSupply = 1000;
    const tokenName = "TestToken";
    const tokenSymbol = "TT";
    const instance = await Factory.deploy(initialSupply, tokenName, tokenSymbol);
    await instance.waitForDeployment();

    // Attempt to mint tokens from addr1 (non-owner) - should revert in original
    await expect(
      instance.connect(addr1).mintToken(addr1.address, 100)
    ).to.be.reverted;
  });
});