import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID - kill mutant m5859c148 (burn require >= instead of <=)", function () {
  it("should revert when burning less than full balance due to mutated require condition", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Owner gets initial balance from constructor (totalDistributed = 200000000e18)
    const ownerBalance = await instance.balanceOf(owner.address);

    // Burn a value strictly less than the full balance (e.g., 1 ether)
    const burnAmount = ethers.parseEther("1");

    // On original contract this would succeed, on mutant it should revert
    // because mutant requires _value >= balances[msg.sender]
    await expect(
      instance.connect(owner).burn(burnAmount)
    ).to.be.reverted;
  });
});