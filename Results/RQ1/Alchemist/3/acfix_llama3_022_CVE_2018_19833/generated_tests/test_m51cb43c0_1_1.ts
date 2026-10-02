import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant detection - burn with > instead of >=", function () {
  it("should revert when burning exactly the full balance (detects mutant with > instead of >=)", async function () {
    const [owner] = await ethers.getSigners();
    const initialSupply = 1000;
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, "TestToken", "TST");
    await instance.waitForDeployment();

    const ownerBalance = await instance.balanceOf(owner.address);
    const burnAmount = ownerBalance; // Burn entire balance

    // On original contract, this should succeed; on mutant with > it reverts
    await expect(instance.burn(burnAmount)).to.not.be.reverted;

    // Verify state after burn
    expect(await instance.balanceOf(owner.address)).to.equal(0);
    expect(await instance.totalSupply()).to.equal(0);
  });
});