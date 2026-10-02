import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID - Kill mutant m9775c018 (balanceOf returns 0 instead of actual balance)", function () {
  it("should detect mutant that removes balanceOf return statement by checking balance after transfer", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get initial balance of addr1 (should be 0)
    const initialBalance = await instance.balanceOf(addr1.address);
    expect(initialBalance).to.equal(0);

    // Transfer some tokens from owner to addr1
    const transferAmount = ethers.parseEther("100");
    await instance.connect(owner).transfer(addr1.address, transferAmount);

    // Check that addr1's balance reflects the transferred amount
    const balanceAfterTransfer = await instance.balanceOf(addr1.address);
    
    // If mutant is present, balanceOf returns 0 instead of the actual balance
    // This assertion will fail on the mutant, killing it
    expect(balanceAfterTransfer).to.equal(transferAmount);
  });
});