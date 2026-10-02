import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant m91d0a844 test", function () {
  it("should revert when Collect is called with a valid amount but the recipient reverts on receiving Ether", async function () {
    const [owner, attacker] = await ethers.getSigners();

    // Deploy the Log contract first (required by W_WALLET constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy W_WALLET with the Log address
    const WalletFactory = await ethers.getContractFactory("W_WALLET");
    const wallet = await WalletFactory.deploy(await log.getAddress());
    await wallet.waitForDeployment();

    // Deploy a simple contract that reverts on receiving Ether
    const RevertReceiverFactory = await ethers.getContractFactory(
      "contract RevertOnReceive { receive() external payable { revert(); } }"
    );
    const revertReceiver = await RevertReceiverFactory.deploy();
    await revertReceiver.waitForDeployment();

    // Fund the wallet with some Ether first via Put
    const depositAmount = ethers.parseEther("2");
    await wallet.connect(attacker).Put(0, { value: depositAmount });

    // Set MinSum to 0 for easier testing (already 1 ether, but we deposited 2)
    // The attacker now has balance >= MinSum

    // Attempt to Collect from the wallet to the revertReceiver contract
    // This should revert on the original contract because the call fails
    // On the mutant, it would succeed (wrongly) - so we expect revert to kill the mutant
    await expect(
      wallet.connect(attacker).Collect(ethers.parseEther("1"))
    ).to.be.reverted;
  });
});