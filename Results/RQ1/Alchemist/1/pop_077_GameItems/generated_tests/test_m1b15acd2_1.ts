import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameItems mutant test - setAllowedBurningAddresses authorization", function () {
  it("should revert when non-admin calls setAllowedBurningAddresses", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("GameItems");
    const instance = await Factory.deploy(owner.address, owner.address);
    await instance.waitForDeployment();

    // addr1 is not an admin, so calling setAllowedBurningAddresses should revert
    await expect(
      instance.connect(addr1).setAllowedBurningAddresses(addr1.address)
    ).to.be.reverted;
  });
});