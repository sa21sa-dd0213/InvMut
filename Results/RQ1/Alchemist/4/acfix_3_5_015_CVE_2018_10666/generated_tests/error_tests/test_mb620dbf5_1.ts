import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when non-admin tries to call setOwner after mutant removes admin check", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // addr1 is not the admin, so setOwner should revert with the original contract
    // but in the mutant (without the require), it will succeed - we expect revert to kill mutant
    await expect(
      instance.connect(addr1).setOwner(addr2.address)
    ).to.be.reverted;
  });
});