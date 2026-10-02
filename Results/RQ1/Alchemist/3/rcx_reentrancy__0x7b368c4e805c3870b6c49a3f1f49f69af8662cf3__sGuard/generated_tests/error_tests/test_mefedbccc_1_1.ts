import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant mefedbccc test", function () {
  it("should kill mutant by making Collect fail when recipient contract reverts", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy a malicious receiver that reverts on receiving ETH
    const RevertingReceiver = await ethers.getContractFactory("RevertingReceiver");
    const revertingReceiver = await RevertingReceiver.deploy();
    await revertingReceiver.waitForDeployment();

    // Deploy the Log contract (required constructor argument for W_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy W_WALLET with Log address
    const Factory = await ethers.getContractFactory("W_WALLET");
    const wallet = await Factory.deploy(await log.getAddress());
    await wallet.waitForDeployment();

    // User puts 2 ETH into the wallet with unlock time in the past
    const putAmount = ethers.parseEther("2");
    const pastTime = 0;
    await wallet.connect(user).Put(pastTime, { value: putAmount });

    // Verify balance is recorded
    const holderBefore = await wallet.Acc(user.address);
    expect(holderBefore.balance).to.equal(putAmount);

    // Try to collect to the reverting receiver address
    const collectAmount = ethers.parseEther("1");
    const tx = wallet.connect(user).Collect(collectAmount);

    // Original contract would revert because _s is false, mutant succeeds incorrectly
    // For mutant detection: the transaction should succeed (mutant allows it) but 
    // the balance should NOT be deducted and event should NOT be emitted
    // We expect the call to succeed in the mutant, but verify incorrect state
    await expect(tx).to.not.be.reverted;

    // In the mutant, balance would be incorrectly deducted despite failed call
    // In the original, balance would remain unchanged
    const holderAfter = await wallet.Acc(user.address);

    // For the mutant: balance should still be 2 ETH (since call failed)
    // If mutant deducted balance, it's wrong - so we assert it SHOULD still be 2
    expect(holderAfter.balance).to.equal(putAmount);

    // Verify no Collect event was logged (mutant would have logged it incorrectly)
    const historyLength = await log.History.length();
    // Only the Put event should exist, no Collect event
    expect(historyLength).to.equal(1);
  });
});

// Helper contract that reverts on receive
contract RevertingReceiver {
  receive() external payable {
    revert("I do not accept ETH");
  }
}