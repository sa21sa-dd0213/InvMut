import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when non-owner tries to transfer ownership (kills mutant mc3469b23)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Store original owner before attempting unauthorized transfer
    const originalOwner = await instance.owner();

    // Attempt to transfer ownership from an unauthorized address (addr1)
    await expect(
      instance.connect(addr1).transferOwnership(addr2.address)
    ).to.be.reverted;

    // Verify owner hasn't changed (the mutation would allow it to change)
    const newOwner = await instance.owner();
    expect(newOwner).to.equal(originalOwner);
  });
});