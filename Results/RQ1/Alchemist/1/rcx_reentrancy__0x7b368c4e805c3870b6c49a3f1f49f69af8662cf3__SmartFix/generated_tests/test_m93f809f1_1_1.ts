import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant kill test", function () {
  it("should succeed on original but fail on mutant when collecting after unlock time with sufficient balance", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy the Log contract first (required constructor argument for W_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    // Deploy W_WALLET with the Log contract address
    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(await logInstance.getAddress());
    await instance.waitForDeployment();

    const MinSum = ethers.parseEther("1");
    const depositAmount = ethers.parseEther("2");
    const withdrawAmount = ethers.parseEther("1");

    // Deposit ether via Put function
    const putTx = await instance.connect(addr1).Put(0, { value: depositAmount });
    await putTx.wait();

    // Verify balance was updated
    const holder = await instance.Acc(addr1.address);
    expect(holder.balance).to.equal(depositAmount);

    // Advance time past unlockTime (which was set to block.timestamp since we passed 0)
    await ethers.provider.send("evm_increaseTime", [3600]); // 1 hour
    await ethers.provider.send("evm_mine", []);

    // Attempt to collect - should revert on mutant (condition replaced with false)
    await expect(
      instance.connect(addr1).Collect(withdrawAmount)
    ).to.be.reverted;
  });
});