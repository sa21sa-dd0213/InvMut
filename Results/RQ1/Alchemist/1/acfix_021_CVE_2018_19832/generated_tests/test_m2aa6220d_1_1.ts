import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia mutant kill test - transferOwnership to address(0)", function () {
  it("should kill mutant by verifying ownership cannot be transferred to zero address", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get original owner before transfer attempt
    const originalOwner = await instance.owner();

    // Attempt to transfer ownership to zero address
    await instance.transferOwnership(ethers.ZeroAddress);

    // Check that owner remains unchanged (original behavior)
    // Mutant would set owner to zero address, so this assertion would fail
    const currentOwner = await instance.owner();
    expect(currentOwner).to.equal(originalOwner);
    expect(currentOwner).to.not.equal(ethers.ZeroAddress);
  });
});