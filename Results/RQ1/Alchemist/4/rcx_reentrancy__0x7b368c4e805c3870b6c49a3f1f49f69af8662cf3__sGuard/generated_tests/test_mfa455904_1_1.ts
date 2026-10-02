import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant kill test - mfa455904", function () {
  it("should fail to collect after unlock time when mutant uses < instead of >", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument for W_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const logContract = await LogFactory.deploy();
    await logContract.waitForDeployment();

    // Deploy W_WALLET with Log contract address
    const W_WALLETFactory = await ethers.getContractFactory("W_WALLET");
    const wallet = await W_WALLETFactory.deploy(await logContract.getAddress());
    await wallet.waitForDeployment();

    // Set a future unlock time (e.g., 1 hour from now)
    const currentTime = (await ethers.provider.getBlock("latest")).timestamp;
    const unlockTime = currentTime + 3600; // 1 hour in the future

    // Deposit 2 ether with the future unlock time
    const depositAmount = ethers.parseEther("2");
    await wallet.connect(addr1).Put(unlockTime, { value: depositAmount });

    // Verify balance was recorded
    const holderInfo = await wallet.Acc(addr1.address);
    expect(holderInfo.balance).to.equal(depositAmount);
    expect(holderInfo.unlockTime).to.equal(unlockTime);

    // Fast-forward time to after the unlock time
    await ethers.provider.send("evm_increaseTime", [3601]);
    await ethers.provider.send("evm_mine");

    // Verify current time is now after unlock time
    const newBlock = await ethers.provider.getBlock("latest");
    expect(newBlock.timestamp).to.be.greaterThan(unlockTime);

    // Attempt to collect 1 ether - should succeed in original, fail in mutant
    const collectAmount = ethers.parseEther("1");

    // In the original contract this would succeed, but in the mutant it reverts
    // because block.timestamp > unlockTime fails the < check
    await expect(
      wallet.connect(addr1).Collect(collectAmount)
    ).to.be.reverted;
  });
});