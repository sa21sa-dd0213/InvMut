import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m44692e9d by calling transfer with non-empty _tos array", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Create a non-empty array of recipients
    const recipients = [addr1.address, addr2.address];
    const value = ethers.parseEther("1");

    // This call should succeed on the original (length > 0) but fail on the mutant (length < 0 is always false)
    await expect(
      instance.transfer(owner.address, owner.address, recipients, value)
    ).to.not.be.reverted;
  });
});