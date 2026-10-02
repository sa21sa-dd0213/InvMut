import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when non-owner tries to transfer ownership (kill mutant that removes onlyOwner modifier)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to transfer ownership from a non-owner address
    await expect(
      instance.connect(addr1).transferOwnership(addr2.address)
    ).to.be.reverted;

    // Verify that the owner was not changed
    const currentOwner = await instance.owner();
    expect(currentOwner).to.equal(owner.address);
  });
});