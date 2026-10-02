import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant kill test - m9049812d", function () {
  it("should kill the mutant by checking that Collect reverts when external call fails", async function () {
    const [owner, attacker] = await ethers.getSigners();

    // Deploy the Log contract first (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy MY_BANK with the Log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();

    // Deploy a malicious receiver contract that always reverts on receive
    const MaliciousReceiverFactory = await ethers.getContractFactory("MaliciousReceiver");
    const malicious = await MaliciousReceiverFactory.deploy();
    await malicious.waitForDeployment();

    // Fund the attacker account with some ETH
    await owner.sendTransaction({
      to: attacker.address,
      value: ethers.parseEther("10")
    });

    // Attacker puts 5 ETH into the bank with a short unlock time
    await bank.connect(attacker).Put(0, { value: ethers.parseEther("5") });

    // Verify balance is recorded
    let holder = await bank.Acc(attacker.address);
    expect(holder.balance).to.equal(ethers.parseEther("5"));

    // Fast forward time past the unlock (block.timestamp)
    await ethers.provider.send("evm_increaseTime", [3600]);
    await ethers.provider.send("evm_mine", []);

    // Attempt to collect 1 ETH, sending to the malicious contract that reverts
    // In original contract: call fails, _s is false, balance stays the same
    // In mutant: condition is true regardless, balance would be incorrectly deducted
    const collectTx = bank.connect(attacker).Collect(ethers.parseEther("1"), {
      to: malicious.getAddress() // This parameter doesn't exist - we need to use msg.sender
    });

    // Actually the Collect function sends to msg.sender, not to a parameter
    // So we need attacker to be the malicious contract itself
    // Let's redo: deploy malicious as a signer with ETH
    // Better approach: create a contract that calls Collect on behalf of itself

    // Re-deploy with malicious as the caller
    const MaliciousCallerFactory = await ethers.getContractFactory("MaliciousCaller");
    const maliciousCaller = await MaliciousCallerFactory.deploy(await bank.getAddress());
    await maliciousCaller.waitForDeployment();

    // Fund the malicious caller
    await owner.sendTransaction({
      to: maliciousCaller.address,
      value: ethers.parseEther("10")
    });

    // Malicious caller puts 5 ETH into bank
    await maliciousCaller.putFunds({ value: ethers.parseEther("5") });

    // Verify balance
    holder = await bank.Acc(maliciousCaller.address);
    expect(holder.balance).to.equal(ethers.parseEther("5"));

    // Fast forward time
    await ethers.provider.send("evm_increaseTime", [3600]);
    await ethers.provider.send("evm_mine", []);

    // Malicious caller attempts to collect - it will revert on receive
    // In original: Collect should NOT deduct balance because call reverts
    // In mutant: Collect WILL deduct balance because condition is always true
    await expect(maliciousCaller.collectAndRevert(ethers.parseEther("1"))).to.not.be.reverted;

    // Check balance after the attempt
    holder = await bank.Acc(maliciousCaller.address);
    
    // For original contract: balance should still be 5 ETH (call failed)
    // For mutant: balance would be 4 ETH (call "succeeded" in mutant's view)
    expect(holder.balance).to.equal(ethers.parseEther("5"));
  });
});