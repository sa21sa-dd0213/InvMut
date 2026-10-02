import { expect } from "chai";
import { ethers } from "hardhat";

describe("BANK_SAFE - kill mutant m2c91dcb1", function () {
  it("should revert when depositing 1 wei with max uint256 balance (original passes, mutant fails)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("BANK_SAFE");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First, initialize the contract (required to avoid revert from SetMinSum/SetLogFile)
    await instance.connect(owner).Initialized();

    // Set MinSum to 0 so Collect can be called later if needed (not required for this test)
    await instance.connect(owner).SetMinSum(0);

    // Deploy LogFile and set it
    const LogFileFactory = await ethers.getContractFactory("LogFile");
    const logFile = await LogFileFactory.deploy();
    await logFile.waitForDeployment();
    await instance.connect(owner).SetLogFile(await logFile.getAddress());

    // First, deposit a large amount to addr1 to increase balance
    const largeDeposit = ethers.parseEther("1000");
    await instance.connect(addr1).deposit({ value: largeDeposit });

    // Now, we need to manipulate addr1's balance to be type(uint256).max - 1
    // We can do this by making multiple deposits that sum to the target
    // Calculate how much more we need to reach max uint256 minus 1
    const currentBalance = await instance.balances(addr1.address);
    const maxUint256 = ethers.MaxUint256;
    const targetBalance = maxUint256 - 1n;

    if (currentBalance < targetBalance) {
      const remaining = targetBalance - currentBalance;
      await instance.connect(addr1).deposit({ value: remaining });
    }

    // Verify balance is now maxUint256 - 1
    const finalBalance = await instance.balances(addr1.address);
    expect(finalBalance).to.equal(maxUint256 - 1n);

    // Now attempt to deposit 1 wei - this should revert in original but pass in mutant
    await expect(
      instance.connect(addr1).deposit({ value: 1n })
    ).to.be.reverted;
  });
});