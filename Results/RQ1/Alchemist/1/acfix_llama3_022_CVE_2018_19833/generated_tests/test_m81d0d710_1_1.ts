import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant m81d0d710 - burn return value", function () {
  it("should revert when burn function does not return true", async function () {
    const [owner] = await ethers.getSigners();
    const initialSupply = 1000;
    const tokenName = "TestToken";
    const tokenSymbol = "TT";
    
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, tokenName, tokenSymbol);
    await instance.waitForDeployment();

    // Attempt to call burn and expect the transaction to fail because the mutated function
    // no longer returns a boolean value as declared in the function signature
    await expect(
      instance.burn(100)
    ).to.be.reverted;
  });
});