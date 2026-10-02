import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant test - m4b3c0df1", function () {
  it("should detect mutant where require(_amount >= balances[msg.sender]) replaces require(_amount <= balances[msg.sender])", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get initial balance of addr1 (should be 0)
    const initialBalance = await instance.balanceOf(addr1.address);
    expect(initialBalance).to.equal(0);

    // Transfer some tokens from owner to addr1 to give addr1 a balance
    const transferAmount = ethers.parseEther("100");
    await instance.connect(owner).transfer(addr1.address, transferAmount);

    // Verify addr1 now has a balance
    const addr1Balance = await instance.balanceOf(addr1.address);
    expect(addr1Balance).to.equal(transferAmount);

    // Now addr1 tries to transfer an amount LESS than their balance
    // In the original: require(_amount <= balances[msg.sender]) -> this should succeed
    // In the mutant: require(_amount >= balances[msg.sender]) -> this should revert
    const halfBalance = transferAmount / 2n;
    
    await expect(
      instance.connect(addr1).transfer(owner.address, halfBalance)
    ).to.be.reverted;
  });
});