import { expect } from "chai";
import { ethers } from "hardhat";

describe("ACCURAL_DEPOSIT mutant mb76d7afe test", function () {
  it("should kill the mutant by verifying Collect succeeds and logs when it should", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy the LogFile contract first (no constructor args)
    const LogFactory = await ethers.getContractFactory("LogFile");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    const logAddress = await logInstance.getAddress();

    // Deploy ACCURAL_DEPOSIT (no constructor args)
    const Factory = await ethers.getContractFactory("ACCURAL_DEPOSIT");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const contractAddress = await instance.getAddress();

    // Set the LogFile address
    await instance.connect(owner).SetLogFile(logAddress);

    // Set MinSum to a low value so user can collect
    await instance.connect(owner).SetMinSum(ethers.parseEther("0.001"));

    // Initialize the contract
    await instance.connect(owner).Initialized();

    // User deposits 1 ether
    await instance.connect(user).Deposit({ value: ethers.parseEther("1") });

    // Verify balance is correct
    const balanceBefore = await instance.balances(user.address);
    expect(balanceBefore).to.equal(ethers.parseEther("1"));

    // User calls Collect with 0.5 ether (should succeed)
    await expect(
      instance.connect(user).Collect(ethers.parseEther("0.5"), { value: 0 })
    ).to.not.be.reverted;

    // Verify the balance decreased
    const balanceAfter = await instance.balances(user.address);
    expect(balanceAfter).to.equal(ethers.parseEther("0.5"));

    // Verify that a log message was added to the LogFile
    const historyLength = await logInstance.History.length;
    expect(historyLength).to.equal(2); // One from Deposit, one from Collect
  });
});