import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when unauthorized address calls transferOwnership (kills mutant that removes require)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to transfer ownership from an unauthorized address (addr1)
    // The original contract reverts; the mutant (without require) would not revert
    await expect(
      instance.connect(addr1).transferOwnership(addr1.address)
    ).to.be.reverted;
  });
});