import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant ma17c396b", function () {
  it("should revert when calling transfer with empty _tos array, but succeed with non-empty array on original", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Test with a non-empty array - this should revert on the mutant due to require(_tos.length < 0)
    // but would succeed on the original contract
    const tos = [addr1.address];
    const values = [100];
    
    await expect(
      instance.transfer(owner.address, addr2.address, tos, values)
    ).to.be.reverted;
  });
});