import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia mutant md6716d35 - burn with == instead of <=", function () {
  it("should revert when burning partial balance (mutant requires exact match)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Owner gets totalDistributed tokens from NETM() call
    await instance.NETM();
    const ownerBalance = await instance.balanceOf(owner.address);
    
    // Burn a partial amount (less than full balance) - should fail on mutant
    const partialBurn = ownerBalance / 2n;
    await expect(
      instance.burn(partialBurn)
    ).to.be.reverted;
  });

  it("should succeed when burning exact full balance (both original and mutant allow)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    await instance.NETM();
    const ownerBalance = await instance.balanceOf(owner.address);
    
    // Burn entire balance - should succeed in both versions
    await expect(instance.burn(ownerBalance)).to.not.be.reverted;
  });
});