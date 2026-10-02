import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant m811cc9b0 - require removed from withdraw", function () {
  it("should revert when withdrawing more than balance on original, but succeed on mutant (kill mutant)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First deposit some funds to addr1
    const depositAmount = ethers.parseEther("1.0");
    await instance.connect(addr1).deposit({ value: depositAmount });

    // Try to withdraw more than balance (e.g., 2 ETH when only 1 ETH deposited)
    const withdrawAmount = ethers.parseEther("2.0");
    
    // On the original contract this would revert, on the mutant it would succeed
    // We expect the transaction to succeed on the mutant (killing it)
    // If the contract still reverts, the test fails (mutant not killed)
    const tx = instance.connect(addr1).withdraw(withdrawAmount);

    // The mutant should allow the withdrawal, so we expect no revert
    await expect(tx).to.not.be.reverted;
  });
});