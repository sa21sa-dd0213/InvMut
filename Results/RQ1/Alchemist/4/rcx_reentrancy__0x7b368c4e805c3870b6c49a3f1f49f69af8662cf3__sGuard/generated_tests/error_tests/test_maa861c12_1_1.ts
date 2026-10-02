import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant maa861c12 test", function () {
  it("should detect mutant that changed >= to > for MinSum check", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy Log contract first (required by W_WALLET constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy W_WALLET with Log address
    const WalletFactory = await ethers.getContractFactory("W_WALLET");
    const wallet = await WalletFactory.deploy(await log.getAddress());
    await wallet.waitForDeployment();

    // Get the MinSum value (1 ether)
    const minSum = await wallet.MinSum();

    // Send exactly MinSum to the wallet via Put (using fallback or Put directly)
    // This sets user's balance to exactly MinSum
    await user.sendTransaction({
      to: await wallet.getAddress(),
      value: minSum
    });

    // Verify balance is exactly MinSum
    const holder = await wallet.Acc(user.address);
    expect(holder.balance).to.equal(minSum);

    // Set unlock time to past to allow collection
    // The Put function sets unlockTime to max(_unlockTime, block.timestamp)
    // Since we used fallback (Put(0)), unlockTime = block.timestamp
    // We need to wait for next block to have block.timestamp > unlockTime
    await ethers.provider.send("evm_mine", []);

    // Now try to collect exactly MinSum - this should succeed on original but fail on mutant
    await expect(
      wallet.connect(user).Collect(minSum)
    ).to.be.reverted;
  });
});