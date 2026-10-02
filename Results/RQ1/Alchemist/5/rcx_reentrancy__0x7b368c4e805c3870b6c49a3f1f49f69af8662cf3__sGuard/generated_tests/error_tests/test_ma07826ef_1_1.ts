import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant ma07826ef test", function () {
  it("should kill the mutant by detecting block.prevrandao misuse in Put function", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument for W_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    // Deploy W_WALLET with Log contract address
    const WalletFactory = await ethers.getContractFactory("W_WALLET");
    const wallet = await WalletFactory.deploy(await logInstance.getAddress());
    await wallet.waitForDeployment();

    // Set up: addr1 puts funds with _unlockTime = 0 (less than current block.timestamp)
    // In original: unlockTime becomes block.timestamp (current time)
    // In mutant: unlockTime becomes block.prevrandao (which could be in the past)
    const putTx = await wallet.connect(addr1).Put(0, { value: ethers.parseEther("2") });
    await putTx.wait();

    // Try to collect immediately - should fail in original because unlockTime = block.timestamp
    // But might succeed in mutant if block.prevrandao < block.timestamp
    await expect(
      wallet.connect(addr1).Collect(ethers.parseEther("1"))
    ).to.be.reverted;

    // Additional verification: collect should also fail with exact balance
    await expect(
      wallet.connect(addr1).Collect(ethers.parseEther("2"))
    ).to.be.reverted;
  });
});