import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant detection - m70366a19", function () {
  it("should detect mutant by testing withdrawal with exact balance equal to amount", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    // Deploy W_WALLET with Log address as constructor argument
    const WalletFactory = await ethers.getContractFactory("W_WALLET");
    const wallet = await WalletFactory.deploy(await logInstance.getAddress());
    await wallet.waitForDeployment();

    const depositAmount = ethers.parseEther("1");
    const unlockTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

    // Deposit exactly 1 ether (MinSum = 1 ether)
    await wallet.connect(user).Put(unlockTime, { value: depositAmount });

    // Fast forward time past unlockTime
    await ethers.provider.send("evm_increaseTime", [3601]);
    await ethers.provider.send("evm_mine", []);

    // Attempt to collect exactly the deposited amount (balance == _am)
    // Original contract: should succeed (balance >= _am)
    // Mutant contract: should fail (balance > _am is false when equal)
    const tx = wallet.connect(user).Collect(depositAmount);

    // The mutant should revert because balance equals _am, not strictly greater
    await expect(tx).to.be.reverted;
  });
});