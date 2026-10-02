import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant test", function () {
  it("should kill mutant m54322bcf by testing Collect with balance equal to MinSum", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy MONEY_BOX (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("MONEY_BOX");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy Log contract (needed for MONEY_BOX to function)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    // Set up the contract: set MinSum and LogFile, then initialize
    const minSum = ethers.parseEther("1.0");
    await instance.connect(owner).SetMinSum(minSum);
    await instance.connect(owner).SetLogFile(await logInstance.getAddress());
    await instance.connect(owner).Initialized();

    // addr1 puts 1 ETH with lockTime 0 (so unlockTime = block.timestamp)
    const putTx = await instance.connect(addr1).Put(0, { value: ethers.parseEther("1.0") });
    await putTx.wait();

    // Wait for the next block so timestamp advances (ensuring block.timestamp > unlockTime)
    await ethers.provider.send("evm_mine", []);

    // addr1 tries to collect 1 ETH (balance == MinSum)
    // On original: acc.balance >= MinSum (1 >= 1) is true → success
    // On mutant: acc.balance <= MinSum (1 <= 1) is true → also succeeds, need to distinguish

    // Actually, let's test with balance greater than MinSum to kill the mutant
    // First reset: addr1 puts 2 ETH instead
    const instance2 = await ethers.getContractFactory("MONEY_BOX");
    const instance2Deployed = await instance2.deploy();
    await instance2Deployed.waitForDeployment();
    const logInstance2 = await ethers.getContractFactory("Log");
    const logInstance2Deployed = await logInstance2.deploy();
    await logInstance2Deployed.waitForDeployment();

    await instance2Deployed.connect(owner).SetMinSum(minSum);
    await instance2Deployed.connect(owner).SetLogFile(await logInstance2Deployed.getAddress());
    await instance2Deployed.connect(owner).Initialized();

    const putTx2 = await instance2Deployed.connect(addr1).Put(0, { value: ethers.parseEther("2.0") });
    await putTx2.wait();

    await ethers.provider.send("evm_mine", []);

    // Try to collect 1 ETH (balance=2 > MinSum=1)
    // Original: 2 >= 1 is true → success
    // Mutant: 2 <= 1 is false → revert
    const collectTx = instance2Deployed.connect(addr1).Collect(ethers.parseEther("1.0"));

    // On original this would succeed, on mutant it reverts
    // To kill the mutant, we expect it to revert (because mutant condition fails)
    await expect(collectTx).to.be.reverted;

    // Additional verification: if not reverted (original behavior), check balance decreased
    // But since we expect revert on mutant, the test passes when it reverts
  });
});