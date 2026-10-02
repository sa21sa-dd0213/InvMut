import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant kill test", function () {
  it("should kill mutant ma8fde182 by exploiting || operator change in Collect", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument for W_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy W_WALLET with Log address
    const WalletFactory = await ethers.getContractFactory("W_WALLET");
    const wallet = await WalletFactory.deploy(await log.getAddress());
    await wallet.waitForDeployment();

    // Get MinSum value (default is 1 ether)
    const minSum = await wallet.MinSum();

    // User deposits an amount less than MinSum (e.g., 0.5 ether)
    const depositAmount = ethers.parseEther("0.5");
    const txPut = await wallet.connect(user).Put(0, { value: depositAmount });
    await txPut.wait();

    // Verify user balance is less than MinSum
    const userBalance = (await wallet.Acc(user.getAddress())).balance;
    expect(userBalance).to.be.lessThan(minSum);

    // Wait for block.timestamp to pass unlockTime (unlockTime was set to block.timestamp by Put(0))
    await ethers.provider.send("evm_increaseTime", [2]); // advance by 2 seconds
    await ethers.provider.send("evm_mine", []);

    // Attempt to collect an amount equal to user's balance
    // In original: should revert because balance < MinSum (first condition fails with &&)
    // In mutant: should succeed because balance >= _am and time > unlockTime (second part of || passes)
    const collectAmount = depositAmount;

    // The original would revert here, but mutant would allow it
    // We expect this to succeed in the mutant (kill detection)
    const txCollect = await wallet.connect(user).Collect(collectAmount);
    await txCollect.wait();

    // Verify the collection actually happened (mutant allowed it despite low balance)
    const finalBalance = (await wallet.Acc(user.getAddress())).balance;
    expect(finalBalance).to.equal(0);
  });
});