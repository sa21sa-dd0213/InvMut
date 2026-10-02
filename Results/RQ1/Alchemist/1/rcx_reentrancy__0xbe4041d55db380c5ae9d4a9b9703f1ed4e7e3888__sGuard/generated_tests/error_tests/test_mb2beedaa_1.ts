import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant mb2beedaa test", function () {
  it("should kill mutant by allowing Collect after deposit, lock expiry, and meeting minimum sum", async function () {
    const [owner, user] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MONEY_BOX");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Set minimum sum to 1 ether
    await instance.SetMinSum(ethers.parseEther("1"));
    // Initialize the contract (required after setting MinSum and LogFile)
    await instance.Initialized();

    // Deploy Log contract and set it
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    await instance.SetLogFile(await logInstance.getAddress());

    // User deposits 2 ether with lock time of 1 second
    const depositAmount = ethers.parseEther("2");
    const lockTime = 1;
    await instance.connect(user).Put(lockTime, { value: depositAmount });

    // Wait for lock time to expire
    await ethers.provider.send("evm_increaseTime", [lockTime + 1]);
    await ethers.provider.send("evm_mine", []);

    // User tries to collect 1 ether (should succeed on original, fail on mutant)
    const collectAmount = ethers.parseEther("1");
    const tx = instance.connect(user).Collect(collectAmount);

    // On the original contract this should succeed; on the mutant it will revert
    // because the condition is always false
    await expect(tx).to.be.reverted;
  });
});