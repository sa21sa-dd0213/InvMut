import { expect } from "chai";
import { ethers } from "hardhat";

describe("DEP_BANK mutant kill test", function () {
  it("should allow deposit with 0 value in original but revert in mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("DEP_BANK");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to deposit 0 ether
    const tx = instance.connect(addr1).Deposit({ value: 0 });
    
    // In the original contract (>=), this should succeed
    // In the mutant (>), this should revert
    // We expect the transaction to succeed (kill the mutant when it fails)
    await expect(tx).to.not.be.reverted;
  });
});