import { expect } from "chai";
import { ethers } from "hardhat";

describe("Private_Bank mutant detection - m21d7e0f0", function () {
  it("should detect the mutant that changes >= to == in Deposit require statement", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy the Log contract first (required constructor argument)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy Private_Bank with the Log contract address
    const PrivateBankFactory = await ethers.getContractFactory("Private_Bank");
    const bank = await PrivateBankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();

    const depositAmount = ethers.parseEther("2"); // Above MinDeposit (1 ether)
    const initialBalance = await bank.balances(user.address);

    // Attempt to deposit - should succeed on original, but mutant will revert
    // because the mutant require condition (balance + value == balance) only passes for value == 0
    await expect(
      bank.connect(user).Deposit({ value: depositAmount })
    ).to.be.reverted;

    // Verify balance did not change (deposit was reverted)
    const finalBalance = await bank.balances(user.address);
    expect(finalBalance).to.equal(initialBalance);
  });
});