import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort mutant detection - loop bound change", function () {
  it("should revert when _tos array has one element due to out-of-bounds access in mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the AlwaysTrue contract
    const alwaysTrueFactory = await ethers.getContractFactory("AlwaysTrue");
    const alwaysTrue = await alwaysTrueFactory.deploy();
    await alwaysTrue.waitForDeployment();
    
    // Deploy the airPort contract
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    const amount = ethers.parseEther("1");
    
    // Create an array with exactly one recipient
    const recipients = [addr1.address];
    
    // This should succeed on the original contract (loop runs once)
    // On the mutant, the loop would try to access _tos[1] which is out of bounds
    // and Solidity 0.8+ will revert
    await expect(
      instance.transfer(owner.address, alwaysTrue.target, recipients, amount)
    ).to.not.be.reverted;
  });
});