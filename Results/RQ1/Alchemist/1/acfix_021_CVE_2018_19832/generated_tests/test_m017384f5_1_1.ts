import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia mutant test - burn function", function () {
  it("should detect mutant that incorrectly adds instead of subtracts totalDistributed on burn", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get initial totalDistributed (should be 250000000e18)
    const initialTotalDistributed = await instance.totalDistributed();

    // Owner needs to have some tokens to burn - NETM() gives owner totalDistributed tokens
    await instance.NETM();

    // Get owner's balance
    const ownerBalance = await instance.balanceOf(owner.address);

    // Burn a specific amount
    const burnAmount = ethers.parseEther("1000");
    await instance.burn(burnAmount);

    // Check totalDistributed after burn
    const finalTotalDistributed = await instance.totalDistributed();

    // In the original contract, totalDistributed should decrease by burnAmount
    // In the mutant, totalDistributed would increase by burnAmount (wrong)
    expect(finalTotalDistributed).to.equal(initialTotalDistributed - burnAmount);
  });
});