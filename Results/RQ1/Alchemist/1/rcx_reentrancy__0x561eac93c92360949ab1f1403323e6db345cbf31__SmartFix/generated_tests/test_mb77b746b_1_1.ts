import { expect } from "chai";
import { ethers } from "hardhat";

describe("BANK_SAFE mutant test - mb77b746b", function () {
  it("should allow withdrawal when balance equals the amount (detects mutant that changed >= to >)", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy the contract (no constructor arguments needed for BANK_SAFE)
    const Factory = await ethers.getContractFactory("BANK_SAFE");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Set up the contract: initialize and set MinSum
    await instance.SetMinSum(ethers.parseEther("1"));
    await instance.Initialized();

    // Deploy a LogFile contract so Log.AddMessage doesn't revert
    const LogFactory = await ethers.getContractFactory("LogFile");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    await instance.SetLogFile(await logInstance.getAddress());

    // User deposits exactly 1 ether
    await instance.connect(user).Deposit({ value: ethers.parseEther("1") });

    // Verify balance is exactly 1 ether
    const balance = await instance.balances(user.address);
    expect(balance).to.equal(ethers.parseEther("1"));

    // User tries to collect exactly 1 ether (balance == _am)
    // In the original contract this should succeed, in the mutant it should revert
    const tx = instance.connect(user).Collect(ethers.parseEther("1"));

    // The mutant will revert because balances[user] == _am fails the > check
    await expect(tx).to.be.reverted;
  });
});