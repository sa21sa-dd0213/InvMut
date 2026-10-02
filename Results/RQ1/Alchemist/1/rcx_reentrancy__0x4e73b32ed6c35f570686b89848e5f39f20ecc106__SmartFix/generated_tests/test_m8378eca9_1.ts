import { expect } from "chai";
import { ethers } from "hardhat";

describe("PRIVATE_ETH_CELL mutant detection test", function () {
  it("should detect mutant m8378eca9 by verifying exact balance after deposit and collect", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethert.getContractFactory("PRIVATE_ETH_CELL");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Setup: initialize the contract and set MinSum to 0
    await instance.SetMinSum(0);
    const logFactory = await ethers.getContractFactory("LogFile");
    const logInstance = await logFactory.deploy();
    await logInstance.waitForDeployment();
    await instance.SetLogFile(await logInstance.getAddress());
    await instance.Initialized();

    // Deposit exactly 100 wei
    const depositAmount = ethers.parseEther("0.0000000000000001"); // 100 wei
    const tx = await instance.connect(addr1).Deposit({ value: depositAmount });
    await tx.wait();

    // Collect exactly the deposited amount
    const collectTx = await instance.connect(addr1).Collect(depositAmount);
    await collectTx.wait();

    // Check that addr1's balance in the contract is zero
    const balance = await instance.balances(addr1.address);
    expect(balance).to.equal(0);

    // Also check that the contract's ETH balance is zero (all funds withdrawn)
    const contractBalance = await ethers.provider.getBalance(instance.getAddress());
    expect(contractBalance).to.equal(0);
  });
});