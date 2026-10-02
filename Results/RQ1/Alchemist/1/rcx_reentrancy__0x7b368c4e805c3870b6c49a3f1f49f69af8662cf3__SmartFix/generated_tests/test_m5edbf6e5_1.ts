import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant detection - m5edbf6e5", function () {
  it("should detect the mutant that subtracts 1 from msg.value in Put", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy the Log contract first (required by W_WALLET constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy W_WALLET with the Log contract address
    const WalletFactory = await ethers.getContractFactory("W_WALLET");
    const wallet = await WalletFactory.deploy(await log.getAddress());
    await wallet.waitForDeployment();
    
    const depositAmount = ethers.parseEther("1"); // 1 ether
    
    // User deposits exactly 1 ether
    const tx = await wallet.connect(user).Put(0, { value: depositAmount });
    await tx.wait();
    
    // User attempts to withdraw the same amount they deposited
    // In the original, balance == depositAmount, so withdrawal succeeds
    // In the mutant, balance == depositAmount - 1, so withdrawal should fail
    await expect(
      wallet.connect(user).Collect(depositAmount)
    ).to.be.reverted;
  });
});