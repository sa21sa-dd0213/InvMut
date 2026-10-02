import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant m6b47b15c test", function () {
  it("should kill mutant by testing whitelisted sender to non-whitelisted receiver bypasses fees", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy DCF with liquidity receive address
    const Factory = await ethers.getContractFactory("DCF");
    const instance = await Factory.deploy(addr1.address);
    await instance.waitForDeployment();
    
    // Set up: owner is already whitelisted in constructor
    // Get initial balances
    const initialOwnerBalance = await instance.balanceOf(owner.address);
    
    // Transfer from whitelisted owner to non-whitelisted addr2
    // In original: should pass with super._transfer (no fee deduction)
    // In mutant: should fail because && requires both to be whitelisted
    const transferAmount = ethers.parseEther("100");
    
    await expect(
      instance.connect(owner).transfer(addr2.address, transferAmount)
    ).to.not.be.reverted;
    
    // Verify the full amount was transferred (no fee taken)
    const addr2Balance = await instance.balanceOf(addr2.address);
    expect(addr2Balance).to.equal(transferAmount);
    
    // Verify owner balance decreased by exact amount
    const finalOwnerBalance = await instance.balanceOf(owner.address);
    expect(finalOwnerBalance).to.equal(initialOwnerBalance - transferAmount);
  });
});