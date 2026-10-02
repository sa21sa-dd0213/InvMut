import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant mfc3dae0c test", function () {
  it("should succeed when calling transfer with a non-empty recipients array", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const recipients = [addr1.address, addr2.address];
    const value = ethers.parseEther("1");
    
    // This call should succeed on the original (require length > 0 passes)
    // but will revert on the mutant (require length < 0 always fails)
    await expect(
      instance.transfer(owner.address, instance.target, recipients, value)
    ).to.not.be.reverted;
  });
});