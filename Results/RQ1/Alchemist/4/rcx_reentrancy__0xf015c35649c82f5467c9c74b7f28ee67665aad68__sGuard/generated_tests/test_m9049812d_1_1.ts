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

    // Deploy a malicious caller contract that will call Collect and revert on receive
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
    let holder = await bank.Acc(maliciousCaller.address);
    expect(holder.balance).to.equal(ethers.parseEther("5"));

    // Fast forward time past the unlock (block.timestamp)
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