import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant m872333e5 test", function () {
  it("should revert when transferring less than full balance due to == check in mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const initialSupply = 1000;
    const tokenName = "TestToken";
    const tokenSymbol = "TT";
    
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, tokenName, tokenSymbol);
    await instance.waitForDeployment();

    // Owner has 1000 tokens (initialSupply * 10^0 since decimals = 0)
    // Try to transfer 500 tokens (less than full balance) to addr1
    // Original: succeeds because 1000 >= 500
    // Mutant: reverts because 1000 != 500
    await expect(
      instance.transfer(addr1.address, 500)
    ).to.be.reverted;
  });
});