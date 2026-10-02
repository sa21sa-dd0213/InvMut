import { expect } from "chai";
import { ethers } from "hardhat";

describe("BANK_SAFE mutant mde102c39 test", function () {
  it("should revert when Collect fails due to non-receiving contract and preserve balance", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy BANK_SAFE
    const BankSafeFactory = await ethers.getContractFactory("BANK_SAFE");
    const bankSafe = await BankSafeFactory.deploy();
    await bankSafe.waitForDeployment();

    // Deploy a LogFile contract (required for BANK_SAFE to function)
    const LogFileFactory = await ethers.getContractFactory("LogFile");
    const logFile = await LogFileFactory.deploy();
    await logFile.waitForDeployment();

    // Initialize the BANK_SAFE contract
    await bankSafe.connect(owner).SetLogFile(await logFile.getAddress());
    await bankSafe.connect(owner).SetMinSum(ethers.parseEther("0.1"));
    await bankSafe.connect(owner).Initialized();

    // Deploy a contract that cannot receive Ether (no receive/fallback)
    const NonReceiverFactory = await ethers.getContractFactory("NonReceiver");
    const nonReceiver = await NonReceiverFactory.deploy();
    await nonReceiver.waitForDeployment();

    // User deposits Ether into BANK_SAFE
    const depositAmount = ethers.parseEther("1.0");
    await bankSafe.connect(user).deposit({ value: depositAmount });

    // Check balance before Collect attempt
    const balanceBefore = await bankSafe.balances(user.address);

    // Attempt to collect to the non-receiving contract - this should revert
    const collectAmount = ethers.parseEther("0.5");
    await expect(
      bankSafe.connect(user).collect(collectAmount)
    ).to.be.reverted;

    // Verify balance remains unchanged (the revert preserved it)
    const balanceAfter = await bankSafe.balances(user.address);
    expect(balanceAfter).to.equal(balanceBefore);
  });
});

// Helper contract that cannot receive Ether
contract NonReceiver {
  // No receive() or fallback() function - will reject Ether transfers
}