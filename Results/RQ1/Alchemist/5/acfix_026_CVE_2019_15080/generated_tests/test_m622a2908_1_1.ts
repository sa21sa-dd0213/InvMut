import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when owner calls a function with onlyOwner modifier due to mutant using != instead of ==", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The original contract would allow owner to call transferOwnership successfully.
    // The mutant reverts when msg.sender == owner, so owner's call should fail.
    await expect(
      instance.connect(owner).transferOwnership(addr1.address)
    ).to.be.reverted;
  });
});