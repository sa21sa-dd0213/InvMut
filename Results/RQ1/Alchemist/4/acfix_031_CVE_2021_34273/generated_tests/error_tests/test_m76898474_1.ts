import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned mutant kill test - m76898474", function () {
  it("should kill mutant by calling transferOwnership from owner address and expecting success", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // In the original contract, owner can call transferOwnership successfully
    // In the mutant, require(msg.sender != owner) will revert for the owner
    await expect(
      instance.connect(owner).transferOwnership(addr1.address)
    ).to.not.be.reverted;
  });
});