import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when setOwner is called by an unauthorized address (not admin) - kills mutant that removes onlyAdmin modifier check", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to call setOwner from an unauthorized address (addr1, not the admin/owner)
    await expect(
      instance.connect(addr1).setOwner(addr2.address)
    ).to.be.revertedWith("Only admin can call address(this) function");
  });
});