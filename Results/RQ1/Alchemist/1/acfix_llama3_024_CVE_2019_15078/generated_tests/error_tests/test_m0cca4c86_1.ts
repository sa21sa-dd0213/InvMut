import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant test - burn with partial amount", function () {
  it("should revert when burning less than full balance due to mutant requiring exact balance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get owner's initial balance (set in constructor)
    const ownerBalance = await instance.balanceOf(owner.address);
    
    // Attempt to burn only half of the owner's balance
    const halfBalance = ownerBalance / 2n;
    
    // Original contract would allow this, mutant should revert
    await expect(
      instance.connect(owner).burn(halfBalance)
    ).to.be.reverted;
  });
});