import { expect } from "chai";
import { ethers } from "hardhat";

describe("PrivateBank mutant detection - m50292d70", function () {
  it("should detect mutant by sending exactly MinDeposit (1 ether) and checking balance", async function () {
    const [owner, depositor] = await ethers.getSigners();

    // Deploy the Log contract first (required constructor argument for PrivateBank)
    const LogFactory = await ethers.getContractFactory("Log");
    const logContract = await LogFactory.deploy();
    await logContract.waitForDeployment();

    // Deploy PrivateBank with the Log contract address
    const PrivateBankFactory = await ethers.getContractFactory("PrivateBank");
    const privateBank = await PrivateBankFactory.deploy(await logContract.getAddress());
    await privateBank.waitForDeployment();

    // Get initial balance of depositor
    const initialBalance = await privateBank.balances(depositor.address);
    expect(initialBalance).to.equal(0);

    // Send exactly 1 ether (MinDeposit) to the Deposit function
    const depositAmount = ethers.parseEther("1");
    const tx = await privateBank.connect(depositor).Deposit({ value: depositAmount });
    await tx.wait();

    // Check that the balance increased by exactly 1 ether
    // In the original contract this should succeed, in the mutant it will fail
    const finalBalance = await privateBank.balances(depositor.address);
    expect(finalBalance).to.equal(depositAmount);
  });
});