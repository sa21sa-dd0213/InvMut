import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant detection - mde0a5d2a", function () {
  it("should kill mutant by sending 0 wei to Put (via fallback) and expecting success on original but revert on mutant", async function () {
    const [owner] = await ethers.getSigners();

    // Deploy Log contract first (required by MONEY_BOX constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    // Deploy MONEY_BOX with Log address
    const MoneyBoxFactory = await ethers.getContractFactory("MONEY_BOX");
    const moneyBox = await MoneyBoxFactory.deploy();
    await moneyBox.waitForDeployment();

    // Set MinSum to 0 so balance checks don't interfere
    await moneyBox.SetMinSum(0);

    // Set LogFile to the deployed Log contract
    await moneyBox.SetLogFile(await logInstance.getAddress());

    // Initialize the contract
    await moneyBox.Initialized();

    // First deposit some ether to create a balance (required for the mutant to fail)
    await owner.sendTransaction({
      to: await moneyBox.getAddress(),
      value: ethers.parseEther("1")
    });

    // Now test the mutant: sending 0 wei should fail in mutant but succeed in original
    // The fallback calls Put(0) which triggers the mutated require check
    await expect(
      owner.sendTransaction({
        to: await moneyBox.getAddress(),
        value: 0
      })
    ).to.be.reverted;
  });
});