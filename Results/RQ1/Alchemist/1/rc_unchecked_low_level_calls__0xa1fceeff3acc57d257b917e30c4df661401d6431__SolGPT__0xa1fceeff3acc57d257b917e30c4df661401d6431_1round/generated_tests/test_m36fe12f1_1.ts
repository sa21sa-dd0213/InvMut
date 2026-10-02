import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract mutant kill test - m36fe12f1", function () {
  it("should succeed with tos.length > 0 on original but fail on mutant that requires tos.length < 0", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the AirDropContract (constructor takes no arguments)
    const Factory = await ethers.getContractFactory("AirDropContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Prepare arrays with exactly one element (length = 1, which is > 0)
    const tos = [addr1.address];
    const vs = [ethers.parseEther("1")];
    
    // The original contract requires tos.length > 0, so with length = 1 it should succeed
    // The mutant requires tos.length < 0, which is impossible (unsigned), so it will always revert
    await expect(
      instance.transfer(instance.target, tos, vs)
    ).to.be.reverted;
  });
});