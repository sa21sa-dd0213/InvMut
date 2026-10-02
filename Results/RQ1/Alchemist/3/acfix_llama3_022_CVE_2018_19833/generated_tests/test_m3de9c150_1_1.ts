import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant test for m3de9c150", function () {
  it("should revert when burning amount less than balance (mutant uses <= instead of >=)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const initialSupply = 1000;
    const tokenName = "TestToken";
    const tokenSymbol = "TST";
    const instance = await Factory.deploy(initialSupply, tokenName, tokenSymbol);
    await instance.waitForDeployment();

    // Transfer some tokens to addr1 so they have a balance less than initialSupply
    const transferAmount = ethers.parseUnits("500", 0);
    await instance.connect(owner).transfer(addr1.address, transferAmount);

    // Now addr1 tries to burn 100 tokens (which is less than their balance of 500)
    // Original: requires balance >= _value (500 >= 100) -> passes
    // Mutant: requires balance <= _value (500 <= 100) -> reverts
    const burnAmount = ethers.parseUnits("100", 0);
    await expect(
      instance.connect(addr1).burn(burnAmount)
    ).to.be.reverted;
  });
});