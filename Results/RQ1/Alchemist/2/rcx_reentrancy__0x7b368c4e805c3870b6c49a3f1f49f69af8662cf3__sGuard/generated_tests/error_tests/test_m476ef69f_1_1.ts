import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant m476ef69f detection", function () {
  it("should detect the mutant by verifying time-lock enforcement", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy the Log contract first (required constructor argument for W_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy W_WALLET with the Log contract address
    const WalletFactory = await ethers.getContractFactory("W_WALLET");
    const wallet = await WalletFactory.deploy(await log.getAddress());
    await wallet.waitForDeployment();

    // Set a future unlock time (e.g., 1 hour from now)
    const futureUnlock = BigInt((await ethers.provider.getBlock("latest"))!.timestamp + 3600);
    const depositAmount = ethers.parseEther("2");

    // User deposits 2 ether with a future unlock time
    await wallet.connect(user).Put(futureUnlock, { value: depositAmount });

    // Attempt to collect immediately - should revert on original, pass on mutant
    await expect(
      wallet.connect(user).Collect(depositAmount)
    ).to.be.reverted;
  });
});