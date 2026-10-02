import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant m123ad702 - transferFrom requires _amount >= balances[_from]", function () {
  it("should allow transferFrom with amount less than sender's balance in original, but mutant reverts", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Owner has totalDistributed = 200000000e18 tokens initially
    const ownerBalance = await instance.balanceOf(owner.address);
    const transferAmount = ownerBalance / 2n; // Strictly less than balance

    // Owner approves addr1 to spend tokens on their behalf
    await instance.connect(owner).approve(addr1.address, transferAmount);

    // addr1 calls transferFrom with amount < owner's balance
    // In original: should succeed because transferAmount <= ownerBalance
    // In mutant: will revert because transferAmount < ownerBalance (not >=)
    await expect(
      instance.connect(addr1).transferFrom(owner.address, addr2.address, transferAmount)
    ).to.be.reverted;
  });
});