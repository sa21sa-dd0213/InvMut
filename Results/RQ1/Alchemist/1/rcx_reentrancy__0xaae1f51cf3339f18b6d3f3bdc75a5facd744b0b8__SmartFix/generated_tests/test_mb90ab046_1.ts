import { expect } from "chai";
import { ethers } from "hardhat";

describe("DEP_BANK mutant kill test - mb90ab046", function () {
  it("should revert when Collect ETH transfer fails in original, but mutant allows balance deduction", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy LogFile (no constructor arguments)
    const LogFileFactory = await ethers.getContractFactory("LogFile");
    const logFile = await LogFileFactory.deploy();
    await logFile.waitForDeployment();

    // Deploy DEP_BANK (no constructor arguments)
    const DEP_BANKFactory = await ethers.getContractFactory("DEP_BANK");
    const bank = await DEP_BANKFactory.deploy();
    await bank.waitForDeployment();

    // Setup: set MinSum, set LogFile, initialize
    await bank.SetMinSum(0);
    await bank.SetLogFile(await logFile.getAddress());
    await bank.Initialized();

    // User deposits 1 ETH
    const depositAmount = ethers.parseEther("1");
    await bank.connect(user).Deposit({ value: depositAmount });

    // Deploy a malicious receiver contract that rejects ETH
    const MaliciousReceiverFactory = await ethers.getContractFactory(
      "contract MaliciousReceiver { receive() external payable { revert(); } }"
    );
    const maliciousReceiver = await MaliciousReceiverFactory.deploy();
    await maliciousReceiver.waitForDeployment();

    // User tries to collect 1 ETH but sends to malicious receiver
    // In original: should revert because transfer fails
    // In mutant: balance gets deducted but ETH is not transferred
    const tx = bank.connect(user).Collect(
      depositAmount,
      { gasLimit: 500000 }
    );

    // We expect the transaction to succeed in the mutant (no revert)
    // But user's balance should NOT be deducted (mutant incorrectly deducts)
    const balanceBefore = await bank.balances(user.address);
    await tx;
    const balanceAfter = await bank.balances(user.address);

    // In original, this would have reverted. In mutant, balance is incorrectly changed.
    // The test kills the mutant if balance decreased when it should not have
    expect(balanceAfter).to.equal(balanceBefore);
  });
});