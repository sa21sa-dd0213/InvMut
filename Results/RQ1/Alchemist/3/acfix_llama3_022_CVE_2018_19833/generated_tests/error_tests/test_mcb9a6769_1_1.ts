import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant detection test", function () {
  it("should detect the _transfer overflow check mutation by transferring to a zero-balance address", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const initialSupply = 1000;
    const tokenName = "TestToken";
    const tokenSymbol = "TT";
    
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, tokenName, tokenSymbol);
    await instance.waitForDeployment();

    // addr1 has zero balance initially
    const transferAmount = 100;
    
    // This should succeed in the original contract (0 + 100 >= 0)
    // In the mutant, it will revert because 0 - 100 >= 0 causes underflow
    await expect(instance.transfer(addr1.address, transferAmount)).to.not.be.reverted;
  });
});