import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant m06a54ea9 test", function () {
  it("should revert when donating the exact contract balance due to msg.value+1 bug", async function () {
    const [owner, whale, donor] = await ethers.getSigners();
    const betLimit = ethers.parseEther("1");
    
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whale.address, betLimit);
    await instance.waitForDeployment();
    
    // Open to public
    await instance.connect(owner).OpenToThePublic();
    
    // Get the contract's initial balance (should be 0)
    const initialBalance = await instance.ethBalance();
    
    // Donate the exact contract balance - this should work in original
    // but fail in mutant because it tries to send balance + 1 wei
    const donateAmount = initialBalance;
    
    // In the mutant, donateToWhale(msg.value+1) will try to send donateAmount + 1 wei
    // which is more than the contract balance, causing revert
    await expect(
      instance.connect(donor).donate({ value: donateAmount })
    ).to.be.reverted;
  });
});