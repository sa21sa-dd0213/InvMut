import { expect } from "chai";
import { ethers } from "hardhat";

describe("BANK_SAFE mutant ma7127bdd detection", function () {
  it("should revert when withdrawing more than balance in original, but mutant allows it", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("BANK_SAFE");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the contract
    await instance.connect(owner).Initialized();

    // Set MinSum to 0 so only the balance condition matters
    await instance.connect(owner).SetMinSum(0);

    // Deposit 100 wei from addr1
    const depositAmount = ethers.parseEther("0.0000000000000001"); // 100 wei
    await instance.connect(addr1).deposit({ value: depositAmount });

    // Try to collect 200 wei (more than balance)
    const withdrawAmount = ethers.parseEther("0.0000000000000002"); // 200 wei
    
    // In the original contract, this should revert because balance (100) < withdraw amount (200)
    // In the mutant, the condition balances[msg.sender] <= _am is true (100 <= 200), so it would succeed
    // We expect a revert to kill the mutant
    await expect(
      instance.connect(addr1).collect(withdrawAmount)
    ).to.be.reverted;
  });
});