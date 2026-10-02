import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should succeed with a non-empty _tos array and kill the mutant that requires _tos.length < 0", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const tokenAddress = addr1.address; // using a simple address as the token contract (call will revert, but the require check happens before any call)
    const recipients = [addr2.address];
    const value = ethers.parseEther("1");

    // The original contract requires _tos.length > 0, which is satisfied.
    // The mutant requires _tos.length < 0, which will always fail and revert.
    // This call should succeed on the original but revert on the mutant.
    await expect(
      instance.transfer(owner.address, tokenAddress, recipients, value)
    ).to.not.be.reverted;
  });
});