import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned reference (ethers v6)", function () {
  it("should allow admin to setOwner and revert when non-admin calls with original modifier", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Admin (deployer) should be able to set owner successfully
    await expect(instance.connect(owner).setOwner(addr1.address)).to.not.be.reverted;

    // Non-admin should fail (original modifier requires msg.sender == admin)
    await expect(instance.connect(addr2).setOwner(addr2.address)).to.be.revertedWith("Only admin can call address(this) function");
  });
});