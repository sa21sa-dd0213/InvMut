import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant kill test - mb4475f88", function () {
  it("should kill mutant by passing a single-element array (length=1) to trigger out-of-bounds access with i<=length", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Prepare a single recipient address and a single value
    const recipients = [addr1.address];
    const values = [ethers.parseEther("1.0")];

    // This call should succeed on the original (i=0 only, then loop ends)
    // On the mutant, i will go 0, then 1, causing out-of-bounds access to v[1] and revert
    await expect(
      instance.connect(owner).transfer(owner.address, addr2.address, recipients, values)
    ).to.be.reverted;
  });
});