import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant m89d0160d detection", function () {
  it("should detect mutant by verifying balance update and log after successful Collect", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument for W_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const logContract = await LogFactory.deploy();
    await logContract.waitForDeployment();

    // Deploy W_WALLET with Log address
    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(await logContract.getAddress());
    await instance.waitForDeployment();

    // Fund the contract via Put from addr1
    const depositAmount = ethers.parseEther("2");
    const unlockTime = Math.floor(Date.now() / 1000) + 1000; // future unlock
    await instance.connect(addr1).Put(unlockTime, { value: depositAmount });

    // Verify initial balance
    let holder = await instance.Acc(addr1.address);
    expect(holder.balance).to.equal(depositAmount);

    // Fast-forward time past unlock
    await ethers.provider.send("evm_increaseTime", [1001]);
    await ethers.provider.send("evm_mine");

    // Attempt Collect with valid amount
    const collectAmount = ethers.parseEther("1");
    const tx = await instance.connect(addr1).Collect(collectAmount);
    await tx.wait();

    // Check balance - in original it should decrease, in mutant it stays same
    holder = await instance.Acc(addr1.address);

    // If mutant is present, balance will NOT decrease (remains depositAmount)
    // This assertion will fail on mutant, killing it
    expect(holder.balance).to.equal(depositAmount - collectAmount);

    // Also verify the Log entry was created (check History length)
    const historyLength = await logContract.History.length;
    expect(historyLength).to.equal(2); // 1 from Put, 1 from Collect
  });
});