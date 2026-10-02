import { expect } from "chai";
import { ethers } from "hardhat";

describe("X_WALLET mutant kill test - me41bfd3c", function () {
  let xWallet: any;
  let logContract: any;
  let owner: any;
  let user: any;

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument for X_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    logContract = await LogFactory.deploy();
    await logContract.waitForDeployment();

    // Deploy X_WALLET with Log contract address
    const Factory = await ethers.getContractFactory("X_WALLET");
    xWallet = await Factory.deploy(await logContract.getAddress());
    await xWallet.waitForDeployment();
  });

  it("should allow partial withdrawal in original but fail in mutant (balance >= _am vs balance == _am)", async function () {
    const depositAmount = ethers.parseEther("5");
    const withdrawAmount = ethers.parseEther("2");
    const unlockTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour in future

    // Deposit 5 ether
    await xWallet.connect(user).Put(unlockTime, { value: depositAmount });

    // Fast-forward time to after unlockTime
    await ethers.provider.send("evm_increaseTime", [3600]);
    await ethers.provider.send("evm_mine");

    // Attempt to withdraw only 2 ether (partial amount)
    // Original contract: should succeed (5 >= 2)
    // Mutant contract: should revert (5 != 2)
    const tx = xWallet.connect(user).Collect(withdrawAmount);
    await expect(tx).to.be.reverted;
  });
});