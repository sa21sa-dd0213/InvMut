import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant mef6fb84c test", function () {
  it("should detect mutant by verifying balance deduction after successful Collect", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy MONEY_BOX (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("MONEY_BOX");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy Log contract separately (MONEY_BOX needs a Log address)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    // Set up the contract
    await instance.SetLogFile(await logInstance.getAddress());
    await instance.SetMinSum(ethers.parseEther("0.1"));
    await instance.Initialized();

    // User puts 1 ETH with 1 second lock time
    const putTx = await instance.connect(user).Put(1, { value: ethers.parseEther("1") });
    await putTx.wait();

    // Wait for lock to expire
    await ethers.provider.send("evm_increaseTime", [2]);
    await ethers.provider.send("evm_mine", []);

    // Get initial balance
    const initialHolder = await instance.Acc(await user.getAddress());
    const initialBalance = initialHolder.balance;

    // User tries to collect 0.5 ETH
    const collectTx = await instance.connect(user).Collect(ethers.parseEther("0.5"));
    await collectTx.wait();

    // Get final balance
    const finalHolder = await instance.Acc(await user.getAddress());
    const finalBalance = finalHolder.balance;

    // In the original contract, balance should decrease by 0.5 ETH
    // In the mutant (if (false)), balance stays the same
    expect(finalBalance).to.equal(initialBalance - ethers.parseEther("0.5"));
  });
});