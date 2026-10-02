import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant m811cc9b0 - withdraw without balance check", function () {
  it("should revert when withdrawing more than balance on original, but mutant allows it", async function () {
    const [owner, user] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit some funds for user
    const depositAmount = ethers.parseEther("1.0");
    await instance.connect(user).deposit({ value: depositAmount });

    // Attempt to withdraw more than balance (e.g., 2 ETH)
    const withdrawAmount = ethers.parseEther("2.0");

    // This should revert on the original contract, but on the mutant it will succeed (no require check)
    // We expect the transaction to succeed on the mutant (i.e., not revert)
    const tx = instance.connect(user).withdraw(withdrawAmount);

    // The test passes if the withdrawal succeeds (mutant behavior)
    // The test fails (kills the mutant) if it reverts (original behavior)
    await expect(tx).to.not.be.reverted;
  });
});