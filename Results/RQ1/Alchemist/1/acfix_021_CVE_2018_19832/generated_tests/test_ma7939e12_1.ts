import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant ma7939e12: require(_amount >= balances[_from]) instead of require(_amount <= balances[_from])", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Owner distributes tokens to addr1 so addr1 has a balance
    await instance.connect(owner).getTokens({ value: ethers.parseEther("1") });
    const ownerBalance = await instance.balanceOf(owner.address);
    
    // Transfer some tokens from owner to addr1 to set up addr1 with a balance
    await instance.connect(owner).transfer(addr1.address, ethers.parseEther("100"));
    
    // Now addr1 approves addr2 to spend tokens
    await instance.connect(addr1).approve(addr2.address, ethers.parseEther("50"));
    
    // Get addr1's balance before transfer
    const addr1BalanceBefore = await instance.balanceOf(addr1.address);
    
    // Attempt to transfer an amount LESS than addr1's balance (should pass on original, fail on mutant)
    const transferAmount = addr1BalanceBefore / 2n;
    
    // This should revert on the mutant because _amount (transferAmount) < balances[_from] (addr1BalanceBefore)
    // but mutant requires _amount >= balances[_from]
    await expect(
      instance.connect(addr2).transferFrom(addr1.address, addr2.address, transferAmount)
    ).to.be.reverted;
  });
});