import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant m9a254e2a test", function () {
  it("should revert Collect when balance is less than MinSum on original but succeed on mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument for W_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    // Deploy W_WALLET with Log address
    const WalletFactory = await ethers.getContractFactory("W_WALLET");
    const walletInstance = await WalletFactory.deploy(await logInstance.getAddress());
    await walletInstance.waitForDeployment();

    // Fund addr1 with 0.5 ether (less than MinSum which is 1 ether)
    await owner.sendTransaction({
      to: await walletInstance.getAddress(),
      value: ethers.parseEther("0.5")
    });

    // Try to Collect 0.5 ether from addr1's perspective
    // In original contract this should revert (balance < MinSum)
    // In mutant this should succeed (condition replaced with true)
    await expect(
      walletInstance.connect(addr1).Collect(ethers.parseEther("0.5"))
    ).to.be.reverted;
  });
});