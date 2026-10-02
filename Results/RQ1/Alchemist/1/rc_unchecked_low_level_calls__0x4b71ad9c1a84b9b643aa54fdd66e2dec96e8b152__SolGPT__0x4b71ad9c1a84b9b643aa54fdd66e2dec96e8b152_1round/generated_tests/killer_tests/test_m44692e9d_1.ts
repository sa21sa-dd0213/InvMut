import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort mutant kill test - m44692e9d", function () {
  it("should kill mutant by calling transfer with non-empty _tos array and expecting success", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Create a non-empty array of recipients
    const recipients = [addr1.address];
    const value = ethers.parseEther("1");

    // On the original contract, this call should succeed
    // On the mutant, require(_tos.length < 0) will always revert because length is never negative
    await expect(
      instance.transfer(owner.address, addr2.address, recipients, value)
    ).to.not.be.reverted;
  });
});