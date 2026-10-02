import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m88789022 by triggering out-of-bounds access when i equals _tos.length", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Create arrays with exactly one element to trigger the off-by-one bug
    const recipients = [addr1.address];
    const amounts = [ethers.parseEther("1")];

    // This call should revert on the mutant because loop goes to i <= 1,
    // and when i = 1, v[1] is out of bounds
    await expect(
      instance.transfer(owner.address, instance.address, recipients, amounts)
    ).to.be.reverted;
  });
});