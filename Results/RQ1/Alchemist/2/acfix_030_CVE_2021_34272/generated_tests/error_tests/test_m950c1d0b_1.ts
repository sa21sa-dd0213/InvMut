import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should allow owner to transfer ownership and reject non-owner calls", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Verify owner can transfer ownership successfully (kills mutant where owner != owner fails)
    await expect(instance.connect(owner).transferOwnership(addr1.address)).to.not.be.reverted;
    
    // Verify the owner was actually changed
    expect(await instance.owner()).to.equal(addr1.address);
    
    // Verify original owner (now non-owner) cannot transfer (should revert)
    await expect(instance.connect(owner).transferOwnership(owner.address)).to.be.reverted;
  });
});