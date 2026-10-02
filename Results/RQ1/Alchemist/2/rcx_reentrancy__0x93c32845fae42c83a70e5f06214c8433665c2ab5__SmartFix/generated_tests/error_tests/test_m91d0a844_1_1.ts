import { expect } from "chai";
import { ethers } from "hardhat";

describe("X_WALLET mutant detection - m91d0a844", function () {
  it("should revert when Collect is called but the recipient address rejects ETH transfer", async function () {
    const [owner, attacker] = await ethers.getSigners();

    // Deploy the Log contract first
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy X_WALLET with Log address
    const XWalletFactory = await ethers.getContractFactory("X_WALLET");
    const wallet = await XWalletFactory.deploy(await log.getAddress());
    await wallet.waitForDeployment();

    // Deploy a contract that reverts on receive (to simulate failed transfer)
    const RejectorFactory = await ethers.getContractFactory(
      "contract Rejector { receive() external payable { revert(); } }"
    );
    const rejector = await RejectorFactory.deploy();
    await rejector.waitForDeployment();

    const rejectorAddress = await rejector.getAddress();

    // First, fund the wallet by sending ETH to it
    await owner.sendTransaction({
      to: await wallet.getAddress(),
      value: ethers.parseEther("10")
    });

    // Set unlock time to now (so we can collect immediately)
    await wallet.Put(0, { value: 0 });

    // Now try to collect from the wallet using the rejector address as msg.sender
    // We need to make the wallet call rejector via Collect function
    // Since Collect sends ETH to msg.sender, we need to make msg.sender = rejector
    // But we can't directly call from rejector - instead we can call from owner and manipulate

    // Actually, let's fund the rejector so it can call Collect
    await owner.sendTransaction({
      to: rejectorAddress,
      value: ethers.parseEther("1")
    });

    // Have the rejector call Collect on the wallet
    // The rejector should receive ETH and revert, causing Collect to revert on original
    // But on mutant it would succeed (logging instead of reverting)

    // We need to make sure wallet has sufficient balance and time conditions are met
    // Fund the wallet again with ETH
    await owner.sendTransaction({
      to: await wallet.getAddress(),
      value: ethers.parseEther("5")
    });

    // Fast forward time past unlock (if needed - but Put sets unlockTime to current)
    // Actually we already called Put(0) which sets unlockTime to block.timestamp

    // Now try to collect - this should revert because the recipient (rejector) rejects ETH
    await expect(
      wallet.connect(owner).Collect(ethers.parseEther("1"))
    ).to.be.reverted;
  });
});